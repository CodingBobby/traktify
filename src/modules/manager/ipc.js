const tracer = require('../manager/log.js')
const electron = require('electron')
const { v4: UUID } = require('uuid')
const isRenderer = require('is-electron-renderer')


/**
 * @memberof Modules.Manager
 */
 class SwitchBoard {

  /**
   * Interface for communication between main and renderer or between renderers.
   * See {@tutorial ipc} for examples and more information on how it works.
   * @param {Object} [options]
   * @param {electron.BrowserWindow} [options.window] target window of connection, not required when connecting to main process
   * @param {number} [options.timeout] milliseconds after which an error is thrown if target didn't reply, default: 1000
   */
  constructor(options) {
    /** @private */
    this.listener = isRenderer ? electron.ipcRenderer : electron.ipcMain

    /** @private */
    this.options = options || {}
    this.options.timeout = this.options.timeout || Math.PI*1e3
    this.options.window = this.options.window || null

    if (!isRenderer && !this.options.window) {
      throw new Error('main process requires a target window')
    }

    /** @private */
    this.sender = isRenderer ? this.listener : this.options.window.webContents
  }


  /**
   * Communicates with the specified window and waits for a reply within a given timeframe.
   * Routes back the data it received through `.then`.
   * @param {string} route channel on which to send data
   * @param {*} args content to send
   * @param {number} [timeout] defaults to whatever was set in the options
   * @returns {Promise} resolves the data included in the reply
   */
  send(route, args, timeout) {
    const ID = UUID()

    this.sender.send(route, {
      replyTo: ID, // prevents confusion
      args
    })

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const err = `no reply over route '${route}' within allowed timeframe`
        reject(new Error(err))
      }, timeout || this.options.timeout)

      // unique channel will never be used twice to send a message
      this.listener.once(ID, (_event, replyData) => {
        clearTimeout(timer)
        resolve(replyData)
      })
    })
  }


  /**
   * @callback IPC_CB
   * @param {*} args
   * @param {IPC_DONE} done
   */

  /**
   * @callback IPC_DONE
   * @param {*} result
   */

  /**
   * Listens for incoming messages and replies when callback finishes.
   * @param {string} route channel to listen on
   * @param {IPC_CB} callback fires when message over {@link route} is received
   */
  on(route, callback) {
    this.listener.on(route, (_event, data) => {
      callback(data.args, result => {
        this.sender.send(data.replyTo, result)
      })
    })
  }

}


module.exports = {
  SwitchBoard
}
