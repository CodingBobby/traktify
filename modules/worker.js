let fork = require('child_process').fork


class Worker {
   constructor(moduleName) {
      this.jobQueueHandler = fork(__dirname + '/jobQueueHandler.js')

      // handle status updates and other pings coming in
      this.jobQueueHandler.on('message', msg => {
         switch(msg.type) {
            case 'log': {
               console.log(msg.data)
               break
            }
         }
      })

      this.jobQueueHandler.send({
         type: 'init-queue',
         module: moduleName
      })
   }

   queue(JOB) {
      const ID = Date.now()
      console.log('job added to queue:', JOB)
      return new Promise((resolve, rej) => {
         this.jobQueueHandler.on('message', msg => {
            // console.log('msg received:', msg)
            if(msg.type === 'job-done') {
               if(msg.id === ID) {
                  resolve(msg.data)
               }
            }
         })

         this.jobQueueHandler.send({
            type: 'init-job',
            id: ID,
            data: JOB
         })
      })
   }
}


// some tests

let worker = new Worker('jobs.js')

worker.queue({
   func: 'test',
   args: 'hello worlds'
})

.then(res => {
   console.log('job 1:', res)
})


worker.queue({
   func: 'test',
   args: 'bob is calling'
})

.then(res => {
   console.log('job 2:', res)
})
