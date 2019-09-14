/* global describe */
/* global context */
/* global it */
const { RelationX } = require('..')

const chai = require('chai')
const assert = chai.assert

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

const nodes = {
  area: {
    oneOf: [
      ['x', 'y'],
      ['volume', 'height']
    ],
    get: ({ x, y, volume, height }) => {
      if (x) {
        return x * y
      }
      if (volume) {
        return volume / height
      }
    }
  },
  x: {
    demand: ['y', 'area'],
    get: ({ area, y }) => area / y
  },
  y: {
    demand: ['x', 'area'],
    get: ({ x, area }) => area / x
  },
  volume: {
    oneOf: [
      ['area', 'height'],
      ['mass', 'density']
    ],
    get: ({ area, height, mass, density }) => {
      if (area) {
        return area * height
      }
      if (mass) {
        return Number(mass.replace('kg', '')) / density
      }
    }
  },
  height: {
    demand: ['volume', 'area'],
    get: ({ volume, area }) => volume / area
  },
  density: {
    demand: ['volume', 'mass'],
    get: ({ volume, mass }) => Number(mass.replace('kg', '')) / volume
  },
  mass: {
    demand: ['volume', 'density'],
    type: 'kg',
    get: ({ volume, density }) => density * volume
  },
  wow: {
    get: () => 233
  },
  wowAsyncMassDouble: {
    demand: ['mass'],
    type: 'asyncParser',
    get: async ({ mass }) => {
      await wait(10)
      return mass
    }
  },
  wowAsyncMass: {
    demand: ['mass'],
    get: async ({ mass }) => {
      await wait(10)
      return mass
    }
  },
  wowMassDouble: {
    demand: ['mass'],
    type: 'asyncParser',
    get: ({ mass }) => {
      return mass
    }
  },
  repeatGetter: {
    demand: ['x'],
    get: ({ x }) => x
  },
  optionalMass: {
    demand: ['wowAsyncMass'],
    optional: ['repeatGetter'],
    get: ({ wowAsyncMass, repeatGetter = 1 }) => {
      return wowAsyncMass.repeat(repeatGetter)
    }
  }
}

const parsers = {
  kg: num => `${num}kg`,
  asyncParser: async data => {
    await wait(10)
    return `${data}${data}`
  }
}

describe('RelationX', function() {
  context('Class RelationX', function() {
    it('RelationX()', function() {
      return assert.isFunction(RelationX)
    })
    it('New', function() {
      let relation = new RelationX()
      return assert.isObject(relation)
    })
    it('relation()', function() {
      let { relation } = new RelationX({ nodes, parsers })
      return assert.isFunction(relation)
    })
    it('solve()', function() {
      let { solve } = new RelationX({ nodes, parsers })
      return assert.isFunction(solve)
    })
  })

  context('Route', function() {
    it('throws when no require input', function() {
      let { relation } = new RelationX({ nodes, parsers })
      assert.throws(() => relation({}, ['area']))
    })
    it('throws when unknow target', function() {
      let { relation } = new RelationX({ nodes, parsers })
      assert.throws(() => relation({}, ['simon3000']))
    })
    it('not throw when no input require', function() {
      let { relation } = new RelationX({ nodes, parsers })
      assert.doesNotThrow(() => relation({}, ['wow']))
    })
    it('throws when no parser', function() {
      assert.throws(() => new RelationX({
        parsers,
        nodes: {
          ...nodes,
          noParser: {
            get: () => 233,
            type: 'notExist'
          }
        }
      }))
    })
    it('preRoute', function() {
      let { preRoute } = (new RelationX({ nodes, parsers })).router({ object: { x: 2, y: 3 }, targets: ['area'] })
      return assert.strictEqual(preRoute.area, 0)
    })
  })

  context('relation', function() {
    let { relation } = new RelationX({ nodes, parsers })
    it('independent value', function() {
      let { wow } = relation({}, ['wow'])
      assert.strictEqual(wow, 233)
    })
    it('undefined object', function() {
      let { wow } = relation(undefined, ['wow'])
      assert.strictEqual(wow, 233)
    })
    it('undefined target', function() {
      let { wow } = relation({}, undefined)
      assert.strictEqual(wow, undefined)
    })
    it('dependent value', function() {
      let x = 2
      let y = 3
      let { area } = relation({ x, y }, ['area'])
      assert.strictEqual(area, x * y)
    })
    it('oneOf', function() {
      let volume = 2
      let height = 3
      let { area } = relation({ volume, height }, ['area'])
      assert.strictEqual(area, volume / height)
    })
    it('parsers', function() {
      let volume = 2
      let density = 3
      let { mass } = relation({ volume, density }, ['mass'])
      assert.strictEqual(mass, volume * density + 'kg')
    })
    it('optional', async function() {
      const { optionalMass } = await relation({ x: 2, y: 10, height: 10, density: 2 }, ['optionalMass'])
      assert.strictEqual(optionalMass, '400kg400kg')
    })
    it('optional is undefined', async function() {
      const { optionalMass } = await relation({ area: 20, height: 10, density: 2 }, ['optionalMass'])
      assert.strictEqual(optionalMass, '400kg')
    })

    context('more', function() {
      it('mass', function() {
        let x = 28
        let y = 8
        let height = 17
        let density = 3
        let { mass } = relation({ x, y, height, density }, ['mass'])
        assert.strictEqual(mass, x * y * height * density + 'kg')
      })
      it('height', function() {
        let x = 28
        let y = 8
        let density = 3
        let mass = '29kg'
        let { height } = relation({ x, y, mass, density }, ['height'])
        assert.strictEqual(height, 29 / density / (x * y))
      })
    })

    context('async', function() {
      it('not async', function() {
        let density = 3
        let volume = 30
        let pending = relation({ density, volume }, ['mass'])
        assert.notInstanceOf(pending, Promise)
      })
      it('async get', async function() {
        let density = 3
        let volume = 30
        let pending = relation({ density, volume }, ['wowAsyncMass'])
        assert.instanceOf(pending, Promise)
        let { wowAsyncMass, mass } = await pending
        assert.strictEqual(wowAsyncMass, mass)
      })
      it('async parser', async function() {
        let density = 3
        let volume = 30
        let pending = relation({ density, volume }, ['wowMassDouble'])
        assert.instanceOf(pending, Promise)
        let { wowMassDouble, mass } = await pending
        assert.strictEqual(wowMassDouble, `${mass}${mass}`)
      })
      it('async get async parser', async function() {
        let density = 3
        let volume = 30
        let pending = relation({ density, volume }, ['wowAsyncMassDouble'])
        assert.instanceOf(pending, Promise)
        let { wowAsyncMassDouble, mass } = await pending
        assert.strictEqual(wowAsyncMassDouble, `${mass}${mass}`)
      })
      it('force async', function() {
        let density = 3
        let volume = 30
        let pending = relation({ density, volume }, ['mass'], { async: true })
        assert.instanceOf(pending, Promise)
      })
    })
  })
})
