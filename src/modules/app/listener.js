const tracer = require('../manager/log.js')
const { SwitchBoard } = require('../manager/ipc.js')
const { Traktor } = require('../api/getters.js')


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
 * @param {} trakt
 * @param {SwitchBoard} SB manager connected to related window
 * @memberof Modules.App
 */
function initGetListener(trakt, SB) {
  const GET = new Traktor(trakt)

  SB.on('get', (data, send) => {
    // data: { method: '', query: {} }

    GET[data.method](data.query).then(result => {
      send(result)
    })
  })
}


module.exports = {
  initLogListener, initGetListener
}
