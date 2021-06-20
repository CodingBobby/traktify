const tracer = require('../manager/log.js')
const fs = require('fs-extra')
const path = require('path')

const BASE_PATH = process.env.BASE_PATH


/**
 * @typedef {Object} API_KEYS
 * @property {string} trakt_id minimum requirement
 * @property {string} trakt_secret minimum requirement
 * @property {string} fanart_key minimum requirement
 * @property {string} [tmdb_key]
 * @property {string} [tvdb_key]
 * @property {string} [discord_key]
 * @memberof Modules.API
 */


/**
 * API keys that are the minimum requirement for the app to work.
 * @type {Array<string>}
 * @memberof Modules.API
 */
const requiredKeys = [
  'trakt_id', 'trakt_secret', 'fanart_key'
]


/**
 * Get a list of all secret API keys and IDs.
 * @returns {API_KEYS}
 * @memberof Modules.API
 */
function getAPIKeys() {
  let keyPath = path.join(BASE_PATH, 'keys.secret.json')

  try {
    if (fs.existsSync(keyPath)) {
      let secretKeys = fs.readJSONSync(keyPath)
      let fulfills = requiredKeys.map(k => {
        return Object.keys(secretKeys).includes(k)
      })
      
      if(!fulfills.includes(false)) {
        // all required keys are present
        tracer.log('API keys are ok')
        return secretKeys
      } else {
        throw new Error('keyfile is missing keys')
      }
    } else {
      throw new Error('keyfile does not exist')
    }
  } catch (err) {
    tracer.error(err)
  }
}


module.exports = {
  getAPIKeys
}
