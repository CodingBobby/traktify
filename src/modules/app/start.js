// import electron.js modules
const electron = require('electron')
const {
  app,
  BrowserWindow,
  Menu,
  shell,
  clipboard,
  dialog,
  ipcMain
} = electron

const path = require('path')
const tracer = require('../manager/log.js')
const Cache = require('../manager/cache.js')
const { Traktor } = require('../api/getters.js')

const BASE_PATH = process.env.BASE_PATH


/**
 * Callback that is fired when window is ready.
 * @typedef {Function} WindowIsReady
 * @param {electron.BrowserWindow} window app window which is ready now
 * @memberof Modules.App
 */


/**
 * Ask for the electron app to build its windows when ready.
 * This should be called only once at launch.
 * @memberof Modules.App
 * @param {WindowIsReady} onReady fires when {@link buildWindow} has reported readiness
 */
function startApp(onReady) {
  // build the app when it's ready
  app.once('ready', () => {
    buildAppWindow(onReady)
  })

  // this quits the whole app
  app.once('window-all-closed', () => {
    app.quit()
  })
}


const webPreferences = {
  // required for some visual features like css-webkit
  experimentalFeatures: true,
  // as advised by electron's security guidelines
  preload: path.join(BASE_PATH, 'pages/communicator.js'),
  nodeIntegration: false,
  enableRemoteModule: false,
  contextIsolation: true
}

const windowOptions = {
  minWidth: 800,
  minHeight: 500,
  width: 900,
  height: 650,
  useContentSize: true,
  titleBarStyle: 'hidden',
  backgroundColor: '#242424',
  title: 'Traktify',
  show: false,
  center: true,
  webPreferences
}


/**
 * Creates the app's windows on startup and initialises their listeners.
 * Used by {@link startApp}.
 * @memberof Modules.App
 * @param {WindowIsReady} onReady fires when loading-window has shown up
 */
function buildAppWindow(onReady) {
  /**
   * Loading window that shows before the main window becomes visible.
   * @type {electron.BrowserWindow} 
   * @memberof Modules.App
   */
  let appWindow = new BrowserWindow(windowOptions)

  onReady(appWindow)


  // listeners for the app windows
  appWindow.on('closed', () => {
    appWindow = null
  })

  appWindow.on('restore', () => {
    appWindow.focus()
  })
}


/**
 * Open a specific page (file) and wait until the content is fully loaded.
 * @param {Object} options 
 * @param {electron.BrowserWindow} options.window the window to load content in
 * @param {string} options.page name of the page to load (folder in {@link src/pages/})
 * @param {Function} onLoad
 * @memberof Modules.App
 */
function loadPage(options, onLoad) {
  options.window.loadFile(path.join(BASE_PATH, `pages/${options.page}/index.html`))

  options.window.webContents.once('did-finish-load', () => {
    options.window.show()

    // report that the window is visible
    tracer.log('window is ready')
    onLoad()
  })
}



/**
 * Procedure that requests user specific content from trakt.tv.
 * Within this function, it is only checked if new updates are available to request -- if not, all data is already saved in cache.
 * If API requests are needed, {@link requestUpdateDetails} is called.
 * A callback is fired when the app can proceed and load the main page.
 * @param {Trakt} trakt fully authenticated instance
 * @param {Modules.Manager.SwitchBoard} SB communicator for progress reporting
 * @param {function} done fires when all loading requests are done
 */
function userLoading(trakt, SB, done) {
  const steps = 5 // required loading steps
  SB.send('report.progress', 0/steps)

  // trakt.tv requests can now be done for loading
  let syncingCache = new Cache('syncing')

  let traktor = new Traktor(trakt)

  traktor.latestActivities().then(latest => {
    SB.send('report.progress', 1/steps)

    syncingCache.retrieve('latestActivities', setKey => {
      SB.send('report.progress', 2/steps)

      // cache is empty
      setKey(latest)
      syncingCache.save()
      requestUpdateDetails(['movies', 'episodes', 'shows', 'seasons', 'comments', 'lists'], traktor, SB, done)

    }, (cacheContent, updateKey) => {
      SB.send('report.progress', 2/steps)

      if (latest.all === cacheContent.all) {
        // nothing new happened
        tracer.log('no new activities')
        
        // instead of requesting details, we can proceed here
        done()

      } else {
        // filter what exactly has new activities
        let updates = []
        for (let scope in cacheContent) {
          if (scope !== 'all') {
            for (let action in cacheContent[scope]) {
              let dateOld = cacheContent[scope][action]
              let dateNew = latest[scope][action]

              if (dateNew !== dateOld) {
                updates.push(scope)
                tracer.log(`new activity: ${action+' @ '+scope}`)
              }
            }
          }
        }

        // save activities for next time
        updateKey(latest)
        syncingCache.save()
        requestUpdateDetails(updates, traktor, SB, done)
      }
    })
  })
}


/**
 * 
 * @param {Array.<'movies'|'episodes'|'shows'|'seasons'|'comments'|'lists'>} scopes list of scopes which need to be requested
 * @param {Modules.API.Traktor} traktor authenticated API instance
 * @param {Modules.Manager.SwitchBoard} SB communicator for progress reporting
 * @param {function} done fires when all requests are done
 */
function requestUpdateDetails(scopes, traktor, SB, done) {
  SB.send('report.progress', 3/steps)

  // now request only the new activities
  tracer.info(`continueing with [${scopes}]`)

  if (scopes.includes('episodes')) {
    // if the user watched new episodes, the up-next-to-watch must update

    
  }

  done()
}


module.exports = {
  startApp, loadPage, userLoading
}
