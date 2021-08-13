const tracer = require('../manager/log.js')
const Trakt = require('trakt.tv')
const filters = require('./filters.js') // required for docs
const { Queue, Task } = require('../manager/queue.js')


/**
 * @typedef {Object} TRAKT_IDS
 * @property {number} trakt
 * @property {string} slug
 * @property {number} [tvdb]
 * @property {number} [tmdb]
 * @property {sting} [imdb]
 * @property {number} [tvrage]
 * @memberof Modules.API
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
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_MOVIE_SUMMARY
 * @property {string} title
 * @property {number} year release year
 * @property {TRAKT_IDS} ids
 * @property {string} tagline very short shout
 * @property {string} overview short description of story
 * @property {string} released full release date
 * @property {number} runtime duration in minutes
 * @property {string} country 2-letter code of origin
 * @property {string} trailer link to youtube
 * @property {string} homepage link to website
 * @property {string} status release status
 * @property {number} rating float from 0–10
 * @property {number} votes count of votes
 * @property {number} comment_count comments on trakt.tv
 * @property {string} updated_at date of last change
 * @property {string} language 2-letter code of original language
 * @property {Array.<string>} available_translations list of 2-letter codes
 * @property {Array.<string>} genres list of categories
 * @property {string} certification PG-age recommendation
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_SHOW_SUMMARY
 * @property {string} title
 * @property {number} year release year
 * @property {TRAKT_IDS} ids
 * @property {string} overview short description of story
 * @property {string} first_aired full date of first release
 * @property {Object} airs
 * @property {string} airs.date weekday
 * @property {string} airs.time time in 24h
 * @property {string} airs.timezone zone the airtime refers to
 * @property {number} runtime duration in minutes
 * @property {number} aired_episodes count of released episodes
 * @property {string} network name of TV-channel
 * @property {string} country 2-letter code of origin
 * @property {string} trailer link to youtube
 * @property {string} homepage link to website
 * @property {string} status release status
 * @property {number} rating float from 0–10
 * @property {number} votes count of votes
 * @property {number} comment_count comments on trakt.tv
 * @property {string} updated_at date of last change
 * @property {string} language 2-letter code of original language
 * @property {Array.<string>} available_translations list of 2-letter codes
 * @property {Array.<string>} genres list of categories
 * @property {string} certification PG-age recommendation
 * @memberof Modules.API
 */

/**
 * @typedef {Modules.API.TRAKT_MOVIE_SUMMARY|Modules.API.TRAKT_SHOW_SUMMARY} TRAKT_SEARCH_DETAILS
 * @memberof Modules.API
 */


/**
 * @memberof Modules.API
 */
class Traktor {
  /**
   * Backend side of the internal API.
   * All methods should return Promises.
   * @param {Trakt} trakt authenticated API instance of trakt.tv
   */
  constructor(trakt) {
    this.trakt = trakt
  }


  /**
   * Search the trakt.tv database.
   * @param {Modules.API.FILTERED_EXT} query result from {@link Modules.API.formatSearch}
   * @returns {Promise.<Array.<Modules.API.TRAKT_SEARCH_OBJECT>>}
   */
  traktSearch(query) {
    return this.trakt.search.text({
      type: query.type,
      query: query.filtered
    })
  }


  /**
   * Get more details about an item.
   * @param {Modules.API.TRAKT_SEARCH_OBJECT} searchResult
   * @returns {Promise.<Modules.API.TRAKT_SEARCH_DETAILS>}
   */
  extractSearchResultDetails(searchResult) {
    let resultID = searchResult[searchResult.type].ids.trakt
    let options = {
      id: resultID,
      extended: 'full'
    }
    let result;

    switch (searchResult.type) {
      case 'movie':
        result = this.trakt.movies.summary(options)
        break;
      case 'show':
        result = this.trakt.shows.summary(options)
        break;
      case 'episode':
        result = this.trakt.episodes.summary(options)
        break;
      case 'person': // only because of this, a switch is needed
        result = this.trakt.people.summary(options)
        break;
    }

    return result
  }


  /**
   * Get list of methods that are available through the trakt API.
   * @returns {Promise.<Array.<string>>}
   */
  availableMethods() {
    return new Promise((res, _rej) => {
      res(Object.keys(this.trakt))
    })
  }
}


module.exports = {
  Traktor
}
