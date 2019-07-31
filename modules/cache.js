/*
   This module implements a caching class which can be used dynamically over all pages.
*/

const flatCache = require('flat-cache')
const path = require('path')
const { remote } = require('electron')
const config = remote.getGlobal('config')

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
      this.cache.save(true)
   }
   remove() {
      flatCache.clearCacheById(this.name, this.path)
   }
}
