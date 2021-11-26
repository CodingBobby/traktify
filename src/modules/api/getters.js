const tracer = require('../manager/log.js')
const Cache = require('../manager/cache.js')
const Trakt = require('trakt.tv')
const Fanart = require('fanart.tv')
const filters = require('./filters.js') // required for docs
const { Queue, Task } = require('../manager/queue.js')


/**
 * Find property of object by a string.
 * Shamelessly stolen from Alnitak.
 * @param {Object} o 
 * @param {string} s 
 * @returns {*}
 */
Object.byString = function(o, s) {
  s = s.replace(/\[(\w+)\]/g, '.$1')
  s = s.replace(/^\./, '')
  let a = s.split('.')
  for (let i = 0, n = a.length; i < n; ++i) {
    let k = a[i]
    if (k in o) {
      o = o[k]
    } else {
      return
    }
  }
  return o
}


/**
 * Wraps functions into a logger that records execution-time.
 * This one is used for requests from the trakt API.
 * @param {Function} request API request
 * @returns {Promise} whatever the request resolves to
 * @memberof Modules.API
 */
function runWithTimer(request) {
  let timer = Date.now()
  return request().then(result => {
    tracer.info(`request was made in ${Date.now() - timer} ms`)
    return result
  }).catch(err => {
    tracer.error(err)
    return undefined // frontend will decide what to show instead
  })
}

/**
 * @typedef {Object} QUERY
 * @property {boolean} [overwrite] bypasses cache retrieval when true
 * @memberof Modules.API
 */

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
 * @property {Modules.API.TRAKT_IDS} [movie.ids]
 * @property {Object} [episode]
 * @property {string} [episode.title]
 * @property {number} [episode.year]
 * @property {Modules.API.TRAKT_IDS} [episode.ids]
 * @property {Object} [show]
 * @property {string} [show.title]
 * @property {number} [show.year]
 * @property {Modules.API.TRAKT_IDS} [show.ids]
 * @property {Object} [person]
 * @property {string} [person.name]
 * @property {Modules.API.TRAKT_IDS} [person.ids]
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_MOVIE_SUMMARY
 * @property {string} title
 * @property {number} year release year
 * @property {Modules.API.TRAKT_IDS} ids
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
 * @property {Modules.API.TRAKT_IDS} ids
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
 * @property {string} certification age recommendation like PG, TV-14, etc.
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_EPISODE_SUMMARY
 * @property {string} title
 * @property {number} number position of episode in its season
 * @property {number} number_abs position of episode in entire show
 * @property {number} season number of season that contains this episode
 * @property {Modules.API.TRAKT_IDS} ids
 * @property {string} overview short description of story
 * @property {string} first_aired full date of first release
 * @property {Array.<string>} available_translations list of 2-letter codes
 * @property {number} runtime duration in minutes
 * @property {number} rating float from 0–10
 * @property {number} votes count of votes
 * @property {number} comment_count comments on trakt.tv
 * @property {string} updated_at date of last change
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_SHOW_PROGRESS
 * @property {number} aired number of existing episodes
 * @property {number} completed number of watched episodes excluding multiwatches
 * @property {Array} hidden_seasons
 * @property {Array} seasons
 * @property {string} last_watched_at date of last watch
 * @property {string} reset_at of restated watching, could be null
 * @property {Modules.API.TRAKT_EPISODE_SUMMARY} last_episode last one the user watched
 * @property {Modules.API.TRAKT_EPISODE_SUMMARY} next_episode next one the user has not watched yet
 * @memberof Modules.API
 */

/**
 * @typedef {Modules.API.TRAKT_MOVIE_SUMMARY|Modules.API.TRAKT_SHOW_SUMMARY|Modules.API.TRAKT_EPISODE_SUMMARY} TRAKT_ITEM_DETAILS
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_WATCHED_SHOW
 * @property {number} plays number of played episodes, counts multiple watches
 * @property {string} last_watched_at date of last watch
 * @property {string} last_updated_at date of last interaction
 * @property {string} reset_at date of restated watching, could be null
 * @property {Array.<Modules.API.TRAKT_WATCHED_SEASON>} seasons list of seasons which contain a watched episode
 * @property {Modules.API.TRAKT_SHOW_SUMMARY} show details about the show
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_WATCHED_SEASON
 * @property {number} number season's number, starting at 1
 * @property {Array.<Modules.API.TRAKT_WATCHED_EPISODE>} episodes list of watched episodes
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_WATCHED_EPISODE
 * @property {number} number episode's number in the season, starting at 1
 * @property {number} plays number of times it was played
 * @property {string} last_watched_at date of most recent play
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_HIDDEN_SHOW
 * @property {string} hidden_at date of the user's action
 * @property {'show'} type
 * @property {Object} show
 * @property {string} show.title name of the show
 * @property {number} show.year when the show started to air
 * @property {Modules.API.TRAKT_IDS} show.ids all ID formats for this show
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_WATCHED_MOVIE
 * @property {number} plays number of time it was played
 * @property {string} last_watched_at date of last watch
 * @property {string} last_updated_at date of last interaction
 * @property {Object} movie details about the movie
 * @property {string} movie.title name of the movie
 * @property {number} movie.year year of release
 * @property {Modules.API.TRAKT_IDS} movie.ids all ID formats for this movie
 * @memberof Modules.API
 */

/**
 * @typedef {Object} FANART_IMAGE
 * @property {string} id fanart image ID
 * @property {string} lang 2-letter language code like 'en', '00' if not applicable
 * @property {string} likes number of upvotes, sign of quality
 * @property {string} url link to full-resolution image
 * @memberof Modules.API
 */

/**
 * @typedef {Object} FANART_IMAGE_SEASON
 * @property {string} id fanart image ID
 * @property {string} season number of season, might be shown on image 
 * @property {string} lang 2-letter language code like 'en', '00' if not applicable
 * @property {string} likes number of upvotes, sign of quality
 * @property {string} url link to full-resolution image
 * @memberof Modules.API
 */

/**
 * @typedef {Object} FANART_SHOW_IMAGES
 * @property {string} title
 * @property {string} thetvdb_id ID in tvdb format
 * @property {Array.<Modules.API.FANART_IMAGE>} characterart
 * @property {Array.<Modules.API.FANART_IMAGE>} hdclearart
 * @property {Array.<Modules.API.FANART_IMAGE>} hdtvlogo
 * @property {Array.<Modules.API.FANART_IMAGE_SEASON>} seasonbanner
 * @property {Array.<Modules.API.FANART_IMAGE_SEASON>} seasonposter
 * @property {Array.<Modules.API.FANART_IMAGE_SEASON>} seasonthumb
 * @property {Array.<Modules.API.FANART_IMAGE>} showbackground
 * @property {Array.<Modules.API.FANART_IMAGE>} tvbanner
 * @property {Array.<Modules.API.FANART_IMAGE>} tvposter
 * @property {Array.<Modules.API.FANART_IMAGE>} tvthumb
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_HISTORY_POST
 * @property {string|'released'} [watched_at] set to `now` if not specified
 * @property {Modules.API.TRAKT_IDS} ids at least one of them has to be given
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_RATING_POST
 * @property {string} [rated_at] set to `now` if not specified
 * @property {1|2|3|4|5|6|7|8|9|10} rating user's input
 * @property {Modules.API.TRAKT_IDS} ids at least one of them has to be given
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_POST_RESULT
 * @property {Object} added
 * @property {number} added.episodes
 * @property {number} added.movies
 * @property {Object} not_found
 * @property {Array} not_found.episodes
 * @property {Array} not_found.movies
 * @property {Array} not_found.people
 * @property {Array} not_found.seasons
 * @property {Array} not_found.shows
 * @memberof Modules.API
 */


// TODO: docs for FANART_MOVIE_IMAGES


/**
 * @memberof Modules.API
 */
class Traktor {
  /**
   * Backend side of the internal API.
   * All methods should return Promises.
   * @param {Trakt} trakt authenticated API instance of trakt.tv
   * @param {Fanart} fanart authenticated API instance of fanart.tv
   */
  constructor(trakt, fanart) {
    this.trakt = trakt
    this.fanart = fanart
  }

  /**
   * NOTE:
   * Sometimes the `query` parameter is not used within the mothods, but it will be extracted by {@link Module.API.CachedTraktor} when in use.
   */

  /**
   * Get list of methods that are available through the trakt API.
   * Forwarded by {@link Modules.Renderer.Get.available}.
   * @param {Modules.API.QUERY} [query]
   * @returns {Promise.<Array.<string>>}
   */
  availableMethods(query) {
    // has to be wrapped in a Promise to match type of the other methods
    return new Promise((res, _rej) => {
      res(Object.keys(this.trakt))
    })
  }


  /**
   * Get a summary of the user's latest activities.
   * Forwarded by {@link Modules.Renderer.Get.latest}.
   * @param {Modules.API.QUERY} [query]
   * @returns {Promise.<Modules.API.TRAKT_ACTIVITY_OBJECT>}
   */
  latestActivities(query) {
    return runWithTimer(() => this.trakt.sync.last_activities())
  }


  /**
   * Search the trakt.tv database.
   * Forwarded by {@link Modules.Renderer.Get.search}.
   * @param {Modules.API.FILTERED_EXT} query result from {@link Modules.API.formatSearch}
   * @param {boolean} [query.overwrite]
   * @returns {Promise.<Array.<Modules.API.TRAKT_SEARCH_OBJECT>>}
   */
  traktSearch(query) {
    return runWithTimer(() => this.trakt.search.text({
      type: query.type,
      query: query.filtered
    }))
  }


  /**
   * Get more details about an item from the list of search results.
   * @param {Modules.API.TRAKT_SEARCH_OBJECT} query
   * @param {boolean} [query.overwrite]
   * @returns {Promise.<Modules.API.TRAKT_ITEM_DETAILS>}
   */
  extractSearchResultDetails(query) {
    return this.itemSummary({
      type: query.type,
      id: query[query.type].ids.trakt
    })
  }


  /**
   * Get more details about an item.
   * @param {Modules.API.QUERY} query
   * @param {'movie'|'show'|'episode'|'person'} query.type
   * @param {number} query.id trakt-formatted identifier
   * @param {number} [query.season] required when `type` is episode
   * @param {number} [query.episode] required when `type` is episode
   * @returns {Promise.<Modules.API.TRAKT_ITEM_DETAILS>}
   */
  itemSummary(query) {
    // full details are always wanted
    query.extended = 'full'
    
    switch (query.type) {
      case 'movie':
        return runWithTimer(() => this.trakt.movies.summary(query))
      case 'show':
        return runWithTimer(() => this.trakt.shows.summary(query))
      case 'episode':
        return runWithTimer(() => this.trakt.episodes.summary(query))
      case 'person': // only because of this, a switch is needed
        return runWithTimer(() => this.trakt.people.summary(query))
    }
  }


  /**
   * Get a list of shows the user has hidden from his progress table.
   * Forwarded by {@link Modules.Renderer.Get.hidden}.
   * @param {Modules.API.QUERY} [query]
   * @returns {Promise.<Array.<Modules.API.TRAKT_HIDDEN_SHOW>>}
   */
  hiddenShows(query) {
    return runWithTimer(() => this.trakt.users.hidden.get({
      section: 'progress_watched',
      limit: 100 // this request is paginated (why tho?)
    }))
  }


  /**
   * Get a list of all shows the user started or finished to watch.
   * The resulting array is sorted by the parameter `last_watched_at` so that latest watches are appearing first.
   * Forwarded by {@link Modules.Renderer.Get.shows}.
   * @param {Modules.API.QUERY} [query]
   * @returns {Promise.<Array.<Modules.API.TRAKT_WATCHED_SHOW>>}
   */
  watchedShows(query) {
    return runWithTimer(() => this.trakt.sync.watched({
      type: 'shows',
      extended: 'full'
    }))
  }


  /**
   * Get a detailed structure of which parts of a show the user has watched and which are still up to be watched.
   * Forwarded by {@link Modules.Renderer.Get.progress}.
   * @param {Modules.API.QUERY} query
   * @param {number} query.id identifier of the show in trakt format
   * @returns {Promise.<Array.<Modules.API.TRAKT_SHOW_PROGRESS>>}
   */
  showProgress(query) {
    return runWithTimer(() => this.trakt.shows.progress.watched({
      id: query.id,
      extended: 'full'
    }))
  }


  /**
   * Get a list of movies the user has watched at least once.
   * Forwarded by {@link Modules.Renderer.Get.movies}.
   * @param {Modules.API.QUERY} [query]
   * @returns {Promise.<Array.<Modules.API.TRAKT_WATCHED_MOVIE>>}
   */
  watchedMovies(query) {
    return runWithTimer(() => this.trakt.sync.watched({
      type: 'movies'
    }))
  }


  /**
   * Get a list of images available for a show.
   * @param {Modules.API.QUERY} query
   * @param {number} query.id identifier in TVDB format
   * @returns {Promise}
   */
  showImages(query) {
    return runWithTimer(() => this.fanart.shows.get(query.id))
  }

  /**
   * Get a list of images available for a movie.
   * @param {Modules.API.QUERY} query
   * @param {number} query.id identifier in TVDB format
   * @returns {Promise}
   */
  movieImages(query) {
    return runWithTimer(() => this.fanart.movies.get(query.id))
  }


  /**
   * Execute any API method even when it is not included in {@link Modules.API.Traktor} yet.
   * @param {Modules.API.QUERY} query
   * @param {string} query.path method.path.like.this
   * @param {Object} query.args anything that would be passed to the method
   * @returns {Promise}
   */
  execRequest(query) {
    tracer.warn(query)
    return runWithTimer(() => Object.byString(this, query.path)?.(query.args))
  }


  /**
   * Post history updates to trakt.tv.
   * @param {Modules.API.QUERY} query
   * @param {Object} query.changes list of objects with updates
   * @returns {Promise.<Modules.API.TRAKT_POST_RESULT>}
   */
  postHistory(query) {
    return runWithTimer(() => this.trakt.sync.history.add(query.changes))
  }


  /**
   * 
   * @param {Modules.API.QUERY} query
   * @param {Object} query.changes
   * @returns {Promise.<Modules.API.TRAKT_POST_RESULT}
   */
  postRating(query) {
    return runWithTimer(() => this.trakt.sync.ratings.add(query.changes))
  }
}


/**
 * @memberof Modules.API
 */
class CachedTraktor extends Traktor {
  /**
   * A cached version of the class {@link Modules.API.Traktor} which looks for content saved in cache which could be served instead of doing the actual API request.
   * @param {Trakt} trakt authenticated API instance of trakt.tv
   * @param {Fanart} fanart authenticated API instance of fanart.tv
   */
  constructor(trakt, fanart) {
    super(trakt, fanart)

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
          return ({ overwrite, ...query } = {}) => {
            return obj.cacheware(prop, query, overwrite)
          }
        })()
    })
  }

  
  /**
   * This middleware wraps the original get-methods into {@link Modules.Manager.Cache}'s `retrieval` method.
   * @param {string} prop method's name which to execute from super
   * @param {Object} args whatever should be passed to that method
   * @param {boolean} [overwrite] whether to request without checking cache before
   * @returns {Promise.<*>} whatever the original method would return
   */
  cacheware(prop, args, overwrite) {
    // this is executed when no valid cache content was found
    const parent = () => this[prop]?.(args)

    // stringify arguments so each configuration can be cached individually
    const cacheKey = JSON.stringify(args)

    return new Promise((resolve, _rej) => {
      if (overwrite) {
        this.cache[prop].removeKey(cacheKey)
      }

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
