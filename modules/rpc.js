let config = remote.getGlobal('config')
let on = config.client.settings.app['discord rpc'].status

let client = require('./presence.js')

if(on) client = client(process.env.discord_key)

module.exports = {
   update: update
}

async function update(options) {
   options = await options
   debugLog('rpc status', options.state)

   let total = ((options.time.movies+options.time.shows)/60).toFixed(1)

   client.updatePresence({
      details: `watched for ${total} hours`,
      state: options.state,
      largeImageKey: 'trakt',
      largeImageText: 'traktify',
      instance: false
   })
}
