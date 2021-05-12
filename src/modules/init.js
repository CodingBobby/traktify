const fs = require('fs-extra')
const path = require('path')

/**
 * @typedef {Object} API_KEYS
 * @property {string} trakt_id
 * @property {string} trakt_secret
 * @property {string} fanart_key
 * @property {string} tmdb_key
 * @property {string} tvdb_key
 * @property {string} discord_key
 */

module.exports = {
  /**
   * Get a list of all secret API keys and IDs.
   * @returns {API_KEYS}
   */
  getAPIKeys: function() {
    let keyPath = path.join(process.env.BASE_PATH, 'keys.secret.json')

    try {
      if (fs.existsSync(keyPath)) {
        return fs.readJsonSync(keyPath)
      } else {
        throw new Error('keys.secret.json does not exists')
      }
    } catch (err) {
      console.error(err)
    }
  }
}
