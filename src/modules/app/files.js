const fs = require('fs-extra')
const path = require('path')
const dirTree = require('directory-tree')
const tracer = require('../manager/log.js')
const PATHS = require('./paths.js')


// default configuration file
const defConfigDir = path.join(PATHS.app, 'def_config.json')
const defConfigRaw = fs.readFileSync(defConfigDir, 'utf8')


/**
 * Initializes a directory tree that is used for system-files.
 * It detects existing files and does not overwrite them to keep custom settings.
 * @returns {Promise<PATHS.SystemPaths>} resolves paths of system-files
 * @memberof Modules.App
 */
function initFileStructure() {
  try {
    fs.ensureDirSync(PATHS.data)
  } catch (err) {
    tracer.error(err)
    return new Promise((resolve, reject) => {
      reject('directory access failed, enough permissions?')
    })
  }
  

  const storeDirStructure = dirTree(PATHS.data)

  const defaultContent = {
    '.cache': {},
    '.log': 'TRAKTIFY LOG\n\n',
    'config.json': defConfigRaw
  }

  return new Promise((resolve, reject) => {
    // add missing files

    // TODO: This will only work if the default file structure does not consist of multiple directory levels. Create helper function to make this possible if a more structured default tree is required.
    let presentFiles = storeDirStructure.children.map(c => c.name)
    let desired = ['.cache', '.log', 'config.json']

    // false if anything had to be modified
    let noFixing = true

    desired.map(d => {
      // only pass items that are not yet present
      if (!presentFiles.includes(d)) return d
    }).filter(n => n).forEach(m => {
      noFixing = false

      if (typeof defaultContent[m] == 'object') {
        // in this case, the missing element was a directory
        fs.ensureDirSync(path.join(PATHS.data, m))
      } else {
        fs.outputFileSync(path.join(PATHS.data, m), defaultContent[m])
      }
    })

    if (!noFixing) tracer.warn('system-files are created')

    // fix config file if necessary
    const configDir = path.join(PATHS.data, 'config.json')
    const configRaw = fs.readFileSync(configDir, 'utf8')

    try {
      // this fails if content is not JSONifyable (is that a word?)
      const config = JSON.parse(configRaw)

      let missing = !Object.keys(config).includes('client')
        || !Object.keys(config).includes('user')

      if (missing) {
        throw 'config file is missing important content'
      }
    } catch (err) {
      noFixing = false

      tracer.error(err)
      fs.outputFileSync(configDir, defaultContent['config.json'])
      tracer.warn('overwritten config with defaults')
    }

    if (noFixing) tracer.log('system-files are present and as expected')

    resolve(PATHS)
  })
}


/**
 * Configuration settings for the app.
 * @typedef Config
 * @property {Object} client
 * @property {Object} client.settings
 * @property {Object} client.rpc
 * @property {Object} user
 * @property {Object} user.trakt
 * @property {Object|false} user.trakt.auth
 * @property {Boolean} user.trakt.status
 * @memberof Modules.App
 */

/**
 * Reads configuration file from disk.
 * @returns {Config} Configuration settings
 * @memberof Modules.App
 */
function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(PATHS.config, 'utf8'))
  } catch (err) {
    tracer.error(err)
  }
}


module.exports = {
  initFileStructure, readConfig
}
