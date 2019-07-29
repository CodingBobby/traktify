let fanart = remote.getGlobal('fanart')

module.exports = {
   newActivitiesAvailable: newActivitiesAvailable,
   getUpNextToWatch: getUpNextToWatch,
   searchRequestHelper: searchRequestHelper
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


//:::: SEARCH ::::\\
let searchQueryCache = new Cache('searchQuery')

function searchRequestHelper(text) {
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
         let cachingTime = Date.now()
         posterCache.setKey('upNextToWatch', upNextToWatch)
         posterCache.save()
         debugLog('caching time', Date.now()-cachingTime)
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
   debugLog('users shows', data.length)

   return new Promise((resolve, reject) => {
      let upNextPromises = []

      data.forEach((item, index) => {
         if(index < 6) {
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
                           } : undefined,
                           img: await fanart.shows.get(data[index].show.ids.tvdb)
                              .then(async resFan => {
                                 function currentSeasonPoster() {
                                    let index = -1
                                    let first = true
                                    let preindex = -1
                                    for(let i in resFan.seasonposter) {
                                       let poster = resFan.seasonposter[i]
                                       if(poster.season == res.next_episode.season) {
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
                                 if(resFan.seasonposter === undefined && resFan.tvposter === undefined) {
                                    url = 'https://png.pngtree.com/svg/20160504/39ce50858b.svg'
                                 } else if(resFan.seasonposter === undefined && resFan.tvposter !== undefined) {
                                    debugLog('poster', 'placing tv poster as fallback')
                                    url = resFan.tvposter[0].url
                                 } else {
                                    let index = await currentSeasonPoster()
                                    if(index > -1) {
                                       url = resFan.seasonposter[index].url
                                    } else {
                                       debugLog('poster', 'placing tv poster as fallback')
                                       url = resFan.tvposter[0].url
                                    }
                                 }
                                 return url
                              })
                              .catch(() => {
                                 return 'https://png.pngtree.com/svg/20160504/39ce50858b.svg'
                              })
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
      let cachingTime = Date.now()
      posterCache.setKey('usersShows', usersShows)
      posterCache.save()
      debugLog('caching time', Date.now()-cachingTime)

      return usersShows
   } else {
      // To find uncached activities, we want to check for new activity on the episodes scope. That way we will find out, if the user has been watching a show after the app was closed previously
      let newActivities = await newActivitiesAvailable()
      let unseenShowActivity = newActivities.includes('episodes')

      if(unseenShowActivity) {
         // this request everything until we found a good filter system
         let usersShows = await requestUsersShows()
         
         debugLog('caching', 'users shows')
         let cachingTime = Date.now()
         posterCache.setKey('usersShows', usersShows)
         posterCache.save()
         debugLog('caching time', Date.now()-cachingTime)

         return usersShows
      } else {
         // In this case, everything that was cached is uptodate
         debugLog('cache available', 'users shows')
         return cacheContent
      }
   }
}

function requestUsersShows() {
   return getWatchedAndHiddenShows().then(([res, res2]) => {
      let arr = Array.from(res)
      debugLog('request finished', 'trakt')
      let arr2 = Array.from(res2)
      debugLog('request finished', 'trakt')

      // filters hidden items
      let array2Ids = arr2.map(item => item.show.ids.trakt)
      arr = arr.filter((item) => !array2Ids.includes(item.show.ids.trakt))

      return arr
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
