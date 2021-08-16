const tracer = require('../manager/log.js')
const Cache = require('../manager/cache.js')
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
 * All properties except for `all` are objects of different activities which all contain a timestamp of their latest subactivity.
 * See example for better understanding.
 * @typedef {Object} TRAKT_ACTIVITY_OBJECT
 * @property {string} all timestamp of latest overall activity
 * @property {Object.<string,string>} [account]
 * @property {Object.<string,string>} [comments]
 * @property {Object.<string,string>} [episodes]
 * @property {Object.<string,string>} [seasons]
 * @property {Object.<string,string>} [shows]
 * @property {Object.<string,string>} [movies]
 * @property {Object.<string,string>} [lists]
 * @property {Object.<string,string>} [watchlist]
 * @property {Object.<string,string>} [recommendations]
 * @memberof Modules.API
 * @example // an object of this type might look like so:
 * activitySummary = {
 *   all: "2021-07-11T09:46:18.000Z",
 *   comments: {
 *     liked_at: "2021-07-11T09:46:18.000Z"
 *   },
 *   episodes: {
 *     watched_at: "2021-06-16T09:14:38.000Z",
 *     rated_at: "2021-06-16T09:21:11.000Z"
 *   }
 * }
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
   * Get list of methods that are available through the trakt API.
   * @returns {Promise.<Array.<string>>}
   */
  availableMethods() {
    return new Promise((res, _rej) => {
      res(Object.keys(this.trakt))
    })
  }


  /**
   * Get a summary of the user's latest activities.
   * @returns {Promise.<Modules.API.TRAKT_ACTIVITY_OBJECT>}
   */
  latestActivities() {
    return this.trakt.sync.last_activities()
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
}


/**
 * @memberof Modules.API
 */
class CachedTraktor extends Traktor {
  /**
   * A cached version of the class {@link Modules.API.Traktor} which looks for content saved in cache which could be served instead of doing the actual API request.
   * @param {Trakt} trakt authenticated API instance of trakt.tv
   */
  constructor(trakt) {
    super(trakt)

    /**
     * @type {Object.<string,Cache>}
     */
    this.cache = {}
    
    return new Proxy(this, {
      get: (obj, prop) => typeof obj[prop] !== 'function'
        ? obj[prop]
        : (() => {
          // for each found Traktor method, initialise a Cache
          this.cache[prop] = new Cache(prop)

          // callback that is actually being proxied
          return (...args) => obj.cacheware(prop, args)
        })()
    })
  }

  
  /**
   * This middleware wraps the original get-methods into {@link Modules.Manager.Cache}'s `retrieval` method.
   * @param {string} prop method's name which to execute from super
   * @param {*} args whatever should be passed to that method
   * @returns {Promise.<*>} whatever the original method would return
   */
  cacheware(prop, args) {
    // this is executed when no valid cache content was found
    const parent = () => this[prop].apply(this, args)

    // stringify arguments so each configuration can be cached individually
    const cacheKey = JSON.stringify(args)

    return new Promise((resolve, _rej) => {
      this.cache[prop].retrieve(cacheKey, async setKey => {
        const requestResult = await parent()

        // cache result for next time
        setKey(requestResult)
        this.cache[prop].save()

        resolve(requestResult)
      }, (cachedResult, _updateKey) => {
        resolve(cachedResult)
      })
    })
  }
}


module.exports = {
  Traktor, CachedTraktor
}
