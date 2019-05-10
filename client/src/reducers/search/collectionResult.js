import Immutable from 'seamless-immutable'
import {
  COLLECTION_NEW_SEARCH_REQUESTED,
  COLLECTION_MORE_RESULTS_REQUESTED,
  COLLECTION_SEARCH_COMPLETE,
  COLLECTION_SEARCH_ERROR,
} from '../../actions/search/CollectionRequestActions'
// import {
//   COLLECTION_CLEAR_RESULTS,
// } from '../../actions/search/CollectionResultActions'

export const initialState = Immutable({
  collections: {},
  facets: {},
  totalCollections: 0,
  loadedCollections: 0, // TODO rename to loadedCount or numberLoaded or something?
  collectionsPageOffset: 0, // TODO This would make more logical sense on request, probably...
  totalGranules: 0, // TODO when is this still used??
  pageSize: 20, // TODO when is this changed? make sure granule page size can be changed, if needed?
})

const collectionResults = (state, collections, action) => {
  // TODO rename this, it's vague
  return Immutable.merge(state, {
    loadedCollections: (collections && Object.keys(collections).length) || 0,
    collections: collections,
    totalCollections: action.total,
    facets: action.metadata ? action.metadata.facets : initialState.facets,
  })
}

export const collectionResult = (state = initialState, action) => {
  switch (action.type) {
    // case COLLECTION_CLEAR_RESULTS: // TODO full reset, facets and all? if not why not?
    //   return Immutable.merge(state, {
    //     collections: initialState.collections,
    //     totalCollections: initialState.totalCollections,
    //     loadedCollections: initialState.loadedCollections,
    //     collectionsPageOffset: initialState.collectionsPageOffset,
    //   })

    // Result Effects from 'CollectionRequestActions'
    case COLLECTION_SEARCH_COMPLETE:
      let newCollections = {}
      action.items.forEach((val, key) => {
        newCollections[key] = val
      })
      if (action.clearPreviousResults) {
        return collectionResults(state, newCollections, action)
      }

      let allCollections = state.collections.merge(newCollections)

      return collectionResults(state, allCollections, action)

    case COLLECTION_SEARCH_ERROR:
      return Immutable.merge(state, {
        loadedCollections: initialState.loadedCollections,
        collections: initialState.collections,
        totalCollections: initialState.totalCollections,
        facets: initialState.facets,
      })

    case COLLECTION_NEW_SEARCH_REQUESTED:
      return Immutable.set(
        state,
        'collectionsPageOffset',
        initialState.collectionsPageOffset
      )

    case COLLECTION_MORE_RESULTS_REQUESTED:
      return Immutable.set(
        state,
        'collectionsPageOffset',
        state.collectionsPageOffset + state.pageSize
      )

    default:
      return state
  }
}

export default collectionResult
