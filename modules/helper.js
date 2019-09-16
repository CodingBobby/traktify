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
         console.log(`\x1b[47m\x1b[30m${time} -> ${args[0]}:\x1b[0m`, args[1])
         if(args.length > 2) {
            console.log.apply(null, args.splice(2, args.length-2))
         }
      }
   }
}


module.exports = {
   config, debugLog
}
