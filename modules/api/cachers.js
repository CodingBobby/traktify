const {
   debugLog
} = require('./../helper.js')


module.exports = {
   cacheRequest,
   cacheSave,
   flushCache
}

const Cache = require('./../cache.js')


/**
 * Returns the data saved in the cache as the given key and requests it if nothing was saved. The data will be temporarily stored to make processing request arrays easier. To permanently save the results to the cache, use cacheSave().
 * @param {String} cacheName Name of the cache data will be saved to
 * @param {String} cacheKey Key under which the data is acessed
 * @param {Promise} request API request which gets the data in case it wasn't cached before
 * @param {Boolean} saveRightAfter Save the data to cache after requesting it
 */
function cacheRequest(cacheName, cacheKey, request, saveRightAfter) {
   debugLog('cache', `requesting ${cacheKey} from ${cacheName}`)
   let cache = new Cache(cacheName)
   let cacheContent = cache.getKey(cacheKey)

   if(cacheContent === undefined) {
      return request().then(result => {
         debugLog('cache', `caching ${cacheKey}`)

         ipcRenderer.send('cache', {
            action: 'addKey',
            name: cacheName,
            key: cacheKey,
            data: result
         })

         if(saveRightAfter) {
            cacheSave(cacheName)
         }

         return result
      })
   } else {
      // In this case, everything that was cached is uptodate
      debugLog('cache', `restoring ${cacheKey}`)
      // Returning a resolved Promise, so it will have the same type as the case above. That way it can be used with a .then() later in the caller without needing to know if the result comes from cache or an API request.
      return Promise.resolve(cacheContent)
   }
}

function cacheSave(cacheName) {
   ipcRenderer.send('cache', {
      action: 'saveKeys',
      name: cacheName
   })
}

function flushCache(cacheName, cacheId) {
   let cache = new Cache(cacheName)
   cache.removeKey(cacheId)
   cache.save()
}
