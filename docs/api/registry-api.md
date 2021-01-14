<div align="center"><a href="/onestop/api">OneStop API</a></div>
<hr>

**Estimated Reading Time: 20 minutes**

## Registry Overview

## Table of Contents
* [Endpoint](#endpoint)
* [Creating And Replacing Documents](#creating-and-replacing-documents)
* [Retrieving Documents](#retrieving-documents)
* [Updating Existing Documents](#updating-existing-documents)
* [Deleting Documents](#deleting-documents)
* [Resurrecting Deleted Documents](#resurrecting-deleted-documents)
* [Additional Information](../developer/additional-developer-info#upload-test-metadata)

The registry provides a horizontally-scalable API and storage for granule and collection-level metadata backed by Kafka. 

It publishes metadata updates to Kafka, then uses a Kafka Streams app to aggregate those raw metadata events, merging them with previous events to provide a full picture of the metadata for each granule and collection. 

### Endpoint
Interactions with the Registry API are centered around the endpoint: 

* Old way:
`{context-path}/metadata/{type}/{source}/{id}`

* New way:
`{context-path}/api/registry/{type}/{source}/{id}`

    Example: [https://cedardevs.org/onestop/api/registry/metadata/collection/00000000-0000-0000-0000-000000000000](https://cedardevs.org/onestop/api/registry/metadata/collection/00000000-0000-0000-0000-000000000000)

Where:
* `context-path` is [explicitly set](/onestop/operator/deployment/v2/psi/project-artifacts#config) at time of deployment (otherwise `localhost:8080`)
* `type` one of the enum values for the [RecordType](https://github.com/cedardevs/schemas/blob/master/schemas-core/src/main/resources/avro/psi/recordType.avsc) object: 
  * `collection` 
  * `granule`
* `source` is one of the following:
  * For `collection` types: `comet` or `unknown` (default)
  * For `granule` types: `common-ingest`, `class`, or `unknown`
* `id` a UUID value that was either auto-generated or manually created.

This API abides by [JSON API specifications](https://jsonapi.org/format/).

**NOTE:** In addition to these user docs about the API, there is also an [OpenAPI specification](https://github.com/OAI/OpenAPI-Specification)
describing the details of all available endpoints. The specification is hosted by the API itself, at `{context-path}/openapi.yaml`.

### Creating And Replacing Documents
Create and replace documents using `PUT` and `POST` requests via the [endpoint](#endpoint) specified above. 
* The `type` must be specified
* Omitting the source will result in the `source` being set to `unknown`
* Omitting the `id` will cause Registry to generate and use a UUID value as the id.

Successful operations will return a response body with the format:
```json
{
  "id"  : "<idValue>",
  "type": "<typeValue>"
}
```

Unsuccessful operations will return a response body with the format:
```json
{
  "errors": []
}
```

### Retrieving Documents
Retrieve stored documents using `GET` and `HEAD` requests via the [endpoint](#endpoint) specified above. Requests sent will return the original input metadata in [the Input format](https://github.com/cedardevs/schemas/blob/master/src/main/resources/avro/psi/input.avsc). Requests sent to `{baseURL}/parsed` will return in the [ParsedRecord format](https://github.com/cedardevs/schemas/blob/master/src/main/resources/avro/psi/parsedRecord.avsc). The returned object is located in the `data.attributes` key of the returned JSON.
* The `type` must be specified
* Omitting the source will result in the source being set to `unknown`
* The `id` must be specified

Found documents will return a response body with the format:
```json
{
  "links" : {
    "input"     : "<inputUrlValue>",
    "parsed"    : "<parsedUrlValue>",
    "self"      : "<selfReferencingUrlValue>"
  },
  "data" : {
    "id"        : "<idValue>",
    "type"      : "<typeValue>",
    "attributes": "<resultObject>"
  }
}
```
**NOTE**: The `links` object will contain either the `input` or `parsed` URL, but not both. The `self` URL will refer to the endpoint at which the request was received, and that URL is the one that will not be present.

If the document isn't found and doesn't exist, a response body will be returned with the format:
```json
{
  "links" : {
    "input"   : "<inputUrlValue>",
    "parsed"  : "<parsedUrlValue>",
    "self"    : "<selfReferencingUrlValue>"
  },
  "errors": [
    {
      "status": 404,
      "title" : "NOT_FOUND",
      "detail": "No input exists for <typeValue> with id [<idValue>] from source [<sourceValue>]"
    }
  ]
}
```
**NOTE**: If the request is received at the `{baseURL}/parsed` endpoint, the `links` object will contain both `self` and `input` URLs, under the assumption the parsed record may not yet be available. However, a request received at the `{baseURL}` endpoint will only contain the `self` value.

If the document isn't found but the `id` references a [deleted document](#deleting-documents), the following response body will be returned:
```json
{
  "links" : {
    "resurrection": "<resurrectionUrlValue>",
    "self"        : "<selfReferencingUrlValue>"
  },
  "errors": [
    {
      "status"    : 404,
      "title"     : "NOT_FOUND",
      "detail"    : "DELETE processed for <typeValue> with id [<idValue>] from source [<sourceValue>]"
    }
  ]
}
```

### Updating Existing Documents
If the original input metadata format is JSON, `PATCH` requests  via the [endpoint](#endpoint) specified above can be used to modify or add subsections to a record. Currently, `PATCH` requests will fully replace an existing key-value pair or add a new one to the final merged document. JSON lists and objects sent in a `PATCH` request should therefore be the desired _complete_ element. 

XML `PATCH` requests are not supported. 

* The `type` must be specified
* Omitting the source will result in the source being set to `unknown`
* The `id` must be specified

Successful operations will return a response body with the format:
```json
{
  "id"  : "<idValue>",
  "type": "<typeValue>"
}
```

Unsuccessful operations will return a response body with the format:
```json
{
  "errors": []
}
```

### Deleting Documents
Removing a document is possible with a `DELETE` request via the [endpoint](#endpoint) specified above. This will "tombstone" the record in all downstream topics, which deletes it from any sinks connected to PSI (e.g. OneStop). Since Registry is modeled on the Kappa Architecture paradigm (see our [architectural background page](/onestop/api/architectural-overview) for some more info), the event(s) concerning any given record prior to a `DELETE` are still kept and so it is possible to "undo" a `DELETE` with a [resurrection request](#resurrecting-deleted-documents). But...

**WARNING**: Deleting a record via an intentionally empty request body (i.e. `""`) on a `PUT` or `POST` is a non-guaranteed and unclean way to purge a metadata record from downstream sinks that cannot be undone through the Registry API. _Don't do it!_

* The `type` must be specified
* Omitting the source will result in the source being set to `unknown`
* The `id` must be specified

Successful operations will return a response body with the format:
```json
{
  "id"  : "<idValue>",
  "type": "<typeValue>"
}
```

Unsuccessful operations will return a response body with the format:
```json
{
  "errors": []
}
```

### Resurrecting Deleted Documents
A document that has been `DELETE`d can be resurrected with a `GET` request to `{baseUrl}/resurrection`. 

* The `type` must be specified
* Omitting the source will result in the source being set to `unknown`
* The `id` must be specified

Successful operations will return a response body with the format:
```json
{
  "id"  : "<idValue>",
  "type": "<typeValue>"
}
```

Unsuccessful operations will return a response body with the format:
```json
{
  "errors": []
}
```

**NOTE**: This functionality is ONLY available if a record was removed via a `DELETE` request. 

<hr>
<div align="center"><a href="#">Top of Page</a></div>