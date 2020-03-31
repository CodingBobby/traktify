const electron = require('electron')
const { ipcMain } = electron

/**
 * @typedef {Object} IpcDetails
 * @property {String} name
 * @property {String} action
 * @property {any=} data
 * @property {String=} key
 */


const Cache = require('../cache.js')
const Queue = new(require('../queue.js'))

let keyList = {}

/**
 * Callback function for events on the 'cache' channel.
 * It collects cache actions like key addition or savings and executes them
 * in an organized manner to prevent unnecessary disk activity.
 * @param {Electron.IpcMainEvent} event Ipc event the callback will receive
 * @param {IpcDetails} details Options explaining requested cache action
 */
function cacheListener(event, details) {
  switch(details.action) {
    case 'save': {
      // Instead of directly saving the cache within the request module right after changes were made, we put the saving action into a queue and also filter them to only run once each cycle.
      Queue.add(function() {
        const cache = new Cache(details.name)
        cache.save()
      }, { overwrite: true })
      break
    }

    case 'addKey': {
      if(!keyList.hasOwnProperty(details.name)) {
        // list wasn't used yet
        keyList[details.name] = {}
      }
      keyList[details.name][details.key] = details.data
      break
    }

    case 'saveKeys': {
      const cache = new Cache(details.name)
      if(!keyList.hasOwnProperty(details.name)) {
        // nothing was saved in the keylist
        debugLog('!caching', 'attempted keylist doesn\'t exist')
        break
      }
      for(let k in keyList[details.name]) {
        cache.setKey(k, keyList[details.name][k])
      }
      cache.save()
      break
    }

    case 'setKey': {
      Queue.add(function() {
        const cache = new Cache(details.name)
        cache.setKey(details.key, details.data)
      }, { overwrite: true })
      break
    }
  }
}


// these are attached when this module is required
ipcMain.on('cache', cacheListener)
