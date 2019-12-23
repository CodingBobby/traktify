const {
   debugLog
} = require('./../helper.js')

const Queue = require('./../queue.js')
const postingQueue = new Queue({
   frequency: .1 // once every 10 seconds
}, argList => {
   let merged = {
      movies: [],
      shows: [],
      episodes: []
   }

   for(let arg in argList) {
      // arg itself looks like combined but with less items in the arrays
      for(let type in argList[arg]) {
         for(let item in argList[arg][type]) {
            merged[type].push(argList[arg][type][item])
         }
      }
   }

   console.log('argList', argList)
   console.log('merged', merged)
   return merged
})

module.exports = {
   addHistoryUpdates, testHistoryUpdates
}


function addHistoryUpdates(smallChanges) {
   console.log('pushing', smallChanges)
   postingQueue.add(function(singleChange) {
      postHistoryUpdates(singleChange)
   }, {
      args: smallChanges,
      overwrite: true
   })
}


function postHistoryUpdates(bigChanges) {
   /** Minimum requirement for the posted object
    * bigChanges: {
    *    movies | shows | episodes: [
    *       {
    *          watched_at: Date,
    *          ids: {
    *             trakt: Number
    *          }
    *       }
    *    ]
    * }
    */
   debugLog('api post', 'trakt')
   let postTime = Date.now()
   return trakt.sync.history.add(bigChanges).then(res => {
      debugLog('posting time', Date.now()-postTime)
      return res
   })
}


function testHistoryUpdates() {
   let changes = [{
      movies: [{
         watched_at: new Date(),
         ids: {
            trakt: 14701
         }
      }]
   }, {
      movies: [{
         watched_at: new Date()-30*60,
         ids: {
            trakt: 4618
         }
      }]
   }, {
      movies: [{
         watched_at: new Date()-40*60,
         ids: {
            trakt: 1301
         }
      }],
      shows: [{
         ids: {
            trakt: 21410
         },
         seasons: [{
            number: 1,
            episodes: [{
               watched_at: new Date()-50*60,
               number: 2
            }]
         }]
      }, {
         ids: {
            trakt: 1399
         },
         seasons: [{
            number: 2,
            episodes: [{
               watched_at: new Date()-60*60,
               number: 1
            }, {
               watched_at: new Date()-70*60,
               number: 2
            }]
         }]
      }]
   }]

   function reqPoster(i) {
      addHistoryUpdates(changes[i])
      if(++i < changes.length) {
         setTimeout(() => {
            reqPoster(i)
         }, 300)
      }
   }

   reqPoster(0)
}
