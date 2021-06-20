/**
 * API available to the render process.
 * It is preloaded into all pages and makes communication with the main node process possible.
 * Methods and constants are exposed through `window.traktify`.
 * Note: Logging must also be channelled through this because otherwise messages would only appear in the dev-tools and not in the terminal or in log files.
 * @namespace Renderer
 * @memberof Modules
 * @example // log like this instead of using `console.log`
 * window.traktify.tracer({ level: 'warn', msg: 'to get attention' })
 */


const { contextBridge } = require('electron')
const { SwitchBoard } = require('../modules/manager/ipc.js')

const SB = new SwitchBoard()


SB.on('report.progress', (data, done) => {
  API.tracer({
    lvl: 'info',
    msg: `progress: ${Math.round(data*100)} %`
  })

  done()
})


const API = {

  /**
   * Routes to the actual {@link Modules.Manager.tracer} instance of the main process for logging on the same level.
   * @param {Object} data 
   * @param {string} data.msg the log message
   * @param {Modules.Manager.LogLevel} data.lvl log-level
   * @memberof Modules.Renderer
   */
  tracer: data => {
    SB.send('tracer', data)
  },


  /**
   * Reports the state of something.
   * @param {Object} data
   * @memberof Modules.Renderer
   */
  report: data => {
    
  },

}


// Why isn't this called `exposeInRenderWorld`? It's not the main process!
contextBridge.exposeInMainWorld('traktify', API)
