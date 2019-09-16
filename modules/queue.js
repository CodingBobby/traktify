module.exports = class Queue {
   constructor(options) {
     // options: { ?frequency }
     options = options || {}
     if(options.frequency) {
       this._timeOut = 1e3/options.frequency
     } else {
       this._timeOut = 1e3
     }
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
 
   //   console.log('enqueuing job...')
     this._enqueue(job)
 
     // strart the queue if it hasn't already
     if(!this._interval) {
      //  console.log('starting ticker...')
       this._interval = setInterval(() => {
         let result = this._doTick()
         if(!result) {
         //   console.log('stopping ticker...')
           clearInterval(this._interval)
         }
       }, this._timeOut)
     }
   }
 
   _enqueue(job) {
     let len = this._taskList.push(job)
   //   console.log('list length:', len)
   }
 
   _doTick() {
     let jobIndex = this._taskList.length - 1
 
     if(jobIndex === -1) {
      //  console.log('no job available...')
       return null
     } else {
      //  console.log('ticking...')
       let job = this._taskList[jobIndex]
       let result = job.run()
         .then(r => r)
         .catch(e => e)
       this._taskList.pop()
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
         // console.log('found duplicate!')
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
