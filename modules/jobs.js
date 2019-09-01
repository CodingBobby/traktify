process.once('message', m => {
   switch(m.func) {
      case 'test': {
         setTimeout(() => {
            // send the raw data back
            process.send(m.args)
         }, 1500)
         break
      }
   }
})
