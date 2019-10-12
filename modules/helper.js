const fs = require('fs')


const config = JSON.parse(fs.readFileSync("./config.json", "utf8"))

function debugLog(...args) {
   if(process.env.NODE_ENV !== 'production') {
      let date = new Date()
      let hr = date.getHours().toString().length === 1 ? '0'+date.getHours() : date.getHours()
      let mi = date.getMinutes().toString().length === 1 ? '0'+date.getMinutes() : date.getMinutes()
      let se = date.getSeconds().toString().length === 1 ? '0'+date.getSeconds() : date.getSeconds()
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
}

// Range must be an array of two numeric values
function inRange(value, range) {
   let [min, max] = range; max < min ? [min, max] = [max, min] : [min, max]
   return value >= min && value <= max
}
 
// takes a hex color code and changes it's brightness by the given percentage. Positive value to brighten, negative to darken a color. Percentages are taken in range from 0 to 100 (not 0 to 1!).
// function mainly used to generate dark version of the accent colors
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
 
// Simple helper to clone objects which prevents cross-linking.
function clone(object) {
   if(null == object || "object" != typeof object) return object
   // create new blank object of same type
   let copy = object.constructor()
 
   // copy all attributes into it
   for(let attr in object) {
      if(object.hasOwnProperty(attr)) {
         copy[attr] = object[attr]
      }
   }
   return copy
}


module.exports = {
   config, debugLog, inRange, shadeHexColor, clone
}
