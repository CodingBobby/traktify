'use strict'
const discordRPC = require('discord-rpc')
const EventEmitter = require('events')
const debugLog = remote.getGlobal('debugLog')


module.exports = function(clientId) {
  const rpc = new discordRPC.Client({ transport: 'ipc' })

  let connected = false
  let activityCache = null

  const instance = new class RP extends EventEmitter {
    updatePresence(d) {
      if(connected) {
        // FIXME: Disable rpc temporarily and show warning that it could not be created.
        rpc.setActivity(d).catch(err => debugLog('error', '', new Error().stack))
      } else {
        activityCache = d
      }
    }

    disconnect() {
      rpc.destroy().catch(err => debugLog('error', '', new Error().stack))
    }
  }()

  rpc.on('error', err => debugLog('error', '', new Error().stack))

  rpc.login({ clientId }).then(() => {
    debugLog('rpc', 'connected')
    connected = true

    if(activityCache) {
      rpc.setActivity(activityCache)
        .catch(err => debugLog('error', '', new Error().stack))
      activityCache = null
    }
  }).catch(err => debugLog('error', 'rpc login', new Error().stack))

  return instance
}
