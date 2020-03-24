const {
   inRange, clone, shadeHexColor
} = require('./../src/modules/helper.js')


test('inRange function', () => {
   expect(inRange(3, [-1, 5])).toBe(true)
   expect(inRange(7.123, [0.002159, 7.1230001])).toBe(true)
   expect(inRange(Math.PI, [Math.E, 2*Math.E])).toBe(true)
   expect(inRange(3, [-2, 1])).toBe(false)
   expect(inRange(11, [12668, -22739])).toBe(true)
})


test('clone function', () => {
   let foo = {
      var: 1000
   }
   let bar = clone(foo)
   foo.var += 10
   expect(foo.var).toBe(1010)
   expect(bar.var).toBe(1000)
})


test('shadeHexColor Function', () => {
   expect(shadeHexColor('#fff111', 30)).toBe('#ffff16')
   expect(shadeHexColor('#2b2b11', 30)).toBe('#373716')
   expect(shadeHexColor('#553355', 'string')).toBe('#ffffff')
})
