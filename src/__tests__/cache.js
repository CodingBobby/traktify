const Cache = require('./../modules/cache.js')


test('Cache class', async () => {
   let testCache = new Cache('testCache')

   expect(testCache instanceof Cache).toBe(true)
   expect(testCache.name).toBe('testCache')
   expect(testCache.expire).toBe(false)
   expect(typeof testCache.getKey).toBe('function')
   expect(typeof testCache.setKey).toBe('function')
   expect(typeof testCache.removeKey).toBe('function')
   expect(typeof testCache.remove).toBe('function')
   expect(typeof testCache.save).toBe('function')

   testCache.setKey('testKey', Math.PI)
   expect(testCache.getKey('testKey')).toBe(Math.PI)

   await testCache.save()
   let checkOne = new Cache('testCache')
   expect(checkOne.getKey('testKey')).toBe(Math.PI)

   await testCache.remove()
   let checkTwo = new Cache('testCache')
   expect(checkTwo.getKey('testKey')).toBe(undefined)
})
