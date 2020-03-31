let fanart = remote.getGlobal('fanart')
let config = remote.getGlobal('config')

module.exports = {
   newActivitiesAvailable,
   searchRequestHelper,
   getUserStats,
   getSeasonPoster,
   reloadAllItems
}

const {
   debugLog
} = require('./helper.js')


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
function searchRequestHelper(text) {
   let searchQueryCache = new Cache('searchQuery')
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
               action: 'saveKeys', 
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

//
// BUFFER
//

const {
   getShowList,
   getEpisodeData,
   getSeasonList,
   getShowImages
} = require('./api/getters.js')

async function convertTraktToTvdb(id) {
   return await getShowList().then(list => {
      let trakt = list.map(s => s.show.ids.trakt)
      let i = trakt.indexOf(Number(id))
      return list[i].show.ids.tvdb
   })
}

/**
 * This buffer instance handles the traffic between API, Cache and renderer.
 * It is mainly used for the card slider which openes when clicked on a episode poster.
 * Inside this slider the user is able to move back and forth through every episode of the tv show. Loading the data for all episodes at once would take first of all way too much time and secondly it would stress the APIs too much which would lead to rate limiting.
 * The buffer is meant to reduce these load times and stresses to make the user experice fluid and snappy.
 * 
 * A buffer instance is unique to one show. To buffer another show, the instance would have to be either overwritten or a new one must be created.
 */
module.exports.showBuffer = class showBuffer {
   constructor(showId) {
      debugLog('buffer', 'creating new instance for '+showId)
      this.id = showId
      this.tvdb = convertTraktToTvdb(this.id)

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

      this.timer = 0
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
    * @param {Number} s Number of the season
    * @param {Number} e Number of the episode
    */
   posToAbs(s, e) {
      let abs = 0

      // contains the episode counts of the seasons
      this.tree.forEach((c, i) => {
         if(i < s-1) {
            // add all episodes on seasons below current
            abs += c
         }
      })

      // add pos inside current season
      abs += e
      return abs
   }

   /**
    * Initialize the buffer at a given point in the TV show.
    * @param {Number} s Number of the season
    * @param {Number} e Number of the episode
    * @param {Function} on.size Callback when the size of the entire show is known
    * @param {Function} on.first Callback when full data for the current episode is available
    * @param {Function} on.buffer Callback when one episode from the buffer area got requested. Will trigger once for each element.
    */
   async initAt(s, e, on) {
      s = Number(s) // prevent string addition
      e = Number(e)
      debugLog('!buffer', 'initializing new instance')
      this.timer = Date.now()

      await getEpisodeData(this.id, s, e).then(async d => {
         // We first have to know the length of the season. With that information, we can add the required amount of cards to the stack—which will be done by the renderer receiving the callback.
         await getSeasonList(this.id).then(seasons => {
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
               current: this.posToAbs(s, e)
            }

            this.current = size.current

            on.size(size)
            this.applySize(total)
         })
         
         // Now, we can send the episode data back via the callback and save it to the local scope.
         await on.first(this.formatUpdates(d))
         this.items[this.current-1] = { data: d, images: null }

         this.updateBuffer(this.current, on)
      })

      on.images(await this.requestImages(this.current), this.current-1)
   }

   /**
    * Restore the buffer at a given point in the TV show. Restoration is faster than initialization.
    * @param {Number} s Number of the season
    * @param {Number} e Number of the episode
    * @param {Function} on.size Callback when the size of the entire show is known
    * @param {Function} on.first Callback when full data for the current episode is available
    * @param {Function} on.buffer Callback when one episode from the buffer area got requested. Will trigger once for each element.
    */
   async openAt(s, e, on) {
      s = Number(s)
      e = Number(e)
      debugLog('!buffer', 'opening existing instance')
      this.timer = Date.now()

      this.current = this.posToAbs(s, e)

      on.size({
         total: this.tree.reduce((p, c) => p + c),
         current: this.current
      })

      let firstData = await this.requestEpisode(this.current)
      let firstRes = this.formatUpdates(firstData)
      on.first(firstRes)

      this.updateBuffer(this.current, on)
   }

   /**
    * Moving through the buffer by a certain amount. To prevent buffer piling, this function has to be called in delay with the total movement happened during that delay.
    * @param {Number} dir The amount of episodes to move, negative to move backwards.
    * @param {Function} on.first Callback for the data of the seen item.
    * @param {Function} on.buffer Callback for the buffered items.
    */
   move(dir, on) {
      debugLog('!buffer', `moving ${dir>0 ? 'right' : 'left'}`)
      this.timer = Date.now()
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

         let epData = this.formatUpdates(await this.requestEpisode(reqPos))

         // first item is passed to a separate callback
         if(reqPos == this.current) {
            on.first(epData)
         } else {
            on.buffer(epData, reqPos-1)
         }

         // this hopefully doesn't take ages to resolve
         on.images(await this.requestImages(reqPos), reqPos-1)
         
         // some time delay to allow manual flushing (would otherwise constantly block thread)
         setTimeout(() => {
            this.nextInQueue(on)
         }, 200)
      } else {
         // stop timer
         debugLog('!buffer', Date.now()-this.timer + 'ms')
      }
      
   }

   flushQueue() {
      // This empties the queue, it does not fully kill the requesting process if some is currently running! The flushing is possible since the requesting queue is delayed after each finished item.
      this.queue = []
   }

   /**
    * Sends back data for a given episode number. It will automatically check for available buffer and cache data. Only if nothing is saved already, the API will be used to get the data.
    * @param {Number} pos Absolute position of the episode in the show.
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
            this.items[pos-1] = { data: epData }
            return epData
         })
      } else {
         // item was already buffered before
         debugLog('!buffer', `restoring item ${pos-1}`)
         return Promise.resolve(this.items[pos-1].data)
      }
   }

   /**
    * Send back object of image URLs for a given item in the buffer. Through a getter function the API and Cache load will be balanced automatically. Result is in form of a promise.
    * @param {Number} pos Absolute position of the episode in the show.
    */
   async requestImages(pos) {
      if(this.items[pos-1].images == null) {
         // no images buffered
         return getShowImages(await this.tvdb).then(r => {
            this.items[pos-1].images = {
               banner: r.tvbanner[0].url,
               poster: r.tvposter[0].url
            }
            return this.items[pos-1].images
         })
      } else {
         // images were buffered before
         return Promise.resolve(this.items[pos-1].images)
      }
   }

   formatUpdates(raw) {
      return {
         ratingPercent: ''+Math.round(raw.rating * 10),
         episodeTitle: raw.title,
         episodeNumber: (() => {
            let num = ''+raw.number
            if(num.length < 2) {
               num = '0'+num
            }
            return num
         })(),
         seasonNumber: ''+raw.season,
         absoluteNumber: ''+raw.number_abs,
         description: raw.overview
      }
   }
}
