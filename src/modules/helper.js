/**
 * The helper module provides methods that simplify frequently used calculations and other arrangements.
 * They can be used in every context.
 * @namespace helper
 */
const fs = require('fs-extra')
const { PATHS } = require('./app/files.js')

const LogQueue = new(require(__dirname+'/queue.js'))({
   frequency: 5,
   reverse: true
})


class IPCChannels {
   constructor() {}
   log(details) {
      switch(details.action) {
         case 'save': {
            LogQueue.add(function() {
               fs.stat(PATHS.log, function(err, stat) {
                  if(err == null) {
                     let currentLog = fs.readFileSync(PATHS.log)
                     fs.writeFileSync(PATHS.log, currentLog+'\n'+details.log)
                  } else if(err.code == 'ENOENT') {
                     // file does not exist yet
                     fs.writeFileSync(PATHS.log, 'TRAKTIFY LOG\n'+details.log)
                  } else {
                     console.log('Error occured while saving log: ', err.code)
                  }
               })
            })
      
            break
         }

         case 'print': {
            printLog(String(details.log).split(','), details.date)

            break
         }
      }
   }
}

class IPCParallel {
   send(channel, details) {
      ipcChannels[channel](details)
   }
}

const ipcChannels = new IPCChannels()
const ipcParallel = new IPCParallel()


function printLog(args, date) {
   date = new Date(date)
   let time = `${
      date.getHours().toString().length === 1
         ? '0'+date.getHours() : date.getHours()
   }:${
      date.getMinutes().toString().length === 1
         ? '0'+date.getMinutes() : date.getMinutes()
   }:${
      date.getSeconds().toString().length === 1
         ? '0'+date.getSeconds() : date.getSeconds()
   }`

   if(args[0] == 'err' || args[0] == 'error') {
      console.log(`\x1b[41m\x1b[37m${time} -> ${args[0]}:\x1b[0m`, args[1])
      if(args[2]) {
         console.log(`  @ .${args[2].toString().split(/\r\n|\n/)[1].split('traktify')[1].split(')')[0]}`)
      }
   } else {
      let bgColor = '\x1b[47m'
      let title = args[0].split('')
      if(title[0] === '!') {
         title[0] = ''
         bgColor = '\x1b[43m'
      }
      title = title.join('')
      console.log(`${bgColor}\x1b[30m${time} -> ${title}:\x1b[0m`, args[1])
      if(args.length > 2) {
         console.log.apply(null, args.splice(2, args.length-2))
      }
   }
}


/**
 * Prints a formatted and colorized text to the terminal, the app was started from and
 * sends the log to the log saving queue.
 * @memberof helper
 * @param {...String|Number} args 
 */
function debugLog(...args) {
   let ipc
   if(typeof ipcRenderer === 'undefined') {
      ipc = ipcParallel
   } else {
      ipc = ipcRenderer
   }

   let date = new Date()

   // printing to the terminal if in development mode
   if(process.env.NODE_ENV !== 'production') {
      ipc.send('log', {
         action: 'print',
         log: args,
         date: date
      })
   }

   // log is always saved to disk
   ipc.send('log', {
      action: 'save',
      log: date.toISOString()
      .split('T').join(' ')
      .split('Z').join('')
      +': '+args
   })
}


/**
 * Checks if a value lies within a range of two values. Range values are included.
 * Because it calculates the minimum and maximum value of the specified range,
 * it does not need to be in order.
 * @memberof helper
 * @param {Number} value Number to check
 * @param {Array.<Number>} range Values the number should lie between
 * @returns {Boolean} Whether it is in the range 
 */
function inRange(value, range) {
   let [min, max] = range
   max < min ? [min, max] = [max, min] : [min, max]
   return value >= min && value <= max
}


/**
 * Takes a hex color code and changes it's brightness by the given percentage.
 * Positive value to brighten, negative to darken a color.
 * The function is mainly used to generate dark version of the accent colors
 * @memberof helper
 * @param {String} hex Hexadecimal color code with the format #xxxxxx
 * @param {Number} percent Value between -100 and 100
 * @returns {String} Hexadecimal color code
 */
function shadeHexColor(hex, percent) {
   // convert hex to decimal
   let R = parseInt(hex.substring(1,3), 16)
   let G = parseInt(hex.substring(3,5), 16)
   let B = parseInt(hex.substring(5,7), 16)
 
   // change by given percentage
   B = parseInt(B*(100 + percent)/100)
   R = parseInt(R*(100 + percent)/100)
   G = parseInt(G*(100 + percent)/100)
 
   // clip colors to max value
   R = R<255 ? R : 255 
   G = G<255 ? G : 255 
   B = B<255 ? B : 255 
 
   // zero-ize single-digit values
   let RR = R.toString(16).length==1 ? '0'+R.toString(16) : R.toString(16)
   let GG = G.toString(16).length==1 ? '0'+G.toString(16) : G.toString(16)
   let BB = B.toString(16).length==1 ? '0'+B.toString(16) : B.toString(16)
 
   return '#'+RR+GG+BB
}


/**
 * Simple helper to clone objects which prevents cross-linking.
 * @memberof helper
 * @param {*} dolly Object to clone
 * @returns {*} Cloned object
 */
function clone(dolly) {
   if(null == dolly || "object" != typeof dolly) return dolly
   // create new blank object of same type
   let copy = dolly.constructor()
 
   // copy all attributes into it
   for(let attr in dolly) {
      if(dolly.hasOwnProperty(attr)) {
         copy[attr] = dolly[attr]
      }
   }
   return copy
}


/**
 * Counts n times up the DOM tree and returns it's parent
 * @memberof helper
 * @param {HTMLElement} child Nested element to start with 
 * @param {Number} n Number of layers to go up
 * @returns {HTMLElement} The n-th parent
 */
function nthParent(child, n) {
   let parent = child
   for(let i=0; i<n; i++) {
      parent = parent.parentElement
   }
   return parent
}

/**
 * @typedef {Object} filterResult
 * @property {String} filtered The remaining string after removing the prefix
 * @property {String} found The prefix
 */

/**
 * Searches for a matching prefix in a given string and removes it.
 * It is mainly used to identify filter arguments in search queries.
 * @param {String} string The full text to analyse
 * @param {Array.<String>} prefixes Strings to search for
 * @param {String} [removeFromFilter] Characters to include in the search but remove from the filter result
 * @returns {filterResult} The filter result
 * @example
 * let string = 's:Firefly'
 * let prefixes = ['s:', 'm:']
 * let remaining = startsWithFilter('s:Firefly', 's:', ':')
 * remaining == {
 *    filtered: 'Firefly',
 *    found: 's'
 * }
 */
function startsWithFilter(string, prefixes, removeFromFilter) {
   string = string.toString()
   for(let pre in prefixes) {
      if(string.startsWith(prefixes[pre])) {
         return {
            filtered: string.split(prefixes[pre])[1],
            found: prefixes[pre].split(removeFromFilter || '').join('')
         }
      }
   }
   
   return {
      found: null,
      filtered: string
   }
}


module.exports = {
   printLog, debugLog,
   inRange, shadeHexColor, clone,
   ipcChannels, ipcParallel, nthParent,
   startsWithFilter
}
