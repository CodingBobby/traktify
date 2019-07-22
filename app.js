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

const electron = require('electron')
const fs = require('fs')
const path = require('path')
const Trakt = require('trakt.tv')
const Fanart = require('fanart.tv')
const windowStateKeeper = require('electron-window-state')

// the electron items we need
const {
  app,
  BrowserWindow,
  Menu,
  shell,
  clipboard,
  dialog
} = electron

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

global.trakt
global.fanart

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
  let mainWindowState = windowStateKeeper({
    defaultWidth: 900,
    defaultHeight: 750
  })

  if(getSettings('app')['keep window state'].status) {
    debugLog('app', 'keeping window state changes')
    windowOptions.x = mainWindowState.x
    windowOptions.y = mainWindowState.y
    windowOptions.width = mainWindowState.width
    windowOptions.height = mainWindowState.height
  }

  window = new BrowserWindow(windowOptions)
  Menu.setApplicationMenu(mainMenu)

  if(getSettings('app')['keep window state'].status) {
    mainWindowState.manage(window)
  }

  try {
    global.trakt = new Trakt(traktOptions)
    global.fanart = new Fanart(process.env.fanart_key)
  } catch(err) {
    debugLog('error', 'trakt authentication', new Error().stack)
  }

  // show the window when the page is built
  window.once('ready-to-show', () => {
    window.show()
  })

  debugLog('init', (Date.now() - initTime)+'ms')
  
  // Now we launch the app renderer
  launchApp()


  // EVENTS

  // if the window gets closed, the app will quit
  window.on('closed', () => {
    win = null
  })

	window.on('restore', () => {
		window.focus()
  })
}

// This launcher checks if the user is possibly logged in already. If so, we try to login with the existing credentials. If not, we go directly to the login screen.
function launchApp() {
  if(user.trakt.auth) {
    tryLogin()
  } else {
    loadLogin()
  }
}

function tryLogin() {
  loadLoadingScreen()
  // This timeout fakes a time consuming process. Currently only existing to demonstrate the fancy loading screen.
  setTimeout(() => {
    global.trakt.import_token(user.trakt.auth).then(() => {
      global.trakt.refresh_token(user.trakt.auth).then(newAuth => {
        user.trakt.auth = newAuth
        user.trakt.status = true
        saveConfig()
        debugLog('login', 'success')
        loadDashboard()
      }).catch(err => {
        if(err) {
          user.trakt.auth = false
          user.trakt.status = false
          saveConfig()
          debugLog('login failed', err)
          loadLogin()
        }
      })
    })
  }, 2000);
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
    debugLog('trakt', 'user signed in')
    global.trakt.import_token(auth)

    user.trakt.auth = auth
    user.trakt.status = true
    saveConfig()

    // going back to the app and heading into dashboard
    window.focus()
    loadDashboard()

    return true
  }).catch(err => {
    // The failing login probably won't happen because the trakt login page would already throw the error. This exist just as a fallback.
    if(err) {
      user.trakt.auth = false
      user.trakt.status = false
      saveConfig()

      window.focus()
      loadLogin()
      alert('Oh oops!\nAuthenticating failed for some reason.')
    }
  })
}
global.authenticate = authenticate

function disconnect() {
  global.trakt.revoke_token()
  user.trakt.auth = false
  user.trakt.status = false
  saveConfig()
  loadLogin()
}
global.disconnect = disconnect


// These two functions do nothing but load a render page
function loadLogin() {
  window.loadFile('pages/login/index.html')
}
function loadDashboard() {
  window.loadFile('pages/dashboard/index.html')
}
function loadLoadingScreen() {
  window.loadFile('pages/loading/index.html')
}


// this function can be called to save changes in the config file
function saveConfig() {
  fs.writeFile("./config.json", JSON.stringify(global.config), err => {
    if(err) console.error(err)
  })
}

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

function clone(object) {
  if(null == object || "object" != typeof object) return object
  // create new blank object of same type
  let copy = object.constructor()

  // copy all attributes into it
  for(let attr in object) {
     if(object.hasOwnProperty(attr)) {
        copy[attr] = object[attr]
     }
  }
  return copy
}


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


function updateApp() {
  let settings = getSettings('app')
  for(let s in settings) {
    debugLog('updating setting', s)
    let setting = settings[s]
    switch(s) {
      case 'accent color': {
        let value = setting.options[setting.status].value
        window.webContents.send('modify-root', {
          name: '--accent_color',
          value: value
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


// Range must be an array of two numeric values
function inRange(value, range) {
  let [min, max] = range; max < min ? [min, max] = [max, min] : [min, max]
  return value >= min && value <= max
}

// This function can be used instead of console.log(). It will work exactly the same but it only fires when the app is in development.
function debugLog(...args) {
  if(process.env.NODE_ENV !== 'production') {
    if(args[0] == 'err' || args[0] == 'error') {
      console.log(`\x1b[41m\x1b[37m> ${args[0]}:\x1b[0m`, args[1])
      if(args[2]) {
        console.log(`  @ .${args[2].toString().split(/\r\n|\n/)[1].split('traktify')[1].split(')')[0]}`)
      }
    } else {
      console.log(`\x1b[47m\x1b[30m> ${args[0]}:\x1b[0m`, args[1])
      if(args.length > 2) {
        console.log.apply(null, args.splice(2, args.length-2))
      }
    }
    // console.log('\n') // for an extra empty line
  }
}
global.debugLog = debugLog

// here we finally build the app
app.on('ready', build)

// this quits the whole app
app.on('window-all-closed', () => {
	app.quit()
})
