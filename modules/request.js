let searchQueryCache = new Cache('searchQuery')

module.exports.searchRequestHelper = function(text) {
   let cacheContent = searchQueryCache.getKey(text)
   if(cacheContent !== undefined) {
     debugLog('cache content', cacheContent)
     return Promise.resolve(cacheContent)
   }
 
   let query = formatSearch(text)
   if(!query) return null
 
   return trakt.search.text({
     type: query.type,
     query: query.filtered,
     extended: 'full'
   })
   // got search results from trakt
   .then(searchResults => {
     debugLog('api request', 'trakt')
     debugLog('search results', searchResults.map(r => r[r.type].ids.trakt))
 
     return new Promise((resolve, reject) => {
       let fanartQueue = []
 
       searchResults.forEach(result => {
         let mv = result.type == 'movie' ? 'm' : 'v'
 
         fanartQueue.push(fanart[result.type + 's']
           .get(result[result.type].ids['t' + mv + 'db'])
           // got data from fanart
           .then(fanResult => {
             debugLog('api request', 'fanart')
             return fanResult
           }).catch(err => debugLog('error', 'fanart', new Error().stack))
         )
       })
 
       resolve([searchResults, fanartQueue])
     })
     // search queue filled with promises
     .then(([trakt, fanart]) => {
       debugLog('queue', 'starting')
 
       return Promise.all(fanart.map(p => p.catch(e => e)))
       .then(resolvedQueue => {
         let requestArray = []
 
         resolvedQueue.forEach((item, index) => {
           requestArray.push({
             trakt: trakt[index],
             fanart: item
           })
         })
 
         let data = {
           date: Date.now(),
           result: requestArray
         }
 
         searchQueryCache.setKey(text, data)
         searchQueryCache.save()
 
         debugLog('cached', text, data)
         return data
       })
       .catch(err => {
         debugLog('error', 'promise', new Error().stack)
       })
     })
   }).catch(err => {
     debugLog('error', 'trakt', new Error().stack)
   })
 }
 
 function formatSearch(text) {
   let searchOptions = [
     'show', 'shows', 'tv', 'movie', 'person', 'episode', 'ep', 's', 'm', 'p', 'e'
   ].map(o => o + ':')
 
   let query = startsWithFilter(text, searchOptions, ':')
 
   // This converts the simplified search type into a request-friendly one
   switch(query.found) {
     case 's':
     case 'show':
     case 'shows':
     case 'tv': {
       query.type = 'show'
       break
     }
     case 'm':
     case 'movie': {
       query.type = 'movie'
       break
     }
     case 'e':
     case 'ep':
     case 'episode': {
       query.type = 'episode'
       break
     }
     case 'p':
     case 'person': {
       query.type = 'person'
       break
     }
     default: {
       break
     }
   }
 
   debugLog('query', query)
   return query
 }
 
 function startsWithFilter(string, options, removeFromFilter) {
   string = string.toString()
   for(let opt in options) {
     if(string.startsWith(options[opt])) {
       return {
         found: options[opt].split(removeFromFilter || '').join(''),
         filtered: string.split(options[opt])[1]
       }
     }
   }
   return {
     found: null,
     filtered: string
   }
 }
