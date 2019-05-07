/* global describe */
/* global context */
/* global it */
const { RelationX } = require('..')

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const assert = chai.assert

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
  }
}

const parsers = {
  kg: num => `${num}kg`
}

describe('RelationX', function() {
  context('Class RelationX', function() {
    it('RelationX()', function() {
      return assert.isFunction(RelationX)
    })
    it('New', function() {
      let relation = new RelationX({ nodes })
      return assert.isObject(relation)
    })
    it('relation()', function() {
      let { relation } = new RelationX({ nodes })
      return assert.isFunction(relation)
    })
    it('solve()', function() {
      let { solve } = new RelationX({ nodes })
      return assert.isFunction(solve)
    })
  })
  context('Route', function() {
    it('reject when no require input', function() {
      let { relation } = new RelationX({ nodes })
      return assert.isRejected(relation({}, ['area']))
    })
    it('reject when unknow target', function() {
      let { relation } = new RelationX({ nodes })
      return assert.isRejected(relation({}, ['simon3000']))
    })
    it('not reject when no input require', function() {
      let { relation } = new RelationX({ nodes })
      return assert.isFulfilled(relation({}, ['wow']))
    })
    it('preRoute', function() {
      let { preRoute } = (new RelationX({ nodes })).router({ object: { x: 2, y: 3 }, targets: ['area'] })
      return assert.strictEqual(preRoute.area, 0)
    })
  })
  context('relation', function() {
    let { relation } = new RelationX({ nodes, parsers })
    it('independent value', async function() {
      let { wow } = await relation({}, ['wow'])
      assert.strictEqual(wow, 233)
    })
    it('dependent value', async function() {
      let x = 2
      let y = 3
      let { area } = await relation({ x, y }, ['area'])
      assert.strictEqual(area, x * y)
    })
    it('oneOf', async function() {
      let volume = 2
      let height = 3
      let { area } = await relation({ volume, height }, ['area'])
      assert.strictEqual(area, volume / height)
    })
    it('parsers', async function() {
      let volume = 2
      let density = 3
      let { mass } = await relation({ volume, density }, ['mass'])
      assert.strictEqual(mass, volume * density + 'kg')
    })
    context('more', async function() {
      it('mass', async function() {
        let x = 28
        let y = 8
        let height = 17
        let density = 3
        let { mass } = await relation({ x, y, height, density }, ['mass'])
        assert.strictEqual(mass, x * y * height * density + 'kg')
      })
      it('height', async function() {
        let x = 28
        let y = 8
        let density = 3
        let mass = '29kg'
        let { height } = await relation({ x, y, mass, density }, ['height'])
        assert.strictEqual(height, 29 / density / (x * y))
      })
    })
  })
})
