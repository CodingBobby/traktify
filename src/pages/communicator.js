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
     * @callback WatchedShowCallback
     * @param {Modules.API.TRAKT_SHOW_SUMMARY} showSummary
     * @returns {*} doesn't have to return anything
     */

    /**
     * @callback WatchedShowFilter
     * @param {Object} watchedShow
     * @param {Modules.API.TRAKT_WATCHED_SHOW} watchedShow.user
     * @param {Modules.API.TRAKT_SHOW_SUMMARY} watchedShow.details
     * @returns {boolean} whether the item should be kept or not
     */

    /**
     * @callback WatchedShowDone
     * @param {Array.<Modules.API.TRAKT_SHOW_SUMMARY>} showSummaries
     * @returns {*} doesn't have to return anything
     */

    /**
     * Get a list of shows the user started (and finished) to watch.
     * Results can be used for up-next or history dashboards.
     * The default removes hidden items from that list, but this filter can be turned off with `options.includeHidden`.
     * With `options.getDetails`, it's possible to get the trakt summary for the results directly.
     * As this will require an additional request for each item, the number should be limited with `options.getDetails.firstN`.
     * For each finishing summary request, `options.getDetails.callback` will fire with the result passed through its parameter.
     * During this procedure, `options.getDetails.filter` is optionally applied so that the items for which the summary is returned matches specific conditions that can be defined customly.
     * With and without filtering, `options.getDetails.firstN`-many items will be returned unless the user has watched fewer items that match.
     * @param {Object} [options]
     * @param {boolean} [options.includeHidden] removes hidden items when false
     * @param {Object} [options.getDetails]
     * @param {number} options.getDetails.firstN get details for n elements
     * @param {WatchedShowCallback} options.getDetails.callback fires each time details are ready
     * @param {WatchedShowFilter} [options.getDetails.filter] applied to each item
     * @param {WatchedShowDone} [options.getDetails.done] fires when search has finished
     * @returns {Promise.<Array.<Modules.API.TRAKT_WATCHED_SHOW>>}
     * @memberof Modules.Renderer.Get
     */
    shows: options => {
      options = options ?? {}
      let result;

      if (options.includeHidden) {
        result = SB.send('get', {
          method: 'watchedShows'
        })
        
      } else {
        result = Promise.all([
          SB.send('get', {
            method: 'watchedShows'
          }),
          SB.send('get', {
            method: 'hiddenShows'
          })
        ]).then(([all, hidden]) => {
          let hiddenIDs = hidden.map(item => item.show.ids.trakt)

          return all.filter(item => {
            // only keep shows that were not hidden
            return !hiddenIDs.includes(item.show.ids.trakt)
          })
        })
      }

      if (options.getDetails !== undefined) {
        result.then(list => {
          // use dummy filter if none was specified
          let filter = options.getDetails.filter
            ? options.getDetails.filter
            : _ => true // does nothing
          
          /**
           * @param {number} n index in total list
           * @param {number} m index in matching list
           * @param {Array} found list of items that match so far
           * @returns {Array} the list of all found items
           */
          async function looper(n, m, found) {
            let item = list[n]
            let details = await SB.send('get', {
              method: 'itemSummary',
              query: { type: 'show', id: item.show.ids.trakt }
            })
            
            n++
            if (filter({
              user: item,
              details: details
            })) {
              // report item so that it can be used without waiting for the rest
              options.getDetails.callback(details)
              // save it for the final return value
              found.push(details)
              m++
            }

            if (n < list.length && m < options.getDetails.firstN) {
              // look for next item
              looper(n, m, found)
            } else {
              // all items that match filter have been found
              options.getDetails.done(found)
              return found
            }
          }

          // find items that match filter
          return looper(0, 0, [])
        })
      }

      return result // still a Promise after the .thens


      /**
       * This nullish check returns undefined only when both parameters are missing.
       * Otherwise it returns the smallest of both numbers, which means one or both of them were set to a value.
       */
      // if (options.minRating ?? options.maxRating !== undefined) {
      //   result.then(items => {
      //     return items.filter(item => {
      //       // only keep shows that lie within the bounds
      //       let above = item.rating >= options.minRating
      //       let below = item.rating <= options.maxRating
      //       return above && below
      //     })
      //   })
      // }
    },


    /**
     * 
     * @param {*} showID 
     * @returns {Promise}
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
