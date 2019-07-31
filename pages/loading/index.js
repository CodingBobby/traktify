const trakt = remote.getGlobal('trakt')

window.onload = function() {
   ipcRenderer.send('loading-screen', 'loaded')

   ipcRenderer.on('loading-screen', async (event, data) => {
      if(data === 'start') {
         debugLog('loading', 'started')
         
         debugLog('loading', 'activities')
         let activities = await newActivitiesAvailable()
      
         debugLog('loading', 'up next to watch')
         let upNext = await getUpNextToWatch()
         
         debugLog('loading', 'done')
         setTimeout(() => {
            ipcRenderer.send('loading-screen', 'done')
         }, 10) // giving some small extra timeout
      }
   })
}
