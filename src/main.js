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

// prepare log listener before the app starts
//initLogListener()


const electron = require('electron')
const { SwitchBoard } = require('./modules/manager/ipc.js')
const { startApp } = require('./modules/app/start.js')
const { initLogListener } = require('./modules/app/listener.js')
const { getAPIKeys } = require('./modules/api/init.js')
const { initFileStructure, readConfig } = require('./modules/app/files.js')
const tracer = require('./modules/manager/log.js')

startApp(async loadingWindow => {
  // Loading window is shown and page is fully rendered.
  let steps = 5 // tasks to complete in this callback

  // open communication with render process
  const SB = new SwitchBoard({ window: loadingWindow })

  // make tracer available for the window
  initLogListener(SB)
  await SB.send('report.progress', 0/steps)

  // get/check the API keys
  const KEYS = getAPIKeys()
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

    } else {
      tracer.log('no user found')
      await SB.send('report.progress', 3/steps)

      // move to login page
    }
  })
})





// example for queue and task stuff

const { Queue, Task } = require('./modules/manager/queue.js')
const { ipcMain } = require('electron')

function sum(arr, update) {
  let s = 0
  for (i in arr) {
    s += arr[i]
    update(i/arr.length)
  }
  return s
}

function progress(fraction) {
  console.log(`Progress: ${Math.round(fraction*100)} %`)
}

new Task(sum, [1, 2, 3, 4, 5], progress).run().then(console.log)
