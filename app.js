/*\
|*|   TRAKTIFY
|*|   is a desktop app for trakt.tv
|*|   created by @CodingBobby and @Bumbleboss in 2019
|*|   using the trakt api with the trakt.js library
|*|   in an electron framework,
|*|   the current version is 0.1.1
|*|   from the 21th Feb. 2019
\*/

console.time('init')

const electron = require('electron')
const Trakt = require('trakt.tv')
const fs = require('fs')
const path = require('path')
const http = require('http')
const url = require('url')

// the electron items we need
const {
  app,
  BrowserWindow,
  Menu,
  shell,
  clipboard
} = electron

// configuration and boolean checks that we need frequently
let config = JSON.parse(fs.readFileSync("./config.json", "utf8"))
let darwin = process.platform == 'darwin'

// instances we define later on but need to be
// accessible globally
let window = null
let trakt

// here we set some options we need later
const windowOptions = {
  width: 900,
  height: 650,
  resizable: false,
  useContentSize: true,
  titleBarStyle: 'hidden',
  backgroundColor: '#1C1C1C',
  title: 'Traktify',
  icon: darwin ? path.join(__dirname, 'assets/icons/trakt/trakt.icns')
    : path.join(__dirname, 'assets/icons/trakt/tract.ico'),
  show: true,
  center: true
}

const traktOptions = {
  client_id: config.client.id,
  client_secret: config.client.secret,
  redirect_uri: 'http://localhost:3456'
}

// here we create a template for the main menu,
// to get the right shortcut, we check if we're running on darwin
let menuTemplate = [{
  label: 'File',
  submenu: [{
    label: 'About',
    click() {
      shell.openExternal('https://github.com/CodingBobby/traktify')
    }
  }, {
    label: 'Quit Traktify',
    accelerator: darwin ? 'Command+Q'
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
      accelerator: darwin ? 'Command+I'
        : 'Ctrl+I',
      click(item, focusedWindow){
        focusedWindow.toggleDevTools()
      }
    }, {
      label: 'Reload App',
      accelerator: darwin ? 'Command+R'
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
    trakt = new Trakt(traktOptions)
  } catch(err) {
    console.error(err)
  }

  window.loadFile('./index.html')

  // we have initialized everything important and log how long
  // it took, remember to remove it in release version
  console.timeEnd('init')
  
  // now we call the login function which returns if the user was
  // successfully logged in
  loadLogin()

  // if the window gets closed, the app will quit
  window.on('closed', function() {
    win = null
  })

	window.on('restore', () => {
		window.focus()
	})
}

// this loads the login page where you can be directed to
// trakt's authenticator and returns the success of it
function loadLogin() {
  window.loadFile('pages/login/index.html')
  global.authenticate = function authenticate() {
    return trakt.get_codes().then(function(poll) {
      clipboard.writeText(poll.user_code) // give the user the code
      global.codeToClipboard = function codeToClipboard() {
        // provides the user the option to get the code again
        clipboard.writeText(poll.user_code)
      }
      shell.openExternal(poll.verification_url)
      return trakt.poll_access(poll)
    }.bind(this)).then(function(auth) {
      trakt.import_token(auth)
      // head into dashboard
      loadDashboard()
      return true
    }.bind(this)).catch(function(err) {
      console.error('Trakt: authentication failed', err)
      // reload page
      loadLogin()
      return err
    })
  }
}

function loadDashboard() {
  window.loadFile('pages/dashboard/index.html')
}

// this function can be called to save changes in the config file
function saveConfig() {
  fs.writeFile("./config.json", JSON.stringify(config), err => {
    if(err) console.error(err)
  })
}

// here we finally build the app
app.on('ready', build)

// this quits the whole app
app.on('window-all-closed', () => {
	app.quit();
});
