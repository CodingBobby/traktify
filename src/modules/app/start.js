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
    buildLoadingWindow(onReady)
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

const loadingWindowOptions = {
  width: 200,
  height: 200,
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
function buildLoadingWindow(onReady) {
  /**
   * Loading window that shows before the main window becomes visible.
   * @type {electron.BrowserWindow} 
   * @memberof Modules.App
   */
  let loadingWindow = new BrowserWindow(loadingWindowOptions)

  onReady(loadingWindow)


  // listeners for the app windows
  loadingWindow.on('closed', () => {
    loadingWindow = null
  })

  loadingWindow.on('restore', () => {
    loadingWindow.focus()
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


module.exports = {
  startApp, loadPage
}
