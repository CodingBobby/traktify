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
//process.env.NODE_ENV = 'production'

if(process.env.NODE_ENV !== 'production') {
  console.time('init')
}

const electron = require('electron')
const fs = require('fs')
const path = require('path')
const Trakt = require('trakt.tv')
const Fanart = require('fanart.tv')

// the electron items we need
const {
  app,
  BrowserWindow,
  Menu,
  shell,
  clipboard
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

// here we set some options we need later
const windowOptions = {
  minWidth: 800,
  minHeight: 500,
  width: 880,
  height: 620,
  useContentSize: true,
  titleBarStyle: 'hidden',
  backgroundColor: '#242424',
  title: 'Traktify',
  icon: global.darwin ? path.join(__dirname, 'assets/icons/trakt/trakt.icns')
    : path.join(__dirname, 'assets/icons/trakt/tract.ico'),
  show: false,
  center: true
}

// here we create a template for the main menu, to get the right shortcut, we check if we're running on darwin
let menuTemplate = [{
  label: 'File',
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
  }]
}]

// if the app is in development mode, these menu items will be pushed
// to the menu template
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

// this function builds the app window, shows the correct pages
// and handles window.on() events
async function build() {
  window = new BrowserWindow(windowOptions)
  Menu.setApplicationMenu(mainMenu)

  try {
    global.trakt = new Trakt(traktOptions)
    global.fanart = new Fanart(process.env.fanart_key)
  } catch(err) {
    console.error(err)
  }

  // show the window when the page is built
  window.once('ready-to-show', () => {
    window.show()
  })

  // we have initialized everything important and log how long
  // it took, remember to remove it in release version
  if(process.env.NODE_ENV !== 'production') {
    console.timeEnd('init')
  }
  
  // now we call the login function which returns if the user was
  // successfully logged in
  loadLogin()


  // EVENTS

  // if the window gets closed, the app will quit
  window.on('closed', function() {
    win = null
  })

	window.on('restore', () => {
		window.focus()
	})
}

// Loading the login page. When asking to authenticate, opening the trakt login on an external browser and loading the dashboard after success
function loadLogin() {
  window.loadFile('pages/login/index.html')

  if(user.trakt.auth) {
    global.trakt.import_token(user.trakt.auth).then(() => {
      global.trakt.refresh_token(user.trakt.auth).then(newAuth => {
        user.trakt.auth = newAuth
        user.trakt.status = true
        saveConfig()
        console.log('success')
        loadDashboard()
      }).catch(err => {
        if(err) {
          user.trakt.auth = false
          user.trakt.status = false
          saveConfig()
          console.error('failed: ', err)
          loadLogin()
        }
      })
    })
  }

  global.authenticate = function authenticate() {
    return global.trakt.get_codes().then(poll => {
      clipboard.writeText(poll.user_code) // give the user the code
      global.codeToClipboard = function codeToClipboard() {
        // provides the user the option to get the code again
        clipboard.writeText(poll.user_code)
      }
      shell.openExternal(poll.verification_url)

      return global.trakt.poll_access(poll)
    }).then(auth => {
      console.log('user signed in')
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
}

function loadDashboard() {
  window.loadFile('pages/dashboard/index.html')
}
global.loadDashboard = loadDashboard

function disconnect() {
  global.trakt.revoke_token()
  user.trakt.auth = false
  user.trakt.status = false
  saveConfig()
  loadLogin()
}
global.disconnect = disconnect

// this function can be called to save changes in the config file
function saveConfig() {
  fs.writeFile("./config.json", JSON.stringify(global.config), err => {
    if(err) console.error(err)
  })
}

// here we finally build the app
app.on('ready', build)

// this quits the whole app
app.on('window-all-closed', () => {
	app.quit()
})
