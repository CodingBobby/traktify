const fs = require('fs-extra')
const path = require('path')
const dirTree = require('directory-tree')

const storeDir = path.join(process.env.HOME, '.traktify')

/**
 * @typedef SystemPaths
 * @property {String} cache
 * @property {String} log
 * @property {String} config
 */

/**
 * 
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
      // TODO: This will only work if the default file structure does not consist of multiple directory levels. Create helper funcion to make this possible if a more structured default tree is required.

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


module.exports = {
   initFileStructure,
   PATHS: {
      cache: path.join(storeDir, '.cache'),
      log: path.join(storeDir, '.log'),
      config: path.join(storeDir, 'config.json')
   }
}
