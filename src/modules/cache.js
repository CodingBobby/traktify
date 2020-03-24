const flatCache = require('flat-cache')

const { debugLog } = require('./helper.js')
const { PATHS } = require('./app/files.js')


class Cache {
   /**
    * @param {String} name Identifier of the Cache instance
    * @param {Number} [cacheTime] Time to keep data, 0 for never expire
    */
   constructor(name, cacheTime=0) {
      this.name = name
      this.path = PATHS.cache
      this.cache = flatCache.load(name, this.path)
      this.expire = cacheTime === 0 ? false : cacheTime * 1000 * 60
   }

   /**
    * Retrieve data saved under given key.
    * @param {String} key Key which will be read
    * @returns {*} Stored data
    */
   getKey(key) {
      let now = new Date().getTime()
      let value = this.cache.getKey(key)
      if(value === undefined || (value.expire !== false && value.expire < now)) {
         return undefined
      } else {
         return value.data
      }
   }

   /**
    * Save data under a given key.
    * @param {String} key Key that should represent the data
    * @param {*} value Data to be stored
    */
   setKey(key, value) {
      let now = new Date().getTime()
      this.cache.setKey(key, {
         expire: this.expire === false ? false : now + this.expire,
         data: value
      })
   }

   /**
    * Remove key from cache and delete associated data.
    * @param {String} key Key to remove
    */
   removeKey(key) {
      this.cache.removeKey(key)
   }

   /**
    * Permanently write entire cache to disk.
    */
   save() {
      let timer = Date.now()
      debugLog('cache', 'saving...')
      this.cache.save(true)
      debugLog('cache', `saved in ${Date.now() - timer}ms`)
   }

   /**
    * Permanently delete entire cache.
    */
   remove() {
      flatCache.clearCacheById(this.name, this.path)
   }
}


module.exports = Cache
