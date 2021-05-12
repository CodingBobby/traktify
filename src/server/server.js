const basePath = process.env.BASE_PATH
const path = require('path')

const klyft = require('klyft')

const klyftTasks = path.join(basePath, 'server/tasks.js')
let worker = null

process.on('exit', () => {
  worker.kill()
})

/**
 * Callback function for API jobs.
 * @typedef {Function} API_CALLBACK
 * @param {*} result final result of the jobs
 */

const API = {
  /**
   * Search the trakt.tv database for a string.
   * @param {string} text search string
   * @param {API_CALLBACK} cb callback when result is ready
   */
  searchTraktDB: function(text, cb) {
    worker.queue('prepareSearch', text).then(searchObject => {
      worker.queue('traktSearch', {
        type: searchObject.type,
        query: searchObject.filtered,
        extended: false
      }).then(cb)
    })
  },
  /**
   * Get more details about a single result from a search.
   * @param {Object[]} searchResult trakt.tv search result object
   * @param {API_CALLBACK} cb callback when result is ready
   */
  searchDetails: function(searchResult, cb) {
    for (r in searchResult) {
      worker.queue('extractSearchResultDetails', searchResult[r]).then(cb)
    }
  }
}


module.exports = {
  API,
  WORKER: {
    initialise: function() {
      worker = new klyft.Worker(klyftTasks, 'server', 1, true, false)
      return worker
    },
    kill: function(cb) {
      worker.kill()
      // will take a moment to kill, klyft has no callback yet
      setTimeout(cb, 300)
    }
  }
}
