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

const BASE_PATH = process.env.BASE_PATH


/**
 * Ask for the electron app to build its windows when ready.
 * This should be called only once at launch.
 * @memberof Modules.App
 * @param {Function} onReady fires when {@link buildWindow} has reported readiness
 */
function startApp(onReady) {
  // build the app when it's ready
  app.on('ready', () => {
    buildWindow(onReady)
  })

  // this quits the whole app
  app.on('window-all-closed', () => {
    app.quit()
  })
}


const mainWindowOptions = {
  width: 900,
  height: 750,
  useContentSize: true,
  titleBarStyle: 'hidden',
  backgroundColor: '#242424',
  title: 'Traktify',
  show: false,
  center: true,
  webPreferences: {
    experimentalFeatures: true
  }
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
  webPreferences: {
    experimentalFeatures: true
  }
}


/**
 * Creates the app's windows on startup and initialises their listeners.
 * Used by {@link startApp}.
 * @memberof Modules.App
 * @param {Function} onReady fires when loading-window has shown up
 */
function buildWindow(onReady) {
  /**
   * Traktify's main window.
   * @type {electron.BrowserWindow} 
   * @memberof Modules.App
   */
  let mainWindow = new BrowserWindow(mainWindowOptions)

  /**
   * Loading window that shows before the main window becomes visible.
   * @type {electron.BrowserWindow} 
   * @memberof Modules.App
   */
  let loadingWindow = new BrowserWindow(loadingWindowOptions)
  loadingWindow.show()
  loadingWindow.once('show', onReady) // report that the window is visible

  loadingWindow.loadFile(path.join(BASE_PATH, 'pages/loading/index.html'))

  // setTimeout(() => {
  //   loadingWindow.close()
  //   mainWindow.show()
  // }, 2e3)


  // listeners for the app windows,
  // have to be added to both the main and the loading window because
  // the user could quit or unfocus the app while it is still loading
  loadingWindow.on('closed', () => {
    loadingWindow = null
  })

  loadingWindow.on('restore', () => {
    loadingWindow.focus()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('restore', () => {
    mainWindow.focus()
  })
}


module.exports = {
  startApp
}
