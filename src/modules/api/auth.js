const tracer = require('../manager/log.js')
const Trakt = require('trakt.tv')
const { getAPIKeys } = require('./init.js')
const { readConfig, saveConfig } = require('../app/files.js')

const apiKeys = getAPIKeys()

const trakt = new Trakt({
  client_id: apiKeys.trakt_id,
  client_secret: apiKeys.trakt_secret
})


/**
 * @callback TraktIsReady
 * @param {Trakt} trakt
 * @memberof Modules.API
 */

/**
 * @typedef {Object} TRAKT_AUTH_POLL
 * @property {string} device_code
 * @property {number} expires_in
 * @property {number} interval
 * @property {string} user_code
 * @property {string} verification_url
 * @memberof Modules.API
 */

/**
 * @callback PollIsReady
 * @param {TRAKT_AUTH_POLL} poll
 * @memberof Modules.API
 */


/**
 * Starts login procedure for the user.
 * A poll-code is provided to be entered when visiting the verification/login page of trakt.
 * The function waits for the user to go though this procedure.
 * @param {PollIsReady} onPoll fires when auth poll can be shared
 * @param {TraktIsReady} onSuccess fires when authenticaion was successful
 * @param {Function} onFailure fires when user couldn't be logged in, who might have cancelled the process or it timed out
 * @memberof Modules.API
 */
function connectUser(onPoll, onSuccess, onFailue) {
  let config = readConfig()

  trakt.get_codes().then(poll => {
    tracer.info(`please visit ${poll.verification_url}`)
    tracer.info(`and enter the code ${poll.user_code}`)

    // send back to frontend
    onPoll(poll)

    // import and save codes for later authentication
    trakt.poll_access(poll).then(auth => {
      tracer.log('successfully connected new user')
      trakt.import_token(auth)
  
      config.user.trakt.auth = auth
      config.user.trakt.status = true
      saveConfig(config)
  
      onSuccess(trakt)
      return true
    }).catch(err => {
      if (err) {
        tracer.warn('authentication failed, removing user credentials')
  
        config.user.trakt.auth = false
        config.user.trakt.status = false
        saveConfig(config)
  
        onFailue()
      }
    })
  })
}


/**
 * Tries to login to trakt with user credentials saved in the config.
 * @param {TraktIsReady} onSuccess fires when authenticaion was successful
 * @param {Function} onFailure fires when user couldn't be logged in, typically means that tokens are expired or have been disabled by the user from his account
 * @memberof Modules.API
 */
function authenticateUser(onSuccess, onFailue) {
  let config = readConfig()
  let auth = config.user.trakt.auth

  trakt.import_token(auth).then(() => {
    trakt.refresh_token(auth).then(newAuth => {
      tracer.log('authentication succeeded')

      // update config with latest credentials
      config.user.trakt.auth = newAuth
      config.user.trakt.status = true
      saveConfig(config)

      onSuccess(trakt)
    }).catch(err => {
      if (err) {
        tracer.warn('authentication failed, removing user credentials')

        config.user.trakt.auth = false
        config.user.trakt.status = false
        saveConfig(config)

        onFailue()
      }
    })
  })
}


module.exports = {
  trakt, connectUser, authenticateUser
}
