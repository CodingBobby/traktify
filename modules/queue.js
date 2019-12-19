module.exports = class Queue {
   constructor(options) {
      // options: { ?frequency, ?reverse }
      options = options || {}

      if(options.frequency) {
         this._timeOut = 1e3/options.frequency
      } else {
         this._timeOut = 1e3
      }

      this._reverse = options.reverse

      this._taskList = []
   }
 
   add(callback, options) {
      // options: { ?args, ?overwrite }
      options = options || {}
      let job = new Task(options.args, callback)
   
      if(options.overwrite) {
         let duplicates = this._duplicates(job)
         duplicates.forEach(i => {
            this._taskList.splice(i, 1)
         })
      }
   
      // enqueuing job
      this._enqueue(job)
   
      // start the queue if it hasn't already
      if(!this._interval) {
         // starting ticker
         this._interval = setInterval(() => {
            let result = this._doTick()
            if(!result) {
               // stopping ticker
               clearInterval(this._interval)
               this._interval = null
            }
         }, this._timeOut)
      }
   }
 
   _enqueue(job) {
      let len = this._taskList.push(job)
   }
 
   _doTick() {
      let jobIndex
      if(this._reverse) {
         jobIndex = 0
      } else {
         jobIndex = this._taskList.length - 1
      }
      
   
      if(this._taskList.length === 0) {
         // no job available
         return null
      } else {
         // ticking
         let job = this._taskList[jobIndex]
         let result = job.run()
            .then(r => r)
            .catch(e => e)
         
         if(this._reverse) {
            this._taskList.shift()
         } else {
            this._taskList.pop()
         }
         
         return result
      }
   }
 
   _duplicates(j) {
      let indices = []
      this._taskList.forEach((t, index) => {
         if(
            String(j.args) == String(t.args)
            && String(j.callback) == String(t.callback)
         ) {
            // found duplicate
            indices.push(index)
         }
      })
      return indices
   }
}
 
 
class Task {
   constructor(args, callback) {
      this.time = Date.now()
      this.callback = callback
      this.args = args
   }
 
   run() {
      return new Promise(async (resolve, rej) => {
         let result
         try {
            result = await this.callback(this.args)
         } catch(err) {
            if(err) {
               rej(err)
            }
         }
         resolve(result)
      })
   }
}
