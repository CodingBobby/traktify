const path = require('path')

// directory where data is stored
const DATA_DIR = path.join(process.env.HOME, '.traktify')


/**
 * Paths of system files that are saved outside the app.
 * @typedef SystemPaths
 * @property {string} app full path to the app's `src/`
 * @property {string} cache full path to `.cache` folder
 * @property {string} log full path to `.log` file
 * @property {string} config full path to `config.json` file
 * @memberof Modules.App
 */

/**
 * @type {SystemPaths}
 * @memberof Modules.App
 */
const PATHS = {
  app: process.env.BASE_PATH,
  data: DATA_DIR,
  cache: path.join(DATA_DIR, '.cache'),
  log: path.join(DATA_DIR, '.log'),
  config: path.join(DATA_DIR, 'config.json')
}


module.exports = PATHS
