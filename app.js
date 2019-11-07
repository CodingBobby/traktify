/*\
|*|   TRAKTIFY
|*|   is a desktop app for trakt.tv
|*|   created by @CodingBobby and @Bumbleboss in 2019
|*|   using the trakt api with the trakt.js library
|*|   in an electron framework,
|*|   the current version is 0.1.1
|*|   from the 21th Feb. 2019
\*/

// Uncomment this line for publishing!
// process.env.NODE_ENV = 'production'

let initTime = Date.now()

// electron stuff
const electron = require('electron')
const windowStateKeeper = require('electron-window-state')
const {
  app,
  BrowserWindow,
  Menu,
  shell,
  clipboard,
  dialog,
  ipcMain
} = electron

// file stuff
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

// api stuff
const Trakt = require('trakt.tv')
const Fanart = require('fanart.tv')
const TvDB = require('node-tvdb')
const TmDB = require('moviedb-promise')

// request stuff
const request = require('request')

const {
  debugLog, inRange, shadeHexColor, clone, ipcChannels
} = require('./modules/helper.js')
global.debugLog = debugLog


// important checks regarding required files
let fatalError = false

fs.exists('./config.json', ex => {
  if(!ex) {
    debugLog('error', 'config does not exist', new Error().stack)
    fatalError = true
  }
})

if(process.env.trakt_id == undefined) envErr()
if(process.env.trakt_secret == undefined) envErr()
if(process.env.fanart_key == undefined) envErr()
if(process.env.tmdb_key == undefined) envErr()
if(process.env.tvdb_key == undefined) envErr()
if(process.env.discord_key == undefined) envErr()

function envErr() {
  debugLog('error', 'one or more env vars do not exist', new Error().stack)
  fatalError = true
}


// configuration and boolean checks that we need frequently
// the config file will be used to save preferences the user can change
// (like darkmode, behavior etc.)
global.config = JSON.parse(fs.readFileSync("./config.json", "utf8"))
let user = global.config.user

// defining global variables that can be accessed from other scripts
global.openExternal = shell.openExternal
global.darwin = process.platform == 'darwin'

// Comment out these lines when in production! Used as helpers to move around the app from the command line.
global.loadDashboard = loadDashboard
global.loadLogin = loadLogin

// these are the api globals
global.trakt
global.fanart
global.tvdb
global.tmdb

let window = null

const traktOptions = {
  client_id: process.env.trakt_id,
  client_secret: process.env.trakt_secret
}

if(process.env.NODE_ENV !== 'production') {
  traktOptions.debug = true
}

// here we set some options we need later
const windowOptions = {
  minWidth: 800,
  minHeight: 500,
  width: 900,
  height: 750,
  useContentSize: true,
  titleBarStyle: 'hidden',
  backgroundColor: '#242424',
  title: 'Traktify',
  icon: global.darwin ? path.join(__dirname, 'assets/icons/trakt/trakt.icns')
    : path.join(__dirname, 'assets/icons/trakt/tract.ico'),
  show: false,
  center: true,
  webPreferences: {
    experimentalFeatures: true
  }
}

// here we create a template for the main menu, to get the right shortcut, we check if we're running on darwin
let menuTemplate = [{
  label: 'App',
  submenu: [{
    label: 'About',
    click() {
      shell.openExternal('https://github.com/CodingBobby/traktify')
    }
  }, {
    label: 'Quit Traktify',
    accelerator: global.darwin ? 'Command+Q'
      : 'Ctrl+Q',
    click() {
      app.quit()
    }
  }, {
    type: 'separator'
  }, {
    label: 'Reset Traktify',
    click() {
      dialog.showMessageBox({
        type: 'question',
        title: 'Reset Traktify',
        message: 'Are you sure? This removes all data from Traktify and you have to login again.',
        buttons: ['alright', 'hell no'],
        defaultId: 1,
        normalizeAccessKeys: false
      }, button => {
        if(button == 0) {
          resetTraktify(true)
        }
      })
    }
  }]
}]

// if the app is in development mode, these menu items will be pushed to the menu template
if(process.env.NODE_ENV !== 'production') {
  menuTemplate.push({
    label: 'Dev Tools',
    submenu: [{
      label: 'Toggle Dev Tools',
      accelerator: global.darwin ? 'Command+I'
        : 'Ctrl+I',
      click(item, focusedWindow){
        focusedWindow.toggleDevTools()
      }
    }, {
      label: 'Reload App',
      accelerator: global.darwin ? 'Command+R'
        : 'Ctrl+R',
      role: 'reload'
    }]
  })
}

const mainMenu = Menu.buildFromTemplate(menuTemplate)

// This function builds the app window, shows the correct page and handles window.on() events
function build() {
  if(fatalError) {
    return process.crash()
  }

  debugLog('app', 'now building')
  let mainWindowState = windowStateKeeper({
    defaultWidth: 900,
    defaultHeight: 750
  })

  let settings = getSettings('app')

  if(settings['keep window state'].status) {
    debugLog('app', 'keeping window state changes')
    windowOptions.x = mainWindowState.x
    windowOptions.y = mainWindowState.y
    windowOptions.width = mainWindowState.width
    windowOptions.height = mainWindowState.height
  }

  if(settings['discord rpc'].status) {
    debugLog('app', 'discord rpc enabled')
  }

  window = new BrowserWindow(windowOptions)
  Menu.setApplicationMenu(mainMenu)

  if(getSettings('app')['keep window state'].status) {
    mainWindowState.manage(window)
  }

  // These now try to connect to the APIs we are using
  try {
    debugLog('api', 'creating trakt instance')
    global.trakt = new Trakt(traktOptions)
  } catch(err) {
    debugLog('error', 'trakt authentication', new Error().stack)
  }

  try {
    debugLog('api', 'creating fanart instance')
    global.fanart = new Fanart(process.env.fanart_key)
  } catch(err) {
    debugLog('error', 'fanart authentication', new Error().stack)
  }

  try {
    debugLog('api', 'creating tvdb instance')
    global.tvdb = new TvDB(process.env.tvdb_key)
  } catch(err) {
    debugLog('error', 'tvdb authentication', new Error().stack)
  }

  try {
    debugLog('api', 'creating tmdb instance')
    global.tmdb = new TmDB(process.env.tmdb_key)
  } catch(err) {
    debugLog('error', 'tmdb authentication', new Error().stack)
  }


  // show the window when the page is built
  window.once('ready-to-show', () => {
    debugLog('window', 'ready')
    window.show()
  })

  debugLog('init time', (Date.now() - initTime)+'ms')
  
  // Now we launch the app renderer
  launchApp()


  // EVENTS

  // if the window gets closed, the app will quit
  window.on('closed', () => {
    debugLog('window', 'closed')
    win = null
  })

	window.on('restore', () => {
    debugLog('window', 'restored')
		window.focus()
  })
}

// here we finally build the app
app.on('ready', build)

// this quits the whole app
app.on('window-all-closed', () => {
  debugLog('app', 'now closing')
	app.quit()
})


// This launcher checks if the user is possibly logged in already. If so, we try to login with the existing credentials. If not, we go directly to the login screen.
function launchApp() {
  if(user.trakt.auth) {
    debugLog('login', 'connecting existing user to trakt')
    tryLogin()
  } else {
    debugLog('login', 'no user found')
    loadLogin()
  }
}

function tryLogin() {
  loadLoadingScreen()

  // wait until loading screen is fully loaded
  ipcMain.once('loading-screen', (event, data) => {
    if(data === 'loaded') {
      debugLog('loading', 'can start now')

      global.trakt.import_token(user.trakt.auth).then(() => {
        global.trakt.refresh_token(user.trakt.auth).then(async newAuth => {
          user.trakt.auth = newAuth
          user.trakt.status = true
          saveConfig()
          debugLog('login', 'success')
    
          // track user stats for traktify analytics
          let userSettings = await trakt.users.settings().then(res => res)
          request(`https://traktify-server.herokuapp.com/stats?username=${userSettings.user.username}`, {
            json: true
          }, (err, res, body) => {
            debugLog('user authentications', body.data.requests)
          })
    

          event.returnValue = 'start'

          // After loadingHandler is finished with everything, the dashboard is opened
          loadingHandler().then(() => {
            loadDashboard()
          })
        }).catch(err => {
          if(err) {
            user.trakt.auth = false
            user.trakt.status = false
            saveConfig()
            debugLog('login failed', err)
            deleteCacheFolder()
            loadLogin()
          }
        })
      })
    }
  })
}

function authenticate() {
  return global.trakt.get_codes().then(poll => {
    clipboard.writeText(poll.user_code) // give the user the code
    global.codeToClipboard = function codeToClipboard() {
      // provides the user the option to get the code again
      clipboard.writeText(poll.user_code)
    }
    shell.openExternal(poll.verification_url)

    return global.trakt.poll_access(poll)
  }).then(auth => {
    debugLog('login', 'trakt user signed in')
    global.trakt.import_token(auth)

    user.trakt.auth = auth
    user.trakt.status = true
    saveConfig()

    // going back to the app and heading into dashboard
    window.focus()
    tryLogin() // confirm login credentials for extra safety and start loading

    return true
  }).catch(err => {
    // The failing login probably won't happen because the trakt login page would already throw the error. This exist just as a fallback.
    if(err) {
      debugLog('error', 'login failed')
      user.trakt.auth = false
      user.trakt.status = false
      saveConfig()

      window.focus()
      loadLogin()
    }
  })
}
global.authenticate = authenticate

function disconnect() {
  global.trakt.revoke_token()
  user.trakt.auth = false
  user.trakt.status = false
  defaultAll('app')
  saveConfig()
  deleteCacheFolder()
  loadLogin()
}
global.disconnect = disconnect

function deleteCacheFolder() {
  fs.exists('./.cache', ex => {
    if(ex) {
      rimraf('./.cache', () => {
        debugLog('cache', 'removed all files')
      })
    } else {
      debugLog('cache', 'not available')
    }
  })
}

// These functions do nothing but load a render page
function loadLogin() {
  window.loadFile('pages/login/index.html')
}
function loadDashboard() {
  window.loadFile('pages/dashboard/index.html')
}
function loadLoadingScreen() {
  window.loadFile('pages/loading/index.html')
}

function loadingHandler() {
  let loadingTime = Date.now()
  
  return new Promise((resolve, reject) => {
    // waiting for the loading to be done
    ipcMain.once('loading-screen', (event, data) => {
      if(data === 'done') {
        debugLog('loading time', Date.now()-loadingTime+'ms')
        resolve()
      }
    })
  })
}

// this function can be called to save changes in the config file
function saveConfig() {
  fs.writeFile("./config.json", JSON.stringify(global.config), err => {
    if(err) console.error(err)
  })
}

// Hard reset the app, deletes user accounts.
function resetTraktify(removeLogin) {
  let userTemp = false
  if(removeLogin) {
    disconnect()
  } else {
    userTemp = clone(user)
  }
  global.config = JSON.parse(fs.readFileSync("./def_config.json", "utf8"))
  if(userTemp) {
    global.config.user = userTemp
  }
  saveConfig()
}


// The getSetting and setSetting functions are used by the settings panel to get and apply custom settings. defaultAll can reset these settings by replacing the current ones with those from the default file def_config.json
function getSettings(scope) {
  let settings = global.config.client.settings
  if(settings.hasOwnProperty(scope)) {
    return settings[scope]
  } else {
    console.error('Invalid scope at getSetting()')
  }
}
global.getSettings = getSettings

function setSetting(scope, settingOption, newStatus) {
  let settings = global.config.client.settings[scope]
  let setting = settings[settingOption]

  if(newStatus == 'default') {
    setting.status = setting.default
  } else {
    switch(setting.type) {
      case 'select': {
        if(setting.options.hasOwnProperty(newStatus)) {
          setting.status = newStatus
        }
        break
      }
      case 'range': {
        if(inRange(newStatus, setting.range)) {
          setting.status = newStatus
        }
        break
      }
      case 'toggle': {
        if(typeof newStatus == 'boolean') {
          setting.status = newStatus
        }
        break
      }
      default: { break }
    }
  }

  saveConfig()
}
global.setSetting = setSetting

function defaultAll(scope) {
  let settings = getSettings(scope)
  for(let s in settings) {
    setSetting(scope, s, 'default')
  }
}
global.defaultAll = defaultAll


// This applies the saved settings to the master css file. The currently loaded HTML must handle the incoming message via the proper IPC helpers.
function updateApp() {
  let settings = getSettings('app')
  for(let s in settings) {
    debugLog('updating setting', s)
    let setting = settings[s]
    // these are only the settings that can be changed in realtime
    switch(s) {
      case 'accent color': {
        let value = setting.options[setting.status].value
        window.webContents.send('modify-root', {
          name: '--accent_color',
          value: value
        })

        let value_dark = shadeHexColor(value, -20)
        window.webContents.send('modify-root', {
          name: '--accent_color_d',
          value: value_dark
        })

        break
      }
      case 'background image': {
        let value = setting.options[setting.status].value
        window.webContents.send('modify-root', {
          name: '--background_image',
          value: `url('./${value}')`
        })
        break
      }
      case 'background opacity': {
        let value = setting.status
        window.webContents.send('modify-root', {
          name: '--background_opacity',
          value: value/100
        })
        break
      }
      default: { break }
    }
  }
}
global.updateApp = updateApp

// Quits the app and reopens it automatically. This is used to apply settings which would interfer with this this app.js file.
function relaunchApp() {
  app.relaunch()
  app.quit(0)
}
global.relaunchApp = relaunchApp


//:::: CACHE Listener ::::\\
const Cache = require('./modules/cache.js')
const Queue = new(require('./modules/queue.js'))

let keyList = {}

// Instead of directly saving the cache within the request module right after changes were made, we put the saving action into a queue and also filter them to only run once each cycle.
ipcMain.on('cache', (event, details) => {
  /** details:
   *    name,
   *    action,
   *    ?data,
   *    ?key
   */
  switch(details.action) {
    case 'save': {
      Queue.add(function() {
        const cache = new Cache(details.name)
        cache.save()
      }, { overwrite: true })
      break
    }

    case 'addKey': {
      if(!keyList.hasOwnProperty(details.name)) {
        // list wasn't used yet
        keyList[details.name] = {}
      }
      keyList[details.name][details.key] = details.data
      break
    }

    case 'saveKeys': {
      const cache = new Cache(details.name)
      if(!keyList.hasOwnProperty(details.name)) {
        // nothing was saved in the keylist
        debugLog('!caching', 'attempted keylist doesn\'t exist')
        break
      }
      for(let k in keyList[details.name]) {
        cache.setKey(k, keyList[details.name][k])
      }
      cache.save()
      break
    }

    case 'setKey': {
      Queue.add(function() {
        const cache = new Cache(details.name)
        cache.setKey(details.key, details.data)
      }, { overwrite: true })
      break
    }
  }
})


//:::: LOG LISTENER ::::\\
ipcMain.on('log', (event, details) => {
  /** details:
   *    action,
   *    log
   */
  // using the helper here to make calls from the main possible as well
  ipcChannels['log'](details)
})
