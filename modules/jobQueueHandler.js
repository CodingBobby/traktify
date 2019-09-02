const fork = require('child_process').fork
let jobQueue

process.on('message', m => {
   switch(m.type) {
      case 'init-queue': {
         jobQueue = new Queue(m.module)
         break
      }

      case 'init-job': {
         jobQueue.add({
            id: m.id,
            data: m.data
         })
         break
      }
   }
})


class Queue {
   constructor(module) {
      // log('queue initializing')
      
      // this array holds Job objects
      // The contained jobs are processed in reversed order. The last item in the array is processed first. When queueing a new job, it is appended to the beginning of it.
      this.jobs = []

      // Relative path of the module, job requests are being sent to.
      this.module = module
   }

   add(job) {
      // If there are no other jobs in the queue, it means that it was either just initiallized or already completed some time before. In both cases, we have to (re)start the process of working on the jobs.
      let isBlanc = this.jobs.length === 0

      this.jobs.unshift(job)
      // log('added new job to queue')

      if(isBlanc) {
         // (re)start the worker
         this.start()
      }
   }

   start() {
      // This method is recursively called when a job was completed to start the next job. When all jobs are completed, we can stop the loop and set this worker to idle.
      let jobsAvailable = this.jobs.length > 0

      // log(this.jobs)

      if(jobsAvailable) {
         const job = this.jobs[this.jobs.length - 1]
         let jobHandler = fork(__dirname + `/${this.module}`)

         // wait for the job to finish
         jobHandler.once('message', result => {
            // the job was done and the result can be sent back
            done(job.id, result)

            // remove the job from queue and resume
            this.jobs.pop()
            this.start()
         })

         // start the job
         jobHandler.send(job.data)
      } else {
         // stop the worker
         // log('queue completed')
      }
   }
}


function log(msg) {
   process.send({
      type: 'log',
      data: msg
   })
}

function done(id, result) {
   process.send({
      type: 'job-done',
      id: id,
      data: result
   })
}
