package org.cedar.psi.manager.stream

import groovy.util.logging.Slf4j
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.common.serialization.Serdes
import org.apache.kafka.streams.KafkaStreams
import org.apache.kafka.streams.StreamsBuilder
import org.apache.kafka.streams.StreamsConfig
import org.apache.kafka.streams.Topology
import org.apache.kafka.streams.kstream.KStream
import org.apache.kafka.streams.kstream.Predicate
import org.apache.kafka.streams.kstream.Produced
import org.apache.kafka.streams.kstream.ValueMapper
import org.cedar.psi.manager.config.Constants
import org.cedar.psi.common.constants.Topics
import org.cedar.psi.common.serde.JsonSerdes


@Slf4j
class StreamManager {

  static KafkaStreams buildStreamsApp(String bootstrapServers) {
    def topology = buildTopology()
    def streamsConfig = streamsConfig(Constants.APP_ID, bootstrapServers)
    return new KafkaStreams(topology, streamsConfig)
  }

  static Topology buildTopology() {
    def builder = new StreamsBuilder()

    // Send messages directly to parser or to topic for SME functions to process
    Predicate<String, Map> toSMETopic = { String key, Map value ->
      return isForSME(value, Constants.SPLIT_FIELD, Constants.SPLIT_VALUES)
    }

    Predicate<String, Map> toParsing = { String key, Map value ->
      return !isForSME(value, Constants.SPLIT_FIELD, Constants.SPLIT_VALUES)
    }

    //stream incoming granule and collection messages
    KStream<String, Map> granuleInputStream = builder.stream(Topics.RAW_GRANULE_CHANGELOG_TOPIC)
    KStream<String, Map> collectionInputStream = builder.stream(Topics.RAW_COLLECTION_CHANGELOG_TOPIC)

    // Split granules to those that need SME processing and those ready to parse
    KStream<String, Map>[] smeBranches = granuleInputStream.branch(toParsing, toSMETopic)
    KStream toParsingFunction = smeBranches[0]
    KStream toSmeFunction = smeBranches[1]

    // To SME functions:
    toSmeFunction.mapValues({ v -> v.content } as ValueMapper<Map, Map>).to(Topics.SME_GRANULE_TOPIC, Produced.with(Serdes.String(), Serdes.String()))
    // Merge straight-to-parsing stream with topic SME granules write to:
    KStream<String, Map> unparsedGranules = builder.stream(Topics.UNPARSED_GRANULE_TOPIC)
    KStream<String, Map> parsedNotAnalyzedGranules = toParsingFunction.merge(unparsedGranules)
        .mapValues({ v -> MetadataParsingService.parseToInternalFormat(v) } as ValueMapper<Map, Map>)

    // Branch again, sending errors to separate topic
    KStream<String, Map>[] parsedStreams = parsedNotAnalyzedGranules.branch(isValid, isNotValid)
    KStream goodParsedStream = parsedStreams[0]
    KStream badParsedStream = parsedStreams[1]
    //send the bad stream off to the error topic
    badParsedStream.to(Topics.ERROR_HANDLER_TOPIC)
    // TODO Create intermediary topic between parsing & analysis for KafkaStreams tasking
    //      parallelization, or at least compare with and without topic in load testing?

    // Send valid messages to analysis & send final output to topic
    goodParsedStream
        .mapValues({ v -> AnalysisAndValidationService.analyzeParsedMetadata(v)} as ValueMapper<Map, Map>)
        .to(Topics.PARSED_GRANULE_TOPIC)

    // parsing collection:
    KStream<String, Map> parsedNotAnalyzedCollection = collectionInputStream
        .mapValues({ v -> MetadataParsingService.parseToInternalFormat(v)} as ValueMapper<Map, Map>)

    // Branch again, sending errors to separate topic
    KStream<String, Map>[] parsedCollection = parsedNotAnalyzedCollection.branch(isValid, isNotValid)
    KStream goodParsedCollection = parsedCollection[0]
    KStream badParsedCollection = parsedCollection[1]
    //send the bad stream off to the error topic
    badParsedCollection.to(Topics.ERROR_HANDLER_TOPIC)
    // TODO Create intermediary topic between parsing & analysis for KafkaStreams tasking
    //      parallelization, or at least compare with and without topic in load testing?

    // Send valid messages to analysis & send final output to topic
    goodParsedCollection
        .mapValues({ v -> AnalysisAndValidationService.analyzeParsedMetadata(v)} as ValueMapper<Map, Map>)
        .to(Topics.PARSED_COLLECTION_TOPIC)

    return builder.build()
  }

  static boolean isForSME(Map value, String splitField, List<String> splitValues) {
    return splitValues.contains(value[splitField])
  }

  static Predicate<String, Map> isValid = { String k, Map v -> !v.containsKey('error') }
  static Predicate<String, Map> isNotValid = { String k, Map v -> v.containsKey('error') }

  static Properties streamsConfig(String appId, String bootstrapServers) {
    log.info "Building kafka streams appConfig for $appId"
    Properties streamsConfiguration = new Properties()
    streamsConfiguration.put(StreamsConfig.APPLICATION_ID_CONFIG, appId)
    streamsConfiguration.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers)
    streamsConfiguration.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.String().class.name)
    streamsConfiguration.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, JsonSerdes.Map().class.name)
    streamsConfiguration.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 500)
    streamsConfiguration.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")
    return streamsConfiguration
  }
}
