/**
 * Callback function for {@link Task}s.
 * @typedef {Function} TASK_CB
 * @param {*} [args] argument for the Task, can be array, object, etc.
 * @param {TASK_PROG} [progress] callback to report an update
 * @returns result that will be resolved after Task completion
 * @memberof Modules.Manager
 */


/**
 * Callback function to run when {@link Task}'s progress updates.
 * @typedef {Function} TASK_PROG
 * @param {number} fraction progress in range 0–1
 * @memberof Modules.Manager
 */


/**
 * @memberof Modules.Manager
 */
class Queue {
  
  /**
   * Organisation of repetitive or time-consuming jobs.
   * @param {Object} [options] optional settings for the queue
   * @param {Number} [options.frequency] ticks per second, default: 1 sec
   * @param {Boolean} [options.reverse] if latest task should be run first, default: false
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

  /**
   * Enqueue a new task.
   * @param {TASK_CB} callback function to be run
   * @param {Object} [options] 
   * @param {*} [options.args] arguments for the task
   * @param {boolean} [options.overwrite] if task should be removed when a similar one is already in the queue, default: false
   */
  add(callback, options) {
    options = options || {}
    let job = new Task(callback, options.args)

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
    this._taskList.push(job)
  }

  /**
   * Runs the next Task in the queue and removes it from the list after completion.
   * @returns {*} the Task's result
   */
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
   * @param {Task} newTask the newly added Task
   * @param {Boolean} onlyCallback only compare the callbacks and not the passed arguments
   */
  _duplicates(newTask, onlyCallback) {
    let indices = []
    this._taskList.forEach((oldTask, index) => {
      if((onlyCallback ? true : String(newTask.args) == String(oldTask.args))
      && String(newTask.callback) == String(oldTask.callback)) {
        // found duplicate
        indices.push(index)
      }
    })
    return indices
  }
}


/**
 * @memberof Modules.Manager
 */
class Task {

  /**
   * Wraps Promises for easier and more specific use.
   * The {@link Queue} will create new Tasks internally but they can be used manually for asynchronous jobs.
   * @param {TASK_CB} callback the function to run
   * @param {Object} [args] optional arguments to be used in the Task's function
   * @param {TASK_PROG} [progress] runs when callback reports an update; for that callback itself needs a callback
   * @example new Task(args => sum(args.nums), { nums: [1, 2, 3] })
   * // argument declaration can also be skipped when not required
   * new Task(() => sum([1, 2, 3]))
   * // but it can be usedful in specific cases
   * new Task(sum, [1, 2, 3])
   */
  constructor(callback, args, progress) {
    this.time = Date.now()
    this.callback = callback
    this.args = args || {}
    this.progress = progress || function(i) {}
  }

  /**
   * called by the queue when it's time
   * @returns {Promise} result which got returned by the Task's callback
   */
  run() {
    return new Promise(async (resolve, rej) => {
      let result

      try {
        result = await this.callback(this.args, this.progress)
      } catch(err) {
        if(err) rej(err)
      }

      resolve(result)
    })
  }
}


module.exports = {
  Queue, Task
}
