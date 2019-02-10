const { app, BrowserWindow } = require('electron')
let window

function build() {
  window = new BrowserWindow({
    width: 1000,
    height: 800
  })
  
  window.loadFile('index.html')
}

app.on('ready', build)
