let fanart = remote.getGlobal('fanart')
let config = remote.getGlobal('config')

module.exports = {
   newActivitiesAvailable: newActivitiesAvailable,
   searchRequestHelper: searchRequestHelper,
   getUserStats: getUserStats,
   getSeasonPoster: getSeasonPoster,
   getUnfinishedProgressList: getUnfinishedProgressList,
   reloadAllItems: reloadAllItems,
   getBufferArea: getBufferArea
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

// This function is triggered when hitting the reload button on the dashboard.
async function reloadAllItems(_this, _par, onStart, onFinish) {
   onStart(_this) 
   await generatePosterSection(true)
   onFinish(_this, _par.children[0])
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
// BUFFER
//

// This will be used to get data for the card slider when clicking on an episode.
// TODO: delay triggering (on renderer side, not here!) to prevent buffering too many items when scrolling quickly through a list.
async function getBufferArea(id, s, e, onSeasons, onFirst, onBuffer) {
   let seasonList;
   let episodeData = await requestEpisodeData(id, s, e).then(async d => {
      // We first have to know the length of the season. With that information, we can add the required amount of cards to the stack—which will be done by the renderer receiving the callback.
      seasonList = await requestSeasonList(id).then(seasons => {
         let total = 0
         seasons.forEach(el => {
            if(el.title != 'Specials') {
               total += el.episode_count
            }
         })

         onSeasons({
            total: total,
            current: d.number_abs
         })
         return seasons
      })
      
      // Now, we can send the episode data back via the callback.
      onFirst(d)
      return d
   })

   // now we can start with the buffer
   let episodeList = await requestEpisodeList(id, s).then(r => r)

   let numList = []
   episodeList.filter((el, i) => {
      if(el.season == s && el.number == e) {
         // buffers will be requested in this order
         numList = [i, i+1, i-1, i+2, i-2]
         return true
      } else return false
   })

   let indexList = []
   numList.forEach(i => {
      // season and episode index relative to current position
      let si, ei
      if(i < 0) {
         si = -1
         ei = i
      } else if(i > episodeList.length-1) {
         si = 1
         ei = Math.abs(episodeList.length - i)
      } else {
         si = 0
         ei = i
      }
      indexList.push({si, ei})
   })

   console.log('indexList', indexList)

   // In the code above, I assumed that seasons which finished airing always contain more than one episode. Otherwise, the buffer would have to jump across more than two different seasons in one direction. Hopefully such show does not exist.

   function translateIndex(array, index) {
      if(index < 0) {
         return array.length - index
      } else return index+1
   }

   function sumUntil(array, index) {
      let sum = 0
      for(let i=0; i<index; i++) {
         if(array[i].title != 'Specials') {
            sum += array[i].episode_count
         }
      }
      console.log('sum of', array, 'up to', index, 'is', sum)
      return sum
   }

   indexList.shift() // remove first element, as its already returned
   indexList.forEach(async i => {
      let seasonNum = Number(s) + i.si // numberizing required!

      if(seasonNum <= await seasonList.length) {
         episodeList = requestEpisodeList(id, seasonNum).then(r => r)
         let epBuffer = requestEpisodeData(id, seasonNum,
            translateIndex(episodeList, i.ei)
         )
         let totalIndex = sumUntil(seasonList, seasonNum) + i.ei
         console.log('buffer', totalIndex, epBuffer)
         onBuffer(await epBuffer, totalIndex)
      }
   })
}

module.exports.showBuffer = class showBuffer {
   constructor(showId) {
      this.id = showId

      this.show = {
         seasons: []
      }
      // array of episode_count
      this.tree = []
      // plain 1D array with a list of all items
      this.items = []
      // current position
      this.current = 0

      // indices that are in queue to be requested
      this.queue = []
   }

   /**
    * Initialize an array with an element for each episode.
    * @param {Number} size Total size of TV show
    */
   applySize(size) {
      for(let i=0; i<size; i++) {
         this.items.push(null)
      }
   }

   /**
    * Initialize the buffer at a given point in the TV show.
    * @param {Number} s Number of the season
    * @param {Number} e Number of the episode
    * @param {Function} on.size Callback when the size of the entire show is known
    * @param {Function} on.first Callback when full data for the current episode is available
    * @param {Function} on.buffer Callback when one episode from the buffer area got requested. Will trigger once for each element.
    */
   initAt(s, e, on) {
      requestEpisodeData(this.id, s, e).then(async d => {
         // We first have to know the length of the season. With that information, we can add the required amount of cards to the stack—which will be done by the renderer receiving the callback.
         await requestSeasonList(this.id).then(seasons => {
            this.show.seasons = seasons

            let total = 0
            seasons.forEach(el => {
               if(el.title != 'Specials') {
                  // counting episodes but ignoring specials
                  total += el.episode_count
                  this.tree.push(el.episode_count)
               }
            })

            let size = {
               total: total,
               current: d.number_abs
            }

            on.size(size)
            this.applySize(size.total)
            this.current = size.current
         })
         
         // Now, we can send the episode data back via the callback and save it to the local scope.
         await on.first(d)
         this.items[this.current-1] = d

         this.updateBuffer(this.current, on)
      })
   }

   /**
    * Moving through the buffer by a certain amount. To prevent buffer piling, this function has to be called in delay with the total movement happened during that delay.
    * @param {Number} dir The amount of episodes to move, negative to move backwards.
    * @param {Function} on.first Callback for the data of the seen item.
    * @param {Function} on.buffer Callback for the buffered items.
    */
   move(dir, on) {
      debugLog('cards', `moving ${dir>0 ? 'right' : 'left'}`)
      let newPos = this.current + dir

      // The new buffer position would be out of range. I hope this will never happen but in case it does, we'll clip it to the max or min.
      if(newPos < 1) {
         newPos = 1
      } else if(newPos > this.items.length) {
         newPos = this.items.length
      }

      // update the current position in the buffer
      this.current = newPos
      this.updateBuffer(newPos, on)
   }

   /**
    * Updates the buffer to the new position and calculates the surrounding area to request.
    * @param {Number} pos New position to move to, absolute number.
    * @param {Function} on.first Callback for the data of the seen item.
    * @param {Function} on.buffer Callback for the buffered items.
    */
   updateBuffer(pos, on) {
      let range = [0, 1, -1, 2, -2]
      range.forEach(r => {
         let epPos = pos+r
         // the absolute positions can't become smaller than 1 or greater the show length
         if(epPos > 0 && epPos <= this.items.length) {
            this.queue.push(epPos)
         }
      })

      this.nextInQueue(on)
   }

   /**
    * Recursive function that runs over the queue list where items were added by the updateBuffer() function.
    * @param {Function} on.first Callback for the data of the seen item.
    * @param {Function} on.buffer Callback for the buffered items.
    */
   async nextInQueue(on) {
      if(this.queue.length > 0) {
         let reqPos = this.queue[0]
         // remove it and possible dublicates from the queue
         this.queue = this.queue.filter(q => q != reqPos)

         if(reqPos == this.current) {
            on.first(await this.requestEpisode(reqPos))
         } else {
            on.buffer(await this.requestEpisode(reqPos), reqPos-1)
         }
         
         // some time delay to allow flushing the quere
         setTimeout(() => {
            this.nextInQueue(on)
         }, 200)
      }
   }

   flushQueue() {
      // This empties the queue, it does not fully kill the requesting process if some is currently running! The flushing is possible since the requesting queue is delayed after each finished item.
      this.queue = []
   }

   /**
    * Sends back data for a given episode number.
    * @param {Number} pos Absolute index of the episode
    */
   requestEpisode(pos) {
      if(this.items[pos-1] == null) {
         // a simple helper
         let counter = 0

         // these two will be determined in the following loop
         let seasonIndex = 0
         let episodeIndex = 0
         for(let i=0; i<this.tree.length; i++) {
            let seasonLength = this.tree[i]
            counter += seasonLength
            if(pos <= counter) {
               seasonIndex = i+1
               episodeIndex = pos - counter + seasonLength
               i = this.tree.length // trigger loop break
            }
         }

         let id = this.id
         return getEpisodeData(id, seasonIndex, episodeIndex).then(epData => {
            this.items[pos-1] = epData
            return epData
         })
      } else {
         // item was already buffered before
         return Promise.resolve(this.items[pos-1])
      }
   }
}


//
// GET WRAPPERS
//

/** Gets an array of n shows and it's progress that are not finished yet. If argument update is true, the updated items are re-requested instead of directly restored from cache.
 * @param {Number} n Number of sequential shows with unseen episodes to get
 * @param {Boolean} update If cached data should be checked against possible updates
 */
function getUnfinishedProgressList(n, update) {
   return new Promise(async (resolve, rej) => {
      let visible = await getShowList()
      
      // holds ids of shows that require re-requests
      let updatedIDs = []

      if(update) {
         // This contains a freshly requested show list which could have the last_watched_at property of one or more shows updated and/or one or more additional shows at the start of the list. In the first case, the order of the already stored shows changed. In the second case, all already stored shows are shifted down by some indices.
         let updated = await getShowList(true)

         updated.forEach(item => {
            let oldIndex = visible.map(v => v.show.ids.trakt).indexOf(item.show.ids.trakt)

            // store show id if it already exists but had updated watching progress
            if(oldIndex > -1) {
               if(visible[oldIndex].last_watched_at !== item.last_watched_at) {
                  updatedIDs.push(item.show.ids.trakt)
               }
            }
         })

         // overwrite old data with new
         visible = updated
      }

      let list = []

      for(let i=0; i<n && n<visible.length; i++) {
         let id = visible[i].show.ids.trakt
         let progress = await getShowProgress(id, updatedIDs.includes(id))

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

      cacheSave('showProgress')

      resolve(list)
   })
}

function getShowList(update) {
   if(update) {
      let cache = new Cache('itemList')
      cache.removeKey('shows')
      cache.save()
   }

   return cacheRequest('itemList', 'shows', () => {
      return requestShowList()
   }, true)
}

function getShowProgress(id, update) {
   if(update) {
      let cache = new Cache('showProgress')
      cache.removeKey(id)
      cache.save()
   }

   return cacheRequest('showProgress', id, () => {
      return requestShowProgress(id)
   }, false)
}

function getEpisodeData(id, season, episode, update) {
   let cacheId = id+'_'+season+'_'+episode

   if(update) {
      let cache = new Cache('episodeData')
      cache.removeKey(cacheId)
      cache.save()
   }

   return cacheRequest('episodeData', cacheId, () => {
      return requestEpisodeData(id, season, episode)
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
   debugLog('api request', 'trakt')
   let requestTime = Date.now()
   return trakt.shows.progress.watched({
      id: id,
      extended: 'full'
   }).then(res => {
      debugLog('requesting time', Date.now()-requestTime)
      return res
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


function requestSeasonList(id) {
   /**
    * []:
    *    number
    *    ids: trakt, tvdb, tmdb
    *    rating
    *    votes
    *    episode_count
    *    aired_episodes
    *    title
    *    overview
    *    first_aired
    *    network
    */
   debugLog('api request', 'trakt')
   let requestTime = Date.now()
   return trakt.seasons.summary({
      id: id,
      extended: 'full'
   }).then(res => {
      debugLog('requesting time', Date.now()-requestTime)
      return res
   })
}

function requestEpisodeList(id, season) {
   debugLog('api request', 'trakt')
   let requestTime = Date.now()
   return trakt.seasons.season({
      id: id,
      season: season
   }).then(res => {
      debugLog('requesting time', Date.now()-requestTime)
      return res
   })
}

function requestEpisodeData(id, season, episode) {
   debugLog('api request', 'trakt')
   let requestTime = Date.now()
   return trakt.episodes.summary({
      id: id,
      season: season,
      episode: episode,
      extended: 'full'
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
