let fanart = remote.getGlobal('fanart')
let config = remote.getGlobal('config')

module.exports = {
   newActivitiesAvailable: newActivitiesAvailable,
   getUpNextToWatch: getUpNextToWatch,
   searchRequestHelper: searchRequestHelper,
   getUserStats: getUserStats,
   getSeasonPoster: getSeasonPoster
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
      imageCache.setKey(cacheKey, data)
      ipcRenderer.send('cache', {
         action: 'save', 
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
            searchQueryCache.setKey(text, data)
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


//:::: POSTERS ::::\\
let posterCache = new Cache('poster')

async function getUpNextToWatch() {
   // To find uncached activities, we want to check for new activity on the episodes scope. That way we will find out, if the user has been watching a show after the app was closed previously
   let newActivities = await newActivitiesAvailable()
   let unseenShowActivity = newActivities.includes('episodes')

   let cacheContent = posterCache.getKey('upNextToWatch')
   if(cacheContent === undefined || unseenShowActivity) {
      return requestUpNextToWatch().then(upNextToWatch => {
         debugLog('caching', 'up next to watch')
         posterCache.setKey('upNextToWatch', upNextToWatch)
         ipcRenderer.send('cache', {
            action: 'save', 
            name: 'poster'
         })

         return upNextToWatch
      })
   } else {
      // In this case, everything that was cached is uptodate
      debugLog('cache available', 'up next to watch')
      return cacheContent
   }
}

async function requestUpNextToWatch() {
   let data = await getUsersShows().then(res => res)
   // debugLog('users shows', data.length)

   return new Promise((resolve, reject) => {
      let upNextPromises = []
      let limiter = 6

      data.forEach((item, index) => {
         if(index < limiter) {
            upNextPromises.push(
               new Promise((resolve, reject) => {
                  debugLog('api request', 'trakt')
                  let requestTime = Date.now()
                  resolve(
                     trakt.shows.progress.watched({
                        id: item.show.ids.trakt,
                        extended: 'full'
                     }).then(async res => {
                        debugLog('requesting time', Date.now()-requestTime)
                        if(res.completed === res.aired) {
                           // no next episode available, because all are watched
                           limiter++
                        }

                        // this creates us a more compact version of the next up item
                        return {
                           completed: res.aired === res.completed,
                           show: data[index].show,
                           updated: res.last_watched_at,
                           progress: res.seasons,
                           nextEp: res.next_episode ? {
                              season: res.next_episode.season,
                              episode: res.next_episode.number,
                              count: res.next_episode.number_abs,
                              title: res.next_episode.title,
                              ids: res.next_episode.ids,
                              info: res.next_episode.overview,
                              rating: res.next_episode.rating,
                              aired: res.next_episode.first_aired,
                              runtime: res.next_episode.runtime
                           } : undefined
                        }
                     })
                  )
               })
            )  
         }
      })

      resolve(
         Promise.all(upNextPromises).then(res => res)
      )
   })
}


async function getUsersShows() {
   // Lets see, if we already cached something before. If not, we will have to request everything from scratch. If yes, we only need to update the activity which is not cached yet.
   let cacheContent = posterCache.getKey('usersShows')
   if(cacheContent === undefined) {
      // request everything
      let usersShows = await requestUsersShows()

      debugLog('caching', 'users shows')
      posterCache.setKey('usersShows', usersShows)
      ipcRenderer.send('cache', {
         action: 'save', 
         name: 'poster'
      })

      return usersShows
   } else {
      // To find uncached activities, we want to check for new activity on the episodes scope. That way we will find out, if the user has been watching a show after the app was closed previously
      let newActivities = await newActivitiesAvailable()
      let unseenShowActivity = newActivities.includes('episodes')

      if(unseenShowActivity) {
         // this request everything until we found a good filter system
         let usersShows = await requestUsersShows()
         
         debugLog('caching', 'users shows')
         posterCache.setKey('usersShows', usersShows)
         ipcRenderer.send('cache', {
            action: 'save', 
            name: 'poster'
         })

         return usersShows
      } else {
         // In this case, everything that was cached is uptodate
         debugLog('cache available', 'users shows')
         return cacheContent
      }
   }
}

function requestUsersShows() {
   return getWatchedAndHiddenShows().then(([watched, hidden]) => {
      watched = Array.from(watched)
      debugLog('request finished', 'trakt')
      hidden = Array.from(hidden)
      debugLog('request finished', 'trakt')

      // filters hidden items
      let hiddenIds = hidden.map(item => item.show.ids.trakt)
      watched = watched.filter(item => !hiddenIds.includes(item.show.ids.trakt))

      // At this point the completed seasons cannot be filtered out because we didn't obtain information about how much the user watched of the show. Unfortunately this can only be done with another request, which we are doing later in the requestUpNextToWatch function.
      return watched
   })
}


function getWatchedShows() {
   debugLog('api request', 'trakt')
   let requestTime = Date.now()
   return trakt.sync.watched({
      type: 'shows'
   }).then(res => {
      debugLog('requesting time', Date.now()-requestTime)
      return res
   })
}

function getHiddenItems() {
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

function getWatchedAndHiddenShows() {
   return Promise.all([
      getWatchedShows(),
      getHiddenItems()
   ])
}


//:::: STATS ::::\\

// we're using the syncingCache from above here
async function getUserStats() {
   let cacheContent = syncingCache.getKey('userStats')
   if(cacheContent === undefined) {
      return requestUserStats().then(userStats => {
         debugLog('caching', 'user stats')
         syncingCache.setKey('userStats', userStats)
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

const natsort = require('natsort').default
let sorter = natsort({ desc: true })

let showCache = new Cache('shows')
let episodeCache = new Cache('episodes')
let movieCache = new Cache('movies')


function type(item) {
   let construct = item.constructor.toString()
   return construct.match(/function (.*)\(/)[1]
}


module.exports.indexShows = async function indexShows() {
   filteredShowProgress(function(progress) {
      console.log('length:', progress.length)

      // TODO: Only send this when uncached data was requested which has to be saved.
      ipcRenderer.send('cache', {
         action: 'saveKeys',
         name: 'showProgress'
      })

      // FIXME: sorting doesn't take any effect
      let sorted = progress.sort(function(a, b) {
         return sorter(a.last_watched_at, b.last_watched_at)
      })

      console.log('same sorting:', sorted == progress)
   })
}


async function filteredShowProgress(onFinish, onFail) {
   // Pay attention as the order in which the shows are sorted is by the date of last interaction. This interaction is not always a newly added episode but might also be a comment, rating or anything else unrelated to the watching history. Thus, it is not guaranteed that the order in which they appear in this list is the order of watching.
   let showList = await getWatchedShows()
   let hiddenShows = await getHiddenItems()
   let visibleShows = filterHiddenShows(showList, hiddenShows)

   let showProgress = []

   let processed = 1
   let toProcess = visibleShows.length

   async function checkMate(next) {
      let forward = await next()

      if(processed === toProcess) {
         console.log('completed')
         console.log(type(forward), forward.length)
         onFinish(forward)
      }

      processed++
   }

   async function nextItem(counter) {
      if(counter < visibleShows.length) {
         let item = visibleShows[counter]

         await checkMate(async function() {
            let progress = await requestShowProgress(item.show.ids.trakt)
            showProgress.push(progress)
            return showProgress
         })

         nextItem(++counter)
      }
   }

   nextItem(0)
}


function filterHiddenShows(all, hidden) {
   let hiddenIds = hidden.map(item => item.show.ids.trakt)
   return all.filter(item => !hiddenIds.includes(item.show.ids.trakt))
}


// wrapper for the raw request
function requestShowProgress(id) {
   /** res:
    *    aired,
    *    completed,
    *    hidden_seasons,
    *    last_episode,
    *    last_watched_at,
    *    next_episode,
    *    reset_at,
    *    seasons
    */
   return cacheRequest('showProgress', id, () => {
      return trakt.shows.progress.watched({
         id: id,
         extended: 'full'
      })
   })
}


//
// CACHING
//

function cacheRequest(cacheName, cacheKey, request) {
   let cache = new Cache(cacheName)
   let cacheContent = cache.getKey(cacheKey)

   if(cacheContent === undefined) {
      return request().then(result => {
         debugLog('caching', cacheKey)

         // Adding the data along with the key to a temporary list. The cache will be saved later from the callback inside filteredShowProgress()
         ipcRenderer.send('cache', {
            action: 'addKey',
            name: cacheName,
            key: cacheKey,
            data: result
         })

         return result
      })
   } else {
      // In this case, everything that was cached is uptodate
      debugLog('cache available', cacheKey)
      return cacheContent
   }
}
