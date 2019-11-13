let fanart = remote.getGlobal('fanart')
let config = remote.getGlobal('config')

module.exports = {
   newActivitiesAvailable: newActivitiesAvailable,
   searchRequestHelper: searchRequestHelper,
   getUserStats: getUserStats,
   getSeasonPoster: getSeasonPoster,
   getUnfinishedProgressList: getUnfinishedProgressList
}


//:::: SYNCING ::::\\
let syncingCache = new Cache('syncing')

// returns an array of activity keys that have unseen activity
async function newActivitiesAvailable() {
   syncingCache.remove()
   syncingCache.save()

   let latest = await getLatestActivities()
   debugLog('request finished', latest.all)
   let cacheContent = syncingCache.getKey('latestActivities')

   if(cacheContent !== undefined) {
      debugLog('cache content', cacheContent.all)
      if(latest.all === cacheContent.all) {
         debugLog('latest activities', 'nothing new')
         return []
      } else {
         let updates = []
         for(let scope in cacheContent) {
            if(scope !== 'all') {
               for(let action in cacheContent[scope]) {
                  let dateOld = cacheContent[scope][action]
                  let dateNew = latest[scope][action]
                  if(dateNew !== dateOld) {
                     updates.push(scope)
                     debugLog('latest activities', action+' @ '+scope)
                  }
               }
            }
         }
         syncingCache.setKey('latestActivities', latest)
         syncingCache.save()

         return updates
      }
   } else {
      debugLog('latest activities', 'all are unseen')
      // save latest activities if its the first time caching it
      syncingCache.setKey('latestActivities', latest)
      syncingCache.save()

      return [ 'movies', 'episodes', 'shows', 'seasons', 'comments', 'lists' ]
   }
}

function getLatestActivities() {
   debugLog('api request', 'latest trakt activites')
   return trakt.sync.last_activities().then(res => res)
}


//:::: IMAGE REQUESTING ::::\\
let imageCache = new Cache('images')

async function getSeasonPoster(showId, season) {
   let cacheKey = showId+'_'+season
   let cacheContent = imageCache.getKey(cacheKey)

   if(cacheContent === undefined) {
      let data = await requestSeasonPoster(showId, season)
      debugLog('caching', cacheKey)

      ipcRenderer.send('cache', {
         action: 'addKey',
         name: 'images',
         key: cacheKey,
         data: data
      })

      ipcRenderer.send('cache', {
         action: 'saveKeys', 
         name: 'images'
      })

      return data
   } else {
      debugLog('cache available', cacheKey)
      return cacheContent
   }
}

function requestSeasonPoster(showId, season) {
   return fanart.shows.get(showId).then(async result => {
      function currentSeasonPoster() {
         let index = -1
         let first = true
         let preindex = -1
         for(let i in result.seasonposter) {
            let poster = result.seasonposter[i]
            if(poster.season == season) {
               if(poster.lang == 'en') {
                  debugLog('poster', 'found fitting')
                  return i
               }
               if(first) {
                  preindex = i
                  first = false
               }
            }
         }
         if(preindex > -1) {
            debugLog('poster', 'only found different language')
            return preindex
         } else {
            debugLog('poster', 'did not found correct season')
            return index
         }
      }

      let url = ''

      function fallback() {
         if(Object.keys(result).includes('tvposter')) {
            debugLog('poster', 'placing tv poster as fallback')
            url = result.tvposter[0].url
         } else {
            debugLog('poster', 'replacing unavailable poster')
            url = '../../assets/'+config.client.placeholder.poster
         }
      }
      
      if(Object.keys(result).includes('seasonposter')) {
         let index = await currentSeasonPoster()
         if(index > -1) {
            url = result.seasonposter[index].url
         } else {
            fallback()
         }
      } else {
         fallback()
      }

      return url
   }).catch(() => {
      debugLog('error', 'fanart not found', new Error().stack)
      return '../../assets/'+config.client.placeholder.poster
   })
}

//:::: SEARCH ::::\\
let searchQueryCache = new Cache('searchQuery')

function searchRequestHelper(text) {
   let cacheContent = searchQueryCache.getKey(text)
   // check if text was searched already, send earlier results if so
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
   
            debugLog('caching', text)

            ipcRenderer.send('cache', {
               action: 'addKey',
               name: 'searchQuery',
               key: text,
               data: data
            })

            ipcRenderer.send('cache', {
               action: 'save', 
               name: 'searchQuery'
            })

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

// To sent API requests, we need a properly formed query. This formats the raw input text into a usable object.
function formatSearch(text) {
   let searchOptions = [
      's', 'show', 'shows', 'tv',
      'm', 'movie',
      'e', 'ep', 'episode',
      'p', 'person'
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


//:::: STATS ::::\\

// we're using the syncingCache from above here
async function getUserStats() {
   let cacheContent = syncingCache.getKey('userStats')
   if(cacheContent === undefined) {
      return requestUserStats().then(userStats => {
         debugLog('caching', 'user stats')

         ipcRenderer.send('cache', {
            action: 'addKey',
            name: 'syncing',
            key: 'userStats',
            data: userStats
         })

         ipcRenderer.send('cache', {
            action: 'save', 
            name: 'syncing'
         })

         return userStats
      })
   } else {
      // In this case, everything that was cached is uptodate
      debugLog('cache available', 'user stats')
      return cacheContent
   }
}

function requestUserStats() {
   debugLog('api request', 'user stats')
   let requestTime = Date.now()
   return new Promise(async (resolve, reject) => {
      let userSettings = await getUserSettings()
      resolve(
         trakt.users.stats({
            username: userSettings.user.username
         }).then(res => {
            debugLog('request finished', Date.now()-requestTime)
            return res
         })
      )
   })
}

async function getUserSettings() {
   let userSettings = await requestUserSettings()
   return userSettings
}

function requestUserSettings() {
   debugLog('api request', 'user information')
   let requestTime = Date.now()
   return trakt.users.settings().then(res => {
      debugLog('request finished', Date.now()-requestTime)
      return res
   })
}


//:::: CONTENT INDEXING ::::\\

// The following functions are used by the loading screen. They attempt to request everything about the user that would take too long to perform within the app.

function indexShows() {
   /** shows:
    *    all
    *    finished
    *    unfinished
    */
   return getAllShowsProgress(sortAndFilterProgress).then(shows => shows)
}

function sortAndFilterProgress(allShows) {
   console.log('shows:', allShows.length)

   cacheSave('showProgress')

   let finishedShows = allShows.filter(s => {
      return s.completed === s.aired
   })

   let unfinishedShows = allShows.filter(s => {
      return s.completed !== s.aired
   })

   let result = {
      all: allShows,
      finished: finishedShows,
      unfinished: unfinishedShows
   }

   return result
}

async function getAllShowsProgress(onFinish, onFail) {
   let showList = await getWatchedShows()
   let hiddenShows = await getHiddenItems()
   let visibleShows = filterAndSortShows(showList, hiddenShows)

   console.log(visibleShows)

   let showProgress = []

   return new Promise((resolve, rej) => {
      async function nextItem(counter) {
         if(counter < visibleShows.length) {
            let item = visibleShows[counter]
   
            let progress = await getShowProgress(item.show.ids.trakt)
            showProgress.push(progress)
   
            nextItem(++counter)
         } else {
            resolve(onFinish(showProgress))
         }
      }
   
      nextItem(0)
   })
}



//
// GET WRAPPERS
//

// Gets an array of n shows and it's progress that are not finished yet.
function getUnfinishedProgressList(n) {
   return new Promise(async (resolve, rej) => {
      // TODO: If newActivitiesAvailable, re-request the showList, compare what shows updated and re-request only those in getShowProgress
      let visible = await getShowList()
      let list = []

      for(let i=0; i<n && n<visible.length; i++) {
         let id = visible[i].show.ids.trakt
         let progress = await getShowProgress(id)

         if(progress.completed < progress.aired) {
            list.push({
               show: visible[i],
               progress: progress
            })
         } else {
            // show is completed, jump to the next one
            n++
         }
      }

      resolve(list)
   })
}


function getShowList() {
   return cacheRequest('itemList', 'shows', () => {
      return requestShowList()
   }, true)
}

function getShowProgress(id) {
   return cacheRequest('showProgress', id, () => {
      return requestShowProgress(id)
   }, true)
}


//
// REQUEST WRAPPERS
//

function requestShowList() {
   /** return[]:
    *    last_updated_at
    *    last_watched_at
    *    plays
    *    reset_at
    *    seasons[]:
    *       episodes[]:
    *          last_watched_at
    *          number
    *          plays
    *       number
    *    show:
    *       ids:
    *          imdb, slig, tmdb, trakt, tvdb, tvrange
    *       title
    *       year       
    */
   return new Promise(async (resolve, rej) => {
      let all = await requestWatchedShows()
      let hidden = await requestHiddenItems()
      let visible = filterAndSortShows(all, hidden)

      resolve(visible)
   })
}

function requestShowProgress(id) {
   /** return:
    *    aired
    *    completed
    *    hidden_seasons[]:
    *       number
    *       ids[]:
    *          trakt, tvdb, tmdb, imdb
    *    last_episode[]:
    *       season
    *       number
    *       title
    *       ids[]:
    *          trakt, tvdb, tmdb, imdb
    *    last_watched_at
    *    next_episode[]:
    *       season
    *       number
    *       title
    *       ids[]:
    *          trakt, tvdb, tmdb, imdb
    *    reset_at
    *    seasons[]:
    *       number
    *       aired
    *       completed
    *       episodes[]:
    *          number
    *          completed
    *          last_watched_at
    */
   return trakt.shows.progress.watched({
      id: id,
      extended: 'full'
   })
}

function requestWatchedShows() {
   debugLog('api request', 'trakt')
   let requestTime = Date.now()
   return trakt.sync.watched({
      type: 'shows'
   }).then(res => {
      debugLog('requesting time', Date.now()-requestTime)
      return res
   })
}

function requestHiddenItems() {
   debugLog('api request', 'trakt')
   let requestTime = Date.now()
   return trakt.users.hidden.get({
      section: 'progress_watched',
      limit: 100
   }).then(res => {
      debugLog('requesting time', Date.now()-requestTime)
      return res
   })
}


//
// MODIFIERS
//

function filterAndSortShows(all, hidden) {
   // Pay attention as the order in which the shows are sorted is by the date of last interaction. This interaction is not always a newly added episode but might also be a comment, rating or anything else unrelated to the watching history. Thus, it is not guaranteed that the order in which they appear in this list is the order of watching.
   let hiddenIds = hidden.map(item => item.show.ids.trakt)
   let visible = all.filter(item => !hiddenIds.includes(item.show.ids.trakt))

   visible.sort(function(a, b) {
      let aTime = new Date(a.last_watched_at).valueOf()
      let bTime = new Date(b.last_watched_at).valueOf()

      if(aTime > bTime) return -1
      if(aTime < bTime) return 1
      return 0
   })

   return visible
}


//
// CACHING
//

/**
 * Returns the data saved in the cache as the given key and requests it if nothing was saved. The data will be temporarily stored to make processing request arrays easier. To permanently save the results to the cache, use cacheSave().
 * @param {String} cacheName Name of the cache data will be saved to
 * @param {String} cacheKey Key under which the data is acessed
 * @param {Promise} request API request which gets the data in case it wasn't cached before
 * @param {Boolean} saveRightAfter Save the data to cache after requesting it
 */
function cacheRequest(cacheName, cacheKey, request, saveRightAfter) {
   let cache = new Cache(cacheName)
   let cacheContent = cache.getKey(cacheKey)

   if(cacheContent === undefined) {
      return request().then(result => {
         debugLog('caching', cacheKey)

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
      debugLog('cache available', cacheKey)
      // Returning a resolved Promise, so it will have the same type as the case above. That way it can be used with a .then() later in the caller without needing to know if the result comes from cache or an API request.
      return Promise.resolve(cacheContent)
   }
}

function cacheSave(cacheName) {
   // TODO: Only send this when uncached data was requested which has to be saved.
   ipcRenderer.send('cache', {
      action: 'saveKeys',
      name: cacheName
   })
}
