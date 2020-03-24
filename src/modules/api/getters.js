const {
   debugLog
} = require('./../helper.js')


module.exports = {
   getUnfinishedProgressList,
   getSeasonList,
   getEpisodeData,
   getShowImages,
   getShowList
}

const {
   requestShowList,
   requestShowProgress,
   requestSeasonList,
   requestEpisodeData,
   requestShowImages
} = require('./requesters.js')

const {
   cacheSave,
   cacheRequest,
   flushCache
} = require('./cachers.js')


/** 
 * Gets an array of n shows and it's progress that are not finished yet. If argument update is true, the updated items are re-requested instead of directly restored from cache.
 * @param {Number} n Number of sequential shows with unseen episodes to get
 * @param {Boolean} update If cached data should be checked against possible updates
 * @param {Function} loadingCallback A callback that sends the percentage of progression
 */
function getUnfinishedProgressList(n, update, loadingCallback) {
   // empty function in case its not incuded in the function call
   loadingCallback = loadingCallback || function(n) {}

   return new Promise(async (resolve, rej) => {
      let visible = []
      
      // holds ids of shows that require re-requests
      let updatedIDs = []

      if(update) {
         /** 
          * This contains a freshly requested show list which could have the last_watched_at property of one or more shows updated and/or one or more additional shows at the start of the list. In the first case, the order of the already stored shows changed. In the second case, all already stored shows are shifted down by some indices. */

         let updated = await getShowList(true, percent => {
            loadingCallback(0 + percent*4/7)
         })
         loadingCallback(4.5/7)

         updated.forEach(item => {
            let oldIndex = visible.map(v => {
               return v.show.ids.trakt
            }).indexOf(item.show.ids.trakt)

            // store show id if it already exists but had updated watching progress
            if(oldIndex > -1) {
               if(visible[oldIndex].last_watched_at !== item.last_watched_at) {
                  updatedIDs.push(item.show.ids.trakt)
               }
            }
         })
         loadingCallback(5/7)

         // overwrite old data with new
         visible = updated
      } else {
         visible = await getShowList()
         loadingCallback(5/7)
      }

      let list = []

      for(let i=0; i<n && n<visible.length; i++) {
         let id = visible[i].show.ids.trakt
         let progress = await getShowProgress(id, updatedIDs.includes(id))
         loadingCallback(5/7 + (i+1)/n * 1.5/7)

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
      loadingCallback(7/7)

      resolve(list)
   })
}

function getShowList(update, progressCallback) {
   progressCallback = progressCallback || function(n) {}

   if(update) {
      flushCache('itemList', 'shows')
   }

   return cacheRequest('itemList', 'shows', () => {
      return requestShowList(progressCallback)
   }, true)
}

function getShowProgress(id, update) {
   if(update) {
      flushCache('showProgress', id)
   }

   return cacheRequest('showProgress', id, () => {
      return requestShowProgress(id)
   }, false)
}

function getSeasonList(id, update) {
   if(update) {
      flushCache('seasonList', id)
   }

   return cacheRequest('seasonList', id, () => {
      return requestSeasonList(id)
   }, true)
}

function getEpisodeData(id, season, episode, update) {
   let cacheId = id+'_'+season+'_'+episode

   if(update) {
      flushCache('episodeData', cacheId)
   }

   return cacheRequest('episodeData', cacheId, () => {
      return requestEpisodeData(id, season, episode)
   }, true)
}

function getShowImages(id, update) {
   if(update) {
      flushCache('images', id)
   }

   return cacheRequest('images', id, () => {
      return requestShowImages(id)
   }, true)
}
