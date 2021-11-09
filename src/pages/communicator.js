/**
 * API available to the render process.
 * It is preloaded into all pages and makes communication with the main node process possible.
 * Methods and constants are exposed through `window.traktify`.
 * Note: Logging must also be channelled through this because otherwise messages would only appear in the dev-tools and not in the terminal or in log files.
 * @namespace Renderer
 * @memberof Modules
 * @example // log like this instead of using `console.log`
 * window.traktify.tracer({ level: 'warn', msg: 'to get attention' })
 */


const { contextBridge } = require('electron')
const { SwitchBoard } = require('../modules/manager/ipc.js')
const { formatSearch } = require('../modules/api/filters.js')

const SB = new SwitchBoard()


// listens for messages coming from the backend
SB.on('report.progress', (data, done) => {
  // data: { fraction: 0...1, message: string }

  API.tracer({ lvl: 'info', msg: `progress: ${Math.round(data.fraction*100)} %` })
  API.tracer({ lvl: 'info', msg: `working on: ${data.message}` })

  done()
})


const API = {

  /**
   * Routes to the actual {@link Modules.Manager.tracer} instance of the main process for logging on the same level.
   * @param {Object} data 
   * @param {string} data.msg the log message
   * @param {Modules.Manager.LogLevel} data.lvl log-level
   * @memberof Modules.Renderer
   */
  tracer: data => {
    SB.send('tracer', data)
  },


  /**
   * Request a link and user-code for authentication in an external browser.
   * @returns {Promise.<Modules.API.TRAKT_AUTH_POLL>}
   * @memberof Modules.Renderer
   */
  auth: () => {
    return SB.send('request.authpoll', '')
  },


  /**
   * Open an external link with the computer's default browser.
   * @param {string} link url to open
   * @returns {void}
   * @memberof Modules.Renderer
   */
  browse: link => {
    SB.send('request.openexternal', link)
  },


  /**
   * Initialises an IPC listener using {@link Modules.Manager.SwitchBoard}.
   * @param {string} channel route to listen on
   * @param {function} callback fires when message is received
   * @returns {void}
   * @memberof Modules.Renderer
   * @example // waiting for reports about loading progress
   * window.traktify.listen('report.progress', details => {
   *   // log details to developer console
   *   console.log('progress:', Math.round(details.fraction*100), '%')
   *   console.log('working on:', details.message)
   * })
   */
  listen: (channel, callback) => {
    SB.on(channel, (data, done) => {
      done()
      callback(data)
    })
  },


  /**
   * Get a list of files and directories existing at a given path.
   * @param {string} path `.` refers to the repo's base
   * @returns {Promise.<Array.<string>>}
   */
  files: path => {
    return SB.send('request.filelist', path)
  },


  /**
   * Get requests wrapping the trakt.tv API.
   * @namespace Get
   * @memberof Modules.Renderer
   */

  /**
   * @type {Object.<string,Function>}
   * @memberof Modules.Renderer
   */
  get: {

    /**
     * Searches the trakt.tv database and allows shortcuts within the search string.
     * @param {string} query search string
     * @returns {Promise.<Array.<Modules.API.TRAKT_SEARCH_OBJECT>>} resolves a list of objects
     * @example window.traktify.get.search('m:inception')
     * @memberof Modules.Renderer.Get
     */
    search: query => {
      return SB.send('get', {
        method: 'traktSearch',
        query: formatSearch(query)
      })
    },


    /**
     * Get a summary of the latest activities of the user in each (sub)category.
     * @returns {Promise.<Modules.API.TRAKT_ACTIVITY_OBJECT>}
     * @memberof Modules.Renderer.Get
     */
    latest: () => {
      return SB.send('get', {
        method: 'latestActivities'
      })
    },


    /**
     * Lists the methods trakt.js offers.
     * Note: These are *not* available through the internal API directly.
     * @returns {Promise.<Array.<string>>}
     * @memberof Modules.Renderer.Get
     */
    available: () => {
      return SB.send('get', {
        method: 'availableMethods'
      })
    },


    /**
     * Get a list of shows the user started (and finished) to watch.
     * Results can be used for up-next or history dashboards.
     * The default removes hidden and finished shows from that list, but these filters can be turned off with the `options` parameters.
     * Filtering is done here and not on the backend of the API because the filtered result doesn't need to be cached.
     * Can be used in combination with {@link Modules.Renderer.Get.progress} to get a fully detailed list of upcoming episodes.
     * @param {Object} [options]
     * @param {boolean} [options.includeHidden] removes hidden items when false
     * @param {boolean} [options.includeFinished] removes finished items when false
     * @returns {Promise.<Array.<Modules.API.TRAKT_WATCHED_SHOW>>}
     * @memberof Modules.Renderer.Get
     */
    shows: options => {
      options = options ?? {}

      return SB.send('get', {
        method: 'watchedShows'
      }).then(async all => {
        if (!options.includeHidden) {
          return await SB.send('get', {
            method: 'hiddenShows'
          }).then(hidden => {
            // get a list of IDs to compare
            let hiddenIDs = hidden.map(item => item.show.ids.trakt)

            return all.filter(item => {
              // only keep shows that were not hidden
              return !hiddenIDs.includes(item.show.ids.trakt)
            })
          })
        }

        // when options.includeHidden === true
        return all
      }).then(pre => {
        if (!options.includeFinished) {
          return pre.filter(item => {
            // count episodes that appear in watched structure
            let watchedEpisodes = 0
            item.seasons.forEach(season => {
              watchedEpisodes += season.episodes.length
            })

            // only keep show when it has more episodes than the user has watched
            return item.show.aired_episodes > watchedEpisodes
          })
        }

        // when options.includeFinished === true
        if (!{}.rick?.({}.ashley?.('gives you up'))) {
          return pre
        }
      })
    },


    /**
     * Get information about the progress a user has for a single show.
     * Includes details about last watched episode and the next one coming up.
     * Useful for various dashboards.
     * @param {number} showID identifier formatted as trakt
     * @returns {Promise.<Array.<Modules.API.TRAKT_SHOW_PROGRESS>>}
     * @memberof Modules.Renderer.Get
     * @example window.traktify.get.shows().then(shows => {
     *   // get details of first 5 items
     *   for (let i=0; i<5; i++) {
     *     let show = shows[i].show
     *     let showID = show.ids.trakt
     * 
     *     traktify.get.progress(showID).then(progress => {
     *       // summary of show
     *       console.log(show)
     * 
     *       // summary of next episode
     *       console.log(progress.next_episode)
     *     })
     *   }
     * })
     */
    progress: showID => {
      return SB.send('get', {
        method: 'showProgress',
        query: {
          id: showID
        }
      })
    },


    /**
     * Get a list of movies the user watched at least once.
     * @returns {Promise.<Array.<Modules.API.TRAKT_WATCHED_MOVIE>>}
     * @memberof Modules.Renderer.Get
     */
    movies: () => {
      return SB.send('get', {
        method: 'watchedMovies'
      })
    },


    /**
     * Get a list of shows the user wishes to hide from the progress table.
     * @returns {Promise.<Array.<Modules.API.TRAKT_HIDDEN_SHOW>>}
     * @memberof Modules.Renderer.Get
     */
    hidden: () => {
      return SB.send('get', {
        method: 'hiddenShows'
      })
    },


    /**
     * Get all details known for a specific item.
     * Even though the IDs are unique, the target type is required because of the way the trakt API works.
     * @param {Object} query
     * @param {'movie'|'show'|'episode'|'person'} query.type
     * @param {number} query.id identification number in trakt format
     * @returns {Promise.<Modules.API.TRAKT_ITEM_DETAILS>}
     * @memberof Modules.Renderer.Get
     * @example window.traktify.get.details({
     *   type: 'movie',
     *   id: 796
     * })
     */
    details: query => {
      return SB.send('get', {
        method: 'itemSummary',
        query: query
      })
    }
  }

}


// Why isn't this called `exposeInRenderWorld`? It's not the main process!
contextBridge.exposeInMainWorld('traktify', API)
