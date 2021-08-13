/**
 *        .....                                         ..           s       .
 *     .H8888888h.  ~-.                           < .z@8"`          :8      @88>     oec :    ..
 *     888888888888x  `>    .u    .                !@88E           .88      %8P     @88888   @L
 *    X~     `?888888hx~  .d88B :@8c        u      '888E   u      :888ooo    .      8"*88%  9888i   .dL
 *    '      x8.^"*88*"  ="8888f8888r    us888u.    888E u@8NL  -*8888888  .@88u    8b.     `Y888k:*888.
 *     `-:- X8888x         4888>'88"  .@88 "8888"   888E`"88*"    8888    ''888E`  u888888>   888E  888I
 *          488888>        4888> '    9888  9888    888E .dN.     8888      888E    8888R     888E  888I
 *        .. `"88*         4888>      9888  9888    888E~8888     8888      888E    8888P     888E  888I
 *      x88888nX"      .  .d888L .+   9888  9888    888E '888&   .8888Lu=   888E    *888>     888E  888I
 *     !"*8888888n..  :   ^"8888*"    9888  9888    888E  9888.  ^%888*     888&    4888     x888N><888'
 *    '    "*88888888*       "Y"      "888*""888" '"888*" 4888"    'Y"      R888"   '888      "88"  888
 *            ^"***"`                  ^Y"   ^Y'     ""    ""                ""      88R            88F
 *                                                                                   88>           98"
 * is a desktop app for trakt.tv                                                     48          ./"
 * created by @CodingBobby and @Bumbleboss in 2019                                   '8         ~`
 * using the trakt api with the trakt.js library
 * in an electron framework
 */


/**
 * Main process executed at app-start.
 * @namespace Traktify
 */
/**
 * Collection of methods, classes and objects that are used by the main.
 * @namespace Modules
 */
/**
 * Entry point of the electron.js app.
 * Defines windows and listeners.
 * @namespace App
 * @memberof Modules
 */
/**
 * Methods and utilities related to API requests.
 * For details on the trakt.tv API, see {@link https://github.com/vankasteelj/trakt.tv/blob/master/docs/available_methods.md}.
 * @namespace API
 * @memberof Modules
 */
/**
 * Task management and automation.
 * @namespace Manager
 * @memberof Modules
 */


/**
 * Unix-time of initialisation.
 * @type {number}
 * @memberof Traktify
 */
const INIT_TIME = Date.now()
process.env.INIT_TIME = INIT_TIME


/**
 * Path to src/ which is parent to all files.
 * @type {string}
 * @memberof Traktify
 */
const BASE_PATH = __dirname
process.env.BASE_PATH = BASE_PATH


const electron = require('electron')
const tracer = require('./modules/manager/log.js')
const { SwitchBoard } = require('./modules/manager/ipc.js')
const { startApp, loadPage } = require('./modules/app/start.js')
const { initLogListener } = require('./modules/app/listener.js')
const { getAPIKeys } = require('./modules/api/init.js')
const { initFileStructure, readConfig } = require('./modules/app/files.js')
const { connectUser, authenticateUser } = require('./modules/api/auth.js')

startApp(appWindow => {
  // loading window is ready for content to be rendered

  loadPage({
    window: appWindow,
    page: 'loading'
  }, async () => {
    let steps = 5 // tasks to complete in this callback

    // open communication channel with render process
    const SB = new SwitchBoard({ window: appWindow })

    // make tracer available for the window
    initLogListener(SB)
    await SB.send('report.progress', 0/steps)

    // check the API keys
    getAPIKeys()
    await SB.send('report.progress', 1/steps)

    // check/fix the local file structure
    initFileStructure().then(async (PATHS, rejected) => {
      // will only get rejected if files cannot be written or read
      if (rejected) {
        tracer.warn(rejected)
        return
      }
      await SB.send('report.progress', 2/steps)

      // check if user exists in config
      const CONFIG = readConfig()

      if (CONFIG.user.trakt.auth) {
        tracer.log('found existing user')
        await SB.send('report.progress', 3/steps)

        // try to authenticate
        authenticateUser(async trakt => {
          // user is now connected
          await SB.send('report.progress', 4/steps)

          // loading can proceed with user-specific things
          userLoading(trakt, SB)
        }, () => {})

      } else {
        tracer.log('no user found')
        await SB.send('report.progress', 3/steps)

        enterLogin()

        function enterLogin() {
          loadPage({
            window: appWindow,
            page: 'login'
          }, () => {
            // here, the user sees a login-screen which only proceeds with this when clicking a button

            // this request is sent by that button
            SB.on('request.authpoll', (_data, done) => {
              tracer.log('poll request received')

              connectUser(async poll => {
                done(poll)

              }, async trakt => {
                // user is connected and loading can proceed with user-specific things
                loadPage({
                  window: appWindow,
                  page: 'loading'
                }, async () => {
                  await SB.send('report.progress', 4/steps)
                  userLoading(trakt, SB)
                })

              }, () => {
                // login didn't work, so go back
                enterLogin()
              })

            })
          })
        }

      }
    })

  })

})


const { initGetListener } = require('./modules/app/listener.js')

function userLoading(trakt, SB) {
  initGetListener(trakt, SB)

  // trakt.tv requests can now be done for loading
}
