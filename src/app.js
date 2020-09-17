/**
 *        .....                                         ..           s       .                          
 *     .H8888888h.  ~-.                           < .z@8"`          :8      @88>     oec :    ..        
 *     888888888888x  `>    .u    .                !@88E           .88      %8P     @88888   @L         
 *    X~     `?888888hx~  .d88B :@8c        u      '888E   u      :888ooo    .      8"*88%  9888i   .dL 
 *    '      x8.^"*88*"  ="8888f8888r    us888u.    888E u@8NL  -*8888888  .@88u    8b.     `Y888k:*888.
 *     `-:- X8888x         4888>'88"  .@88 "8888"   888E`"88*"    8888    ''888E`  u888888>   888E  888I
 *          488888>        4888> '    9888  9888    888E .dN.     8888      888E    8888R     888E  888I
 *        .. `"88*         4888>      9888  9888    888E~8888     8888      888E    8888P     888E  888I
 *      x88888nX"      .  .d888L .+   9888  9888    888E '888&   .8888Lu=   888E    *888>     888E  888I
 *     !"*8888888n..  :   ^"8888*"    9888  9888    888E  9888.  ^%888*     888&    4888     x888N><888'
 *    '    "*88888888*       "Y"      "888*""888" '"888*" 4888"    'Y"      R888"   '888      "88"  888
 *            ^"***"`                  ^Y"   ^Y'     ""    ""                ""      88R            88F 
 *                                                                                   88>           98"  
 * is a desktop app for trakt.tv                                                     48          ./"    
 * created by @CodingBobby and @Bumbleboss in 2019                                   '8         ~`      
 * using the trakt api with the trakt.js library
 * in an electron framework
 */


// Uncomment this line for deployment!
// process.env.NODE_ENV = 'production'

let initTime = Date.now()

// file stuff
const fs = require('fs-extra')
const path = require('path')

/**
 * path to /src/ that is used as base paths in other files
 * @type {String}
 */
const APP_PATH = __dirname
process.env.APP_PATH = APP_PATH

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


// api stuff
const Trakt = require('trakt.tv')
const Fanart = require('fanart.tv')
const TvDB = require('node-tvdb')
const TmDB = require('moviedb-promise')

// request stuff
const request = require('request')

// helper imports
const {
  debugLog, inRange, shadeHexColor, clone, ipcChannels
} = require('./modules/helper.js')

debugLog('Welcome to', '~|~ /? /\ /< ~|~ | /= `/')


// file setup imports
const {
  initFileStructure, getAPIKeys,
  saveConfig, readConfig, resetConfig,
  removeCacheFiles
} = require('./modules/app/files.js')

;(async () => {
  const PATHS = await initFileStructure()

  global.debugLog = debugLog

  let apiKeys

  try {
    apiKeys = getAPIKeys()
  } catch(err) {
    debugLog('error', 'could not get API keys', err)
  }

  const API_KEYS = clone(apiKeys)


  // configuration and boolean checks that we need frequently
  // the config file will be used to save preferences the user can change
  // (like darkmode, behavior etc.)
  global.config = readConfig()
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
    client_id: API_KEYS.trakt_id,
    client_secret: API_KEYS.trakt_secret
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
    icon: global.darwin ? './assets/icons/trakt/trakt.icns'
      : './assets/icons/trakt/tract.ico',
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
            global.config = resetConfig()
            disconnect()
          }
        })
      }
    }]
  }]


  if(global.darwin) {
    menuTemplate[0].submenu.splice(1, 0, {
      label: 'Hide Traktify',
      accelerator: 'Command+H',
      click() {
        // this is only available on darwin
        app.hide()
      }
    })
  }


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
      global.fanart = new Fanart(API_KEYS.fanart_key)
    } catch(err) {
      debugLog('error', 'fanart authentication', new Error().stack)
    }

    try {
      debugLog('api', 'creating tvdb instance')
      global.tvdb = new TvDB(API_KEYS.tvdb_key)
    } catch(err) {
      debugLog('error', 'tvdb authentication', new Error().stack)
    }

    try {
      debugLog('api', 'creating tmdb instance')
      global.tmdb = new TmDB(API_KEYS.tmdb_key)
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
    // First, we show the loading screen to tell the user that something is happening. Eventually, when all loading processes are finished, it will be closed again to reveal the dashboard.
    loadLoadingScreen()

    // wait until loading screen is fully loaded
    ipcMain.once('loading-screen', (event, data) => {
      if(data === 'loaded') {
        debugLog('loading', 'can start now')

        global.trakt.import_token(user.trakt.auth).then(() => {
          global.trakt.refresh_token(user.trakt.auth).then(async newAuth => {
            user.trakt.auth = newAuth
            user.trakt.status = true
            saveConfig(global.config)
            debugLog('login', 'success')
      
            // track user stats for traktify analytics
            let userSettings = await trakt.users.settings().then(res => res)
            request(`https://traktify-server.herokuapp.com/stats?username=${userSettings.user.username}`, {
              json: true
            }, (err, res, body) => {
              if (err) debugLog('error', err)
              if (body.data) debugLog('user authentications', body.data.requests)
              else debugLog('error', 'traktify server error', new Error().stack)
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
              saveConfig(global.config)
              debugLog('login failed', err)
              removeCacheFiles()
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
      saveConfig(global.config)

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
        saveConfig(global.config)

        window.focus()
        loadLogin()
      }
    })
  }
  global.authenticate = authenticate

  function disconnect() {
    global.trakt.revoke_token()
    global.config = resetConfig()
    removeCacheFiles()
    loadLogin()
  }
  global.disconnect = disconnect

  // These functions do nothing but load a render page
  function loadLogin() {
    window.loadFile(path.join(APP_PATH, 'pages/login/index.html'))
  }
  function loadDashboard() {
    window.loadFile(path.join(APP_PATH, 'pages/dashboard/index.html'))
  }
  function loadLoadingScreen() {
    window.loadFile(path.join(APP_PATH, 'pages/loading/index.html'))
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

    saveConfig(global.config)
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


  // init listeners
  require('./modules/app/listener.js')


  //:::: LOG LISTENER ::::\\
  ipcMain.on('log', (event, details) => {
    /** details:
     *    action,
     *    log
     */
    // using the helper here to make calls from the main possible as well
    ipcChannels['log'](details)
  })


  // dev cheat commands
  ipcMain.on('run', (event, details) => {
    /** details:
     *    type,
     *    str
     */

    debugLog('!cheat', `triggered ${details.str} via ${details.type}`)

    switch(details.type) {
      case 'functionName': {
        eval(details.str)
        break
      }
    }
  })


  /**
   * 
   * @param {'small'|'big'} size 
   */
  function resizeWindow(size) {
    switch(size) {
      case 'small': {
        window.setSize(300, 300, true)
        break
      }
      case 'big': {
        window.setSize(900, 750, true)
        break
      }
    }
  }
})()
