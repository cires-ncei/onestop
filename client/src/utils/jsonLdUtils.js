import _ from 'lodash'
import moment from 'moment/moment'

export const toJsonLd = item => {
  const parts = [
    `"@context": "http://schema.org",
    "@type": "Dataset"`,
    nameField(item),
    descriptionField(item),
    identifierField(item),
    imageField(item),
    temporalCoverageField(item),
    spatialCoverageField(item),
    distributionField(item),
  ]

  // remove nulls and join
  return `{
    ${_.join(_.compact(parts), ',\n')}
  }`
}

export const nameField = item => {
  if(item.title)
  return `"name": "${item.title}"`
}

export const descriptionField = item => {
  if(item.description)
  return `"description": "${item.description}"`
}

export const fileIdentifierListItem = item => {
  if(item.fileIdentifier)
  return `{
    "value" : "${item.fileIdentifier}",
    "propertyID" : "NCEI Dataset Identifier",
    "@type" : "PropertyValue"
  }`
}

export const identifierField = item => {
  // TODO should I include the uuid ?
  const parts = [
    fileIdentifierListItem(item),
    doiListItem(item),
  ]

  if( _.compact(parts).length > 0)
  // remove nulls and join
  return `"identifier" : [
    ${_.join(_.compact(parts), ',\n')}
  ]`
}

export const doiListItem = item => {
  if (item.doi)
  return `{
    "value" : "${item.doi}",
    "propertyID" : "Digital Object Identifier (DOI)",
    "@type" : "PropertyValue"
  }`
}

export const imageField = item => {
  if (item.thumbnail)
  return `"image": {
    "@type": "ImageObject",
    "url" : "${item.thumbnail}",
    "contentUrl" : "${item.thumbnail}"
  }`
}

export const temporalCoverageField = item => {
  if (item.beginDate && item.endDate) {
    if (item.beginDate == item.endDate) {
      return `"temporalCoverage": "${item.beginDate}"`
    } else {
      return `"temporalCoverage": "${item.beginDate}/${item.endDate}"`
    }
  }
  if (item.beginDate)
  return `"temporalCoverage": "${item.beginDate}/.."`
  if (item.endDate)
  return `"temporalCoverage": "../${item.endDate}"`
}

export const spatialCoverageField = item => {
  const parts = _.concat([],
    [geoListItem(item)],
    placenameList(item)
  )

  if( _.compact(parts).length > 0)
     // remove nulls and join
  return `"spatialCoverage": [
    ${_.join(_.compact(parts), ',\n')}
  ]`
}

export const spatialKeywordsSubset = item => {
  return _.intersection(item.keywords, item.gcmdLocations)
}

export const placenameListItem = location => {
  return `{
    "@type": "Place",
    "name": "${location}"
  }`
}

export const placenameList = item => {
  // gcmdLocations has extra entries for each layer in the keywords, but the intersection with the original keywords correctly identifies the correct subset
  return _.map(spatialKeywordsSubset(item), placenameListItem)
}

export const geoListItem = item => {
  const geometry = item.spatialBounding
  // For point, want GeoCoordnates: longitude:[0], latitude:[1]
  // The geographic shape of a place. A GeoShape can be described using several properties whose values are based on latitude/longitude pairs. Either whitespace or commas can be used to separate latitude and longitude; whitespace should be used when writing a list of several such points.
  // For line, want GeoShape: line: y,x y,x
  // A line is a point-to-point path consisting of two or more points. A line is expressed as a series of two or more point objects separated by space.
  // For polygon want GeoShape:  box: minY,minX maxY,maxX ([0] [2])
  // A box is the area enclosed by the rectangle formed by two points. The first point is the lower corner, the second point is the upper corner. A box is expressed as two points separated by a space character.
  if (geometry) {
    if (geometry.type.toLowerCase() === 'point') {
      return `{
      "@type": "Place",
      "name": "geographic bounding point",
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": "${geometry.coordinates[0][1]}",
        "longitude": "${geometry.coordinates[0][0]}"
      }
    }`
    }
    else if (geometry.type.toLowerCase() === 'linestring') {
      return `{
      "@type": "Place",
      "name": "geographic bounding line",
      "geo": {
        "@type": "GeoShape",
        "description": "y,x y,x",
        "line": "${geometry.coordinates[0][1]},${geometry.coordinates[0][0]} ${geometry.coordinates[1][1]},${geometry.coordinates[1][0]}"
      }
    }`
    }
    else {
      return `{
      "@type": "Place",
      "name": "geographic bounding box",
      "geo": {
        "@type": "GeoShape",
        "description": "minY,minX maxY,maxX",
        "box": "${geometry.coordinates[0][0][1]},${geometry.coordinates[0][0][0]} ${geometry.coordinates[0][2][1]},${geometry.coordinates[0][2][0]}"
      }
    }`
    }
  }
  else {
    // return 'No spatial bounding provided.'
  }
}

export const distributionField = item => {
  if (!item.links) return null
  const downloadLinks = item.links.filter(
    link => link.linkFunction === 'download'
  )
  if(downloadLinks.length > 0)
  return `"distribution": [
    ${_.join(_.map(downloadLinks, downloadLinkList), ',\n')}
  ]`
}

export const downloadLinkList = link => {
  const {linkUrl, linkName, linkProtocol, linkDescription} = link

  const parts = [
    `"@type": "DataDownload"`,
    linkUrl? `"url": "${linkUrl}"` : null,
    linkDescription? `"description": "${linkDescription}"` : null,
    linkName? `"name": "${linkName}"` : null,
    linkProtocol? `"encodingFormat": "${linkProtocol}"` : null,
  ]

  // remove nulls and join
  return `{
    ${_.join(_.compact(parts), ',\n')}
  }`
}
