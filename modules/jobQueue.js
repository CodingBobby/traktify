const Background = require('background')

module.exports = class Queue {
   constructor() {
      this.queue = new Background.JobQueue(1065.6)
      this.results = null
      this.iterator = null
      this.timeslice = null
   }

   push(job, type, listed) {
      let r = this.results
      let t = this.timeslice
      let i = this.iterator

      switch(listed) {
         case true: {
            this.queue.push({
               start() {
                  r = []
                  t = 0
                  return i = new Background.ArrayIterator(job, 2)
               },
               tick() {
                  t++
                  return i.nextByItem(job => r.push(job()))
               },
               finish() {
                  return
               }
            })
            break
         }
         default: {
            this.queue.push({
               async tick() {
                  r = await job()
                  return true
               }
            })
            break
         }
      }
   }

   tick() {
      this.queue._doTick()
   }
}
