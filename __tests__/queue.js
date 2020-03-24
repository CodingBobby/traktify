const Queue = require('./../src/modules/queue.js')


test('Queue class', () => {
   let testQueue = new Queue({
      frequency: 60
   })

   expect(testQueue instanceof Queue).toBe(true)
   expect(typeof testQueue.add).toBe('function')

   let testVar = 0

   testQueue.add(function() {
      testVar += 11
   })
   testQueue.add(function() {
      testVar -= 3
   })
   testQueue.add(function() {
      testVar /= 2
   })

   setTimeout(() => {
      expect(testVar).toBe(4)
   }, 200) // 50 should be sufficient
})
