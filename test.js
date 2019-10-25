const { RelationX } = require('.')
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
  no: {
    get: () => undefined.ww
  },
  ohno: {
    type: 'error',
    get: () => 233
  }
}

const parsers = {
  kg: num => `${num}kg`,
  asyncParser: async data => {
    await wait(10)
    return `${data}${data}`
  },
  error: () => undefined.ww
}

let { relation } = new RelationX({ nodes, parsers })
relation({}, ['no']).catch(console.log)
relation({}, ['ohno']).catch(console.log)

// // Promise.all([
//   new Promise((r,j) => {
//   // r(await new Promise((_, j) => {
//     // setTimeout(j, 1000, 233)
//   // }))
//   // r(233)
//   throw 233
//   // await Promise.reject(233)
//   // r(233)
//   // r(Promise.reject(233))
// })
// // ])
// // .then(async e => (await Promise.reject(23333)))
// .catch(console.log)

// // wow
// ;

// (async () => {
// //   const a = new Promise((_, j) => {
// //     setTimeout(j, 1000, 233)
// //   })
// //   return a

//   await Promise.reject('www')
//   // return Promise.reject('www')
// })().catch(console.log)
