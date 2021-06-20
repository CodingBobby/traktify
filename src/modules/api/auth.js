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
 * Starts login procedure for the user.
 * @param {Function} onSuccess fires when authenticaion was successful
 * @param {Function} onFailure fires when user couldn't be logged in
 * @memberof Modules.API
 */
function connectUser(onSuccess, onFailue) {
  let config = readConfig()

  return trakt.get_codes().then(poll => {
    tracer.info(`please visit ${poll.verification_url}`)
    tracer.info(`and enter the code ${poll.user_code}`)

    return trakt.poll_access(poll)
  }).then(auth => {
    tracer.log('successfully connected new user')
    trakt.import_token(auth)

    config.user.trakt.auth = auth
    config.user.trakt.status = true
    saveConfig(config)

    onSuccess()
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
}


/**
 * Tries to login to trakt with user credentials saved in the config.
 * @param {Function} onSuccess fires when authenticaion was successful
 * @param {Function} onFailure fires when user couldn't be logged in
 * @memberof Modules.API
 */
function authenticateUser(onSuccess, onFailue) {
  let config = readConfig()
  let auth = config.user.trakt.auth

  trakt.import_token(auth).then(() => {
    trakt.refresh_token(auth).then(newAuth => {
      // update config with latest credentials
      config.user.trakt.auth = newAuth
      config.user.trakt.status = true
      saveConfig(config)

      onSuccess()
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
