const path = require('path')
require('../app.js') // because the process envs are set here

const {
    initFileStructure,
    getAPIKeys
} = require('../modules/app/files.js')

test('General environment', async () => {
    let appPath = process.env.APP_PATH
    expect(typeof appPath).toBe('string')

    let base = path.basename(appPath)
    expect(base).toBe('src')
})

test('File setup', () => {
    return initFileStructure().then(paths => {
        expect(typeof paths).toBe('object')

        let pathList = Object.keys(paths)
        expect(pathList).toContain('cache')
        expect(pathList).toContain('log')
        expect(pathList).toContain('config')
    })
})

test('Key files', () => {
    expect(() => {
        let keys = getAPIKeys()
        expect(typeof keys).toBe('object')
        
        let keyList = Object.keys(keys)
        expect(keyList).toContain('trakt_id')
        expect(keyList).toContain('trakt_secret')
        expect(keyList).toContain('fanart_key')
    }).not.toThrow(Error)
})