const trakt = remote.getGlobal('trakt')

window.onload = async function() {
   debugLog('loading', 'activities')
   let activities = await newActivitiesAvailable()

   debugLog('loading', 'up next to watch')
   let upNext = await getUpNextToWatch()
   
   debugLog('loading', 'done')
   setTimeout(() => {
      ipcRenderer.send('loading-screen', 'done')
   }, 0.3e3) // giving some small extra timeout
}
