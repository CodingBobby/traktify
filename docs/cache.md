# Cache

## Workflow
The standard procedure of getting API data. Before starting time intensive API requests, we check if the cache already holds what we want.

```js
const cacheName = new Cache('cacheName')

function getApiData() {
   let cacheContent = cacheName.getKey('apiData')

   if(cacheContent === undefined) {
      return requestApiData().then(apiData => {
         debugLog('caching', 'apiData')
         let cachingTime = Date.now()

         cacheName.setKey('apiData', apiData)
         cacheName.save()
         
         debugLog('caching time', Date.now()-cachingTime)
         return apiData
      })
   } else {
      debugLog('cache available', 'apiData')
      return cacheContent
   }
}
```
