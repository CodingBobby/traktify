const tracer = require('../manager/log.js')
const { SwitchBoard } = require('../manager/ipc.js')


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


module.exports = {
  initLogListener
}
