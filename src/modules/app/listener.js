// This modules listens for data coming from the renderer process.

const { ipcMain } = require('electron')

ipcMain.on('log', data => {
  
})
