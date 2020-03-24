class Queue {
   /**
    * @param {Object} [options] Optional settings for the queue
    * @param {Number} [options.frequency] Ticks per second
    * @param {Boolean} [options.reverse] Set to true to always run the latest task first
    * @param {Function} [mergeCallback] 
    */
   constructor(options, mergeCallback) {
      options = options || {}

      /** @private */
      this._timeOut = 1e3

      if(options.frequency) {
         this._timeOut = 1e3/options.frequency
      }

      /** @private */
      this._reverse = options.reverse
      /** @private */
      this._taskList = []
      /** @private */
      this._mergeCallback = typeof mergeCallback == 'function' ? mergeCallback : false
   }
 
   add(callback, options) {
      // options: { ?args, ?overwrite }
      options = options || {}
      let job = new Task(options.args, callback)
   
      if(options.overwrite) {
         let mergeWanted = this._mergeCallback !== false
         let duplicates = this._duplicates(job, mergeWanted)

         if(mergeWanted) {
            let argList = duplicates.map(j => {
               return this._taskList[j].args
            })
            
            argList.push(job.args)

            // overwrite arguments of new job with merged list which contains its own original args along with the args of all other enqueued jobs
            job.args = this._mergeCallback(argList)
         }

         // previously found jobs that are identical to the new one can be removed now
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
         // console.log('ticking', job.description)
         // TODO: add .description to all job enqueuerings that can be shown in the log
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
 
   /**
    * Returns the index positions of jobs that look identical to the given one.
    * @param {Task} j The newly added job
    * @param {Boolean} onlyCallback Only compare the callbacks and not the passed arguments
    */
   _duplicates(j, onlyCallback) {
      let indices = []
      this._taskList.forEach((t, index) => {
         if((onlyCallback ? true : String(j.args) == String(t.args))
         && String(j.callback) == String(t.callback)) {
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


module.exports = Queue
