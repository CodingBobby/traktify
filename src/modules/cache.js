/*
   This module implements a caching class which can be used dynamically over all pages.
*/

const flatCache = require('flat-cache')
const path = require('path')

const {
   config, debugLog
} = require('./helper.js')

module.exports = class Cache {
   constructor(name, cacheTime=0) {
      this.name = name
      this.path = path.join(__dirname, config.client.cache.path)
      this.cache = flatCache.load(name, this.path)
      this.expire = cacheTime === 0 ? false : cacheTime * 1000 * 60
   }
   getKey(key) {
      let now = new Date().getTime()
      let value = this.cache.getKey(key)
      if(value === undefined || (value.expire !== false && value.expire < now)) {
         return undefined
      } else {
         return value.data
      }
   }
   setKey(key, value) {
      let now = new Date().getTime()
      this.cache.setKey(key, {
         expire: this.expire === false ? false : now + this.expire,
         data: value
      })
   }
   removeKey(key) {
      this.cache.removeKey(key)
   }
   save() {
      let timer = Date.now()
      debugLog('cache', 'saving...')
      this.cache.save(true)
      debugLog('cache', `saved in ${Date.now() - timer}ms`)
   }
   remove() {
      flatCache.clearCacheById(this.name, this.path)
   }
}
