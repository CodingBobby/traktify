const client = require('./presence.js')(process.env.discord_key)

module.exports = {
   update: update
}

async function update(options) {
   options = await options
   debugLog('rpc options', options)

   let total = ((options.time.movies+options.time.shows)/60).toFixed(1)

   client.updatePresence({
      details: `${total} hours watched`,
      state: options.state,
      largeImageKey: 'trakt',
      largeImageText: 'traktify',
      instance: false
   })
}
