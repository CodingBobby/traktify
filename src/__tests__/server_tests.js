describe('testing of the process environment', () => {
  require('../main')
  const path = require('path')
  const init = require('../modules/init')

  test('validating environment variables', () => {
    let basePath = process.env.BASE_PATH
    expect(typeof basePath).toBe('string')

    let initTime = process.env.INIT_TIME
    expect(typeof initTime).toBe('string')
    expect(initTime.length).toBe(13)
    expect(Number(initTime) < Date.now()).toBe(true)
  })

  test('validating directories', () => {
    let basePath = process.env.BASE_PATH
    let base = path.basename(basePath)
    expect(base).toBe('src')
  })

  test('validating API keys', () => {
    let keyList = init.getAPIKeys()

    expect(keyList).toHaveProperty('trakt_id')
    expect(keyList.trakt_id).toHaveLength(64)

    expect(keyList).toHaveProperty('trakt_secret')
    expect(keyList.trakt_secret).toHaveLength(64)

    expect(keyList).toHaveProperty('fanart_key')
    expect(keyList.fanart_key).toHaveLength(32)

    expect(keyList).toHaveProperty('tmdb_key')
    expect(keyList.tmdb_key).toHaveLength(32)

    expect(keyList).toHaveProperty('tvdb_key')
    expect(keyList.tvdb_key).toHaveLength(16)

    expect(keyList).toHaveProperty('discord_key')
    expect(keyList.discord_key).toHaveLength(18)
  })
})


describe('testing the klyft setup', () => {
  const klyft = require('klyft')
  const { WORKER } = require('../server/server')

  test('initialisation and elimination', done => {
    let worker = WORKER.initialise()
    expect(worker).toBeInstanceOf(klyft.Worker)

    WORKER.kill(() => {
      expect(worker.jobQueueHandler.killed).toBe(true)
      done()
    })
  })
})


describe('testing api queries', () => {
  const { WORKER, API } = require('../server/server')

  test('trakt search query', done => {
    WORKER.initialise()

    let searchText = 's:Firefly'

    try {
      API.searchTraktDB(searchText, searchResult => {
        expect(typeof searchResult).toBe('object')

        let resultTypes = searchResult.map(i => i.type)
        expect(['show']).toEqual(expect.arrayContaining(resultTypes))

        WORKER.kill(done)
      })
    } catch (error) {
      done(error)
    }
  })
})
