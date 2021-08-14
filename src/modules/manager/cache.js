const flatCache = require('flat-cache')
const tracer = require('./log.js')
const PATHS = require('../app/paths.js')

/**
 * @memberof Modules.Manager
 */
class Cache {
  /**
   * Wraps an instance of `flatCache` into a more specific setup.
   * @param {String} name identifier of the Cache instance
   * @param {Number} [cacheTime] time to keep data, 0 for never expire
   */
  constructor(name, cacheTime=0) {
    this.name = name
    this.path = PATHS.cache
    this.cache = flatCache.load(name, this.path)
    this.expire = cacheTime === 0 ? false : cacheTime * 1000 * 60
  }

  /**
   * Retrieve data saved under given key.
   * @param {String} key key which will be read
   * @returns {*} stored data
   */
  getKey(key) {
    let now = new Date().getTime()
    let value = this.cache.getKey(key)
    if (value === undefined) {
      return undefined

    } else if (value.expire !== false && value.expire < now) {
      tracer.warn(`cache-key ${key} is expired`)
      this.removeKey(key)
      tracer.warn('removed expired key')
      return undefined
      
    } else {
      return value.data
    }
  }

  /**
   * Save data under a given key.
   * @param {String} key key that should represent the data
   * @param {*} value data to be stored
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
   * @param {String} key key to remove
   */
  removeKey(key) {
    this.cache.removeKey(key)
  }

  /**
   * Write entire cache to disk.
   */
  save() {
    let timer = Date.now()
    tracer.log('cache is saving...')

    this.cache.save(true)
    tracer.log(`cache was saved in ${Date.now() - timer} ms`)
  }

  /**
   * Permanently delete entire cache.
   */
  remove() {
    flatCache.clearCacheById(this.name, this.path)
    tracer.warn(`cache ${this.name} was deleted`)
  }
}


module.exports = Cache
