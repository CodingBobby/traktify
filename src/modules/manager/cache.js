const flatCache = require('flat-cache')
const tracer = require('./log.js')
const PATHS = require('../app/paths.js')

/**
 * @memberof Modules.Manager
 */
class Cache {
  /**
   * Wraps an instance of `flatCache` into a more specific setup.
   * @param {string} name identifier of the Cache instance
   * @param {number} [cacheTime] time to keep data, 0 for never expire
   */
  constructor(name, cacheTime=0) {
    this.name = name
    this.path = PATHS.cache
    this.cache = flatCache.load(name, this.path)
    this.expire = cacheTime === 0 ? false : cacheTime * 1000 * 60
  }


  /**
   * Only checks the status of a key without modifying anything.
   * @param {string} key identifier
   * @returns {'empty'|'expired'|'valid'}
   */
  keyStatus(key) {
    let now = new Date().getTime()
    let value = this.cache.getKey(key)

    if (value === undefined) {
      return 'empty'
    } else if (value.expire !== false && value.expire < now) {
      return 'expired'
    }
  
    return 'valid'
  }


  /**
   * Should only be called when new data for the key is available.
   * @callback UPDATE_CB
   * @param {*} update new data
   * @returns {void}
   */

  /**
   * @callback EMPTY_CB
   * @param {UPDATE_CB} onUpdates fires when the key should be (re)created
   * @returns {void}
   */

  /**
   * @callback VALID_CB
   * @param {*} value the key's content
   * @param {UPDATE_CB} onUpdates fires when updates should be written into the key
   * @returns {void}
   */

  /**
   * Handler for retrieval of the content of a key.
   * Callbacks accept another callback to optionally send back updated data to be saved in the key.
   * @param {string} key 
   * @param {EMPTY_CB} onEmpty fires when key isn't present yet or was expired
   * @param {VALID_CB} onValid fires when key contains data
   */
  retrieve(key, onEmpty, onValid) {
    let value = this.getKey(key, true)

    if (value === undefined) {
      onEmpty(update => {
        this.setKey(key, update)
      })

    } else {
      onValid(value, update => {
        this.setKey(key, update)
      })
    }
  }


  /**
   * Retrieve data saved under given key.
   * @param {string} key key which will be read
   * @param {boolean} [removeIfExpired] whether to remove key when expired
   * @returns {*} stored data
   */
  getKey(key, removeIfExpired=false) {
    let now = new Date().getTime()
    let value = this.cache.getKey(key)
    if (value === undefined) {
      return undefined

    } else if (value.expire !== false && value.expire < now) {
      tracer.warn(`cache-key ${key} is expired`)

      if (removeIfExpired) {
        this.removeKey(key)
        tracer.warn('removed expired key')
      }
      
      return undefined
      
    } else {
      return value.data
    }
  }


  /**
   * Save data under a given key.
   * @param {string} key key that should represent the data
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
   * @param {string} key key to remove
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
