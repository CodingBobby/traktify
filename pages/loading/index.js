const trakt = remote.getGlobal('trakt')
const relaunchApp = remote.getGlobal('relaunchApp')


window.onload = function() {
   let loadingTime = Date.now()
   ipcRenderer.send('loading-screen', 'loaded')

   function alertChecker() {
      setTimeout(() => {
         let timeTaken = Date.now()-loadingTime
         debugLog('loading check', timeTaken)
   
         if(timeTaken > 12e3) {
            debugLog('loading', 'too long')
            showAlertBox()
         } else {
            alertChecker()
         }
      }, 1e3)
   }

   alertChecker()
   


   ipcRenderer.on('loading-screen', async (event, data) => {
      if(data === 'start') {
         debugLog('loading', 'started')
         
         debugLog('loading', 'activities')
         let activities = await newActivitiesAvailable()
      
         debugLog('loading', 'up next to watch')
         let upNext = await getUpNextToWatch()
         
         debugLog('loading', 'done')
         setTimeout(() => {
            // telling the app to move on, we need this to trigger the opening of the dashboard page
            ipcRenderer.send('loading-screen', 'done')
         }, 33.3) // giving some small extra timeout
      }
   })
}


function showAlertBox() {
   let alert_box = document.createElement('div')
   alert_box.classList.add('alert_box', 'white_t')
   alert_box.innerHTML = `
      <p>
         Man, this takes long!
         <br>
         Try <span style="text-decoration: underline" onclick="relaunchApp()">relaunching</span> or reach out to us <span style="text-decoration: underline" href="https://github.com/CodingBobby/traktify/issues">here</span> to get help.
      </p>
   `
   document.body.appendChild(alert_box)
}
