const fs = require('fs-extra')
const path = require('path')
const dirTree = require('directory-tree')

const storeDir = path.join(process.env.HOME, '.traktify')

/**
 * Paths of system files that are saved outside the app.
 * @typedef SystemPaths
 * @property {String} cache
 * @property {String} log
 * @property {String} config
 */

/**
 * Initializes a directory tree that is used for system files.
 * It detects existing files and does not overwrite them to keep custom settings.
 * @returns {Promise.<SystemPaths>} Resolves paths of system files
 */
function initFileStructure() {
   fs.ensureDirSync(storeDir)

   const storeDirStructure = dirTree(storeDir)

   const defConfigDir = path.join(__dirname, '../../def_config.json')
   const defConfigRaw = fs.readFileSync(defConfigDir, 'utf8')

   const defaults = {
      '.cache': {},
      '.log': 'TRAKTIFY LOG\n\n',
      'config.json': defConfigRaw
   }

   return new Promise((resolve, reject) => {
      // add missing files
      let firstChildren = storeDirStructure.children.map(c => c.name)
      let desired = ['.cache', '.log', 'config.json']
      // TODO: This will only work if the default file structure does not consist of multiple directory levels. Create helper function to make this possible if a more structured default tree is required.

      desired.map(d => {
         if(!firstChildren.includes(d)) return d
      }).filter(n => n).forEach(m => {
         if(typeof defaults[m] == 'object') {
            // in this case, the missing element was a directory
            fs.ensureDirSync(path.join(storeDir, m))
         } else {
            fs.outputFileSync(path.join(storeDir, m), defaults[m])
         }
      })

      // fix config file if necessary
      const configDir = path.join(storeDir, 'config.json')
      const configRaw = fs.readFileSync(configDir, 'utf8')
      const config = JSON.parse(configRaw)

      let missing = !Object.keys(config).includes('client')
         || !Object.keys(config).includes('user')
   
      if(missing) {
         fs.outputFileSync(path.join(storeDir, 'config.json'), defaults['config.json'])
      }
      
      resolve({
         cache: path.join(storeDir, '.cache'),
         log: path.join(storeDir, '.log'),
         config: path.join(storeDir, 'config.json')
      })
   })
}


/**
 * Keys, secrets and tokens used for API requests.
 * @typedef APIKeys
 * @property {String} trakt_id
 * @property {String} trakt_secret
 * @property {String} fanart_key
 */

/**
 * Searches for existing keyfiles and returns the contents.
 * If a secret version exists and is complete, it will be used over dev keys.
 * Useful to automate keys in different environment setups.
 * @returns {APIKeys} Object with API keys
 */
function getAPIKeys() {
   const onDev = process.env.NODE_ENV !== 'production'
   const appPath = process.env.APP_PATH
   const secretPath = path.join(appPath, 'keys.secret.json')
   const devPath = path.join(appPath, 'keys.dev.json')

   const requiredKeys = ['trakt_id', 'trakt_secret', 'fanart_key']

   let hasSecret = fs.existsSync(secretPath)
   
   if(hasSecret) {
      /** @type {APIKeys} */
      let secretKeys = fs.readJSONSync(secretPath)
      let fulfills = requiredKeys.map(k => Object.keys(secretKeys).includes(k))
      
      if(!fulfills.includes(false)) {
         return secretKeys
      } else if(!onDEV) {
         throw new Error('keyfile is missing keys')
      }
   }

   let hasDev = fs.existsSync(devPath)

   if(onDev && hasDev) {
      /** @type {APIKeys} */
      let devKeys = fs.readJSONSync(devPath)
      let fulfills = requiredKeys.map(k => Object.keys(devKeys).includes(k))
      
      if(!fulfills.includes(false)) {
         return devKeys
      } else {
         throw new Error('no usable keyfile found')
      }
   }
}


module.exports = {
   initFileStructure, getAPIKeys,

   /** @type {SystemPaths} */
   PATHS: {
      cache: path.join(storeDir, '.cache'),
      log: path.join(storeDir, '.log'),
      config: path.join(storeDir, 'config.json')
   }
}
