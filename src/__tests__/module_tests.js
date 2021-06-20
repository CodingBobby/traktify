describe('testing helper modules', () => {
  const filters = require('../modules/api/filters.js')

  test('filtering search prefixes', () => {
    let limiter = ':'
    let options = filters.searchShortCuts.map(o => o + limiter)

    let strA = 'tv:firefly'
    let fltA = filters.startsWithFilter(strA, options, limiter)
    expect(fltA).toHaveProperty('found')
    expect(fltA).toHaveProperty('filtered')
    expect(fltA.found).toBe('tv')
    expect(fltA.filtered).toBe('firefly')

    let strB = 'foo:bar'
    let fltB = filters.startsWithFilter(strB, options, limiter)
    expect(fltB).toHaveProperty('found')
    expect(fltB).toHaveProperty('filtered')
    expect(fltB.found).toBe(null)
    expect(fltB.filtered).toBe('foo:bar')
  })

  test('determine search types', () => {
    let strA = 'tv:firefly'
    let fltA = filters.formatSearch(strA)
    expect(fltA).toHaveProperty('found')
    expect(fltA).toHaveProperty('filtered')
    expect(fltA).toHaveProperty('type')
    expect(fltA.found).toBe('tv')
    expect(fltA.filtered).toBe('firefly')
    expect(fltA.type).toBe('show')
  })
})
