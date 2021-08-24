const tracer = require('../manager/log.js')
const { SwitchBoard } = require('../manager/ipc.js')
const { Traktor, CachedTraktor } = require('../api/getters.js')
const { shell } = require('electron')


/**
 * Invokes an IPC event listener for logging from the rendering process.
 * Has to be done manually as there is no render-window yet.
 * @param {SwitchBoard} SB manager connected to related window
 * @memberof Modules.App
 */
function initLogListener(SB) {
  SB.on('tracer', (data, done) => {
    try {
      tracer[data.lvl](data.msg)
    } catch (err) {
      tracer.error(err)
    } finally {
      done()
    }
  })
}


/**
 * Starts a listener for the GET requests sent from the frontend via {@link Modules.Renderer.Get}.
 * Methods return cached data but are being forwarded to {@link Modules.API.Traktor} when a fresh API request is required.
 * @param {} trakt
 * @param {SwitchBoard} SB manager connected to related window
 * @memberof Modules.App
 */
function initGetListener(trakt, SB) {
  const GET = new CachedTraktor(trakt)

  SB.on('get', (data, send) => {
    // data: { method: '', query: {} }

    GET[data.method](data.query).then(result => {
      send(result)
    })
  })
}


/**
 * Activeates a set of listeners that provide access to actions related to the unser's computer.
 * @param {SwitchBoard} SB manager connected to app's window
 * @memberof Modules.App
 */
function initSystemListener(SB) {
  SB.on('request.openexternal', (link, done) => {
    tracer.log(`opening url ${link}`)
    
    shell.openExternal(link)
    done()
  })
}


module.exports = {
  initLogListener, initGetListener, initSystemListener
}
