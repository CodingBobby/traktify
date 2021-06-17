const fs = require('fs-extra')
const path = require('path')

const BASE_PATH = process.env.BASE_PATH


/**
 * @typedef {Object} API_KEYS
 * @property {string} trakt_id
 * @property {string} trakt_secret
 * @property {string} fanart_key
 * @property {string} tmdb_key
 * @property {string} tvdb_key
 * @property {string} discord_key
 * @memberof Modules.API
 */


/**
 * API keys that are the minimum requirement for the app to work.
 * @type {Array.<string>}
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
        return secretKeys
      } else {
        throw new Error('keyfile is missing keys')
      }
    } else {
      throw new Error('keysfile does not exist')
    }
  } catch (err) {
    console.error(err)
  }
}


module.exports = {
  getAPIKeys
}
