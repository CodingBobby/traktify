const fs = require('fs-extra')
const colors = require('colors')
const PATHS = require('../app/paths.js')

/**
 * @typedef LogLevel
 * @type {'log'|'info'|'warn'|'error'|'trace'|'debug'|'fatal'}
 * @memberof Modules.Manager
 */

// Temporary storage for logs that couldn't be saved because the log-file doesn't exist yet.
// Happens when the app starts the first time and things are logged before required files are created.
let tmpLog = ''


/**
 * Logging interface that formats different levels and saves to file defined in {@link Modules.App.PATHS}.
 * @type {Tracer.Logger}
 * @property {Function} log
 * @property {Function} info
 * @property {Function} warn
 * @property {Function} error
 * @property {Function} trace
 * @property {Function} debug
 * @property {Function} fatal
 * @memberof Modules.Manager
 */
const tracer = require('tracer').colorConsole({
  format: [
    '{{timestamp}} <{{title}}> {{message}} [{{file}}:{{line}}]',
    {
      error: '{{timestamp}} <{{title}}> {{message}} [{{file}}:{{line}}]\nCall Stack:\n{{stack}}'
    }
  ],
  dateformat: 'HH:MM:ss.L',
  preprocess: function(data) {
    data.title = data.title.toUpperCase()
  },
  filters: [{
    warn: colors.yellow,
    error: [colors.red, colors.bold]
  }],
  transport: function(data) {
    // do the actual logging
    console.log(data.output)

    // if possible, save log to file
    if (fs.existsSync(PATHS.log)) {
      if (tmpLog.length > 0) {
        data.rawoutput = tmpLog + data.rawoutput

        // reset storage as it will be written to file next
        tmpLog = ''
      }

      fs.appendFile(PATHS.log, data.rawoutput + '\n', err => {
        if (err) throw err
      })
    } else {
      console.log('\t... could not be saved yet')

      // store temporarily until it can be saved to file
      tmpLog += data.rawoutput + '\n'
    }
  }
})


module.exports = tracer
