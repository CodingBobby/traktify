const {
   debugLog
} = require('./../helper.js')


module.exports = {
   requestShowList,
   requestShowProgress,
   requestSeasonList,
   requestEpisodeList,
   requestEpisodeData,
   requestShowImages
}


function requestShowList(progressCallback) {
   progressCallback = progressCallback || function(n) {}
   
   function filterAndSortShows(a, h) {
      /**
       * Pay attention as the order in which the shows are sorted is by the date of last interaction. This interaction is not always a newly added episode but might also be a comment, rating or anything else unrelated to the watching history. Thus, it is not guaranteed that the order in which they appear in this list is the order of watching. */
      let hiddenIds = h.map(item => item.show.ids.trakt)
      let visible = a.filter(item => {
         return !hiddenIds.includes(item.show.ids.trakt)
      })
   
      visible.sort((a, b) => {
         let aTime = new Date(a.last_watched_at).valueOf()
         let bTime = new Date(b.last_watched_at).valueOf()
   
         if(aTime > bTime) return -1
         if(aTime < bTime) return 1
         return 0
      })
   
      return visible
   }

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
      progressCallback(1/3)
      let hidden = await requestHiddenItems()
      progressCallback(2/3)
      let visible = filterAndSortShows(all, hidden)
      progressCallback(3/3)

      resolve(visible)
   })
}


// TRAKT

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
      id: id, // showid
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


// FANART

function requestShowImages(id) {
   // id is tvdb-id
   debugLog('api request', 'fanart')
   let requestTime = Date.now()
   return fanart.shows.get(id).then(res => {
      debugLog('requesting time', Date.now()-requestTime)
      return res
   })
}
