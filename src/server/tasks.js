const path = require('path')
process.env.BASE_PATH = path.join(__dirname, '..')

const klyft = require('klyft')
const Trakt = require('trakt.tv')

const init = require('../modules/init')
const keys = init.getAPIKeys()

const trakt = new Trakt({
  client_id: keys.trakt_id,
  client_secret: keys.trakt_secret
})

const { formatSearch } = require('../modules/filters')


// Type Definitions

/**
 * @callback JobDone
 * @param {*} [result]
 */

/**
 * @callback JobFunction
 * @param {*} args
 * @param {JobDone} done
 */


// Job Collections

/**
 * @type {Object.<string,JobFunction>}
 */
const DEV_JOBS = {
  /**
   * Simple job for testing with an artificial delay.
   * @param {number} duration
   */
  delay: function(duration, done) {
    console.log(`starting ${duration} delay`)
  
    setTimeout(() => {
      console.log(`finished ${duration} delay`)
  
      return done()
    }, duration)
  },
}


/**
 * @type {Object.<string,JobFunction>}
 */
const JOBS = {
  /**
   * Filter and format raw search text to be used by the API.
   * @param {string} input
   */
  prepareSearch: function(input, done) {
    let queryObject = formatSearch(input)
    return done(queryObject)
  },

  /**
   * Search the trakt.tv database.
   * @param {Object} query
   * @param {'movie'|'show'|'episode'|'person'} query.type
   * @param {string} query.query
   * @param {'full'} [query.extended]
   */
  traktSearch: function(query, done) {
    let results = trakt.search.text(query)
    return done(results)
  },

  /**
   * @typedef {Object} TRAKT_IDS
   * @property {number} trakt
   * @property {string} slug
   * @property {number} tvdb
   * @property {number} tmdb
   * @property {sting} imdb
   * @property {number} tvrage
   */

  /**
   * @typedef {Object} TRAKT_SEARCH_OBJECT
   * @property {'movie'|'show'|'episode'|'person'} type
   * @property {number} score
   * @property {Object} [movie]
   * @property {string} [movie.title]
   * @property {number} [movie.year]
   * @property {TRAKT_IDS} [movie.ids]
   * @property {Object} [episode]
   * @property {string} [episode.title]
   * @property {number} [episode.year]
   * @property {TRAKT_IDS} [episode.ids]
   * @property {Object} [show]
   * @property {string} [show.title]
   * @property {number} [show.year]
   * @property {TRAKT_IDS} [show.ids]
   * @property {Object} [person]
   * @property {string} [person.name]
   * @property {TRAKT_IDS} [person.ids]
   */

  /**
   * Get more details about an item.
   * @param {TRAKT_SEARCH_OBJECT} searchResult
   */
  extractSearchResultDetails: async function(searchResult, done) {
    let resultID = searchResult[searchResult.type].ids.trakt
    let result;

    switch (searchResult.type) {
      case 'movie':
        result = await trakt.movies.summary(resultID)
        break;
      case 'show':
        result = await trakt.shows.summary(resultID)
        break;
      case 'episode':
        result = await trakt.episodes.summary(resultID)
        break;
      case 'person':
        result = await trakt.people.summary({
          id: resultID
        })
        break;
    }

    return done(result)
  }
}


// Job Initialisation

for (jobName in DEV_JOBS) {
  new klyft.Job(jobName, DEV_JOBS[jobName])
}

for (jobName in JOBS) {
  new klyft.Job(jobName, JOBS[jobName])
}
