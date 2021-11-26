const tracer = require('../manager/log.js')
const { SwitchBoard } = require('../manager/ipc.js')
const { Traktor, CachedTraktor } = require('../api/getters.js')
const { shell } = require('electron')
const Trakt = require('trakt.tv')
const Fanart = require('fanart.tv')
const fs = require('fs')


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
 * @param {Trakt} trakt authenticated API instance of trakt.tv
 * @param {Fanart} fanart authenticated API instance of fanart.tv
 * @param {SwitchBoard} SB manager connected to related window
 * @memberof Modules.App
 */
function initGetListener(trakt, fanart, SB) {
  const CT = new CachedTraktor(trakt, fanart)
  const UT = new Traktor(trakt, fanart)

  SB.on('get', (data, send) => {
    // data: { method: '', query: {} }

    let query = data.query || {}
    query.overwrite = data.overwrite

    CT[data.method](query).then(send)
  })

  SB.on('post', (data, send) => {
    // data: { method: '', query: {} }

    let query = data.query || {}
    UT[data.method](query).then(send)
  })
}


/**
 * Activeates a set of listeners that provide access to actions related to the unser's computer.
 * @param {SwitchBoard} SB manager connected to app's window
 * @memberof Modules.App
 */
function initSystemListener(SB) {
  // open url in user's default application
  SB.on('request.openexternal', (link, done) => {
    tracer.log(`opening url ${link}`)
    
    shell.openExternal(link)
    done()
  })

  // get a list of files in a specific path
  SB.on('request.filelist', (path, done) => {
    fs.readdir(path, (err, files) => {
      if (err) {
        tracer.error(err)
        throw err
      }

      done(files)
    })
  })
}


module.exports = {
  initLogListener, initGetListener, initSystemListener
}
