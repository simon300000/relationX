const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor

class RelationX {
  constructor({ nodes = {}, parsers = {} } = {}) {
    this.apis = nodes
    this.parsers = {
      ...parsers,
      _none: e => e
    }
    Object
      .values(this.apis)
      .forEach(({ type }) => {
        if (type && !this.parsers[type]) {
          throw new Error(`Unknow Type: ${type}`)
        }
      })
    this.relation = (object, targets, options) => this.solve({ object, targets, options })
  }

  router({ object, targets, map = [], preRoute = {}, isAsync = false }) {
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i]
      if (!object[target]) {
        if (!this.apis[target]) {
          return { error: [target, '?'] }
        }
        if (map.includes(target)) {
          return { error: [target, 'LOOP'] }
        }
        isAsync = isAsync || this.apis[target].get instanceof AsyncFunction
        if (this.parsers[this.apis[target].type]) {
          isAsync = isAsync || this.parsers[this.apis[target].type] instanceof AsyncFunction
        }
        if (this.apis[target].demand) {
          let { error, isAsync: isChildAsync } = this.router({ object, targets: this.apis[target].demand, map: [...map, target], preRoute, isAsync })
          if (error) {
            return { error: [target, ...error] }
          } else {
            isAsync = isChildAsync
          }
        }

        let { oneOf } = this.apis[target]
        if (oneOf) {
          let errors = []
          for (let j = 0; j < oneOf.length && preRoute[target] === undefined; j++) {
            let { error, isAsync: isChildAsync } = this.router({ object, targets: oneOf[j], map: [...map, target], preRoute, isAsync })
            if (!error) {
              preRoute[target] = j
              isAsync = isChildAsync
            }
            if (error) {
              errors.push(error.join(' -> '))
            }
          }
          if (preRoute[target] === undefined) {
            return { error: [target, `oneOf: [${errors.join(', ')}]`] }
          }
        }
      }
    }
    return { preRoute, isAsync }
  }

  parser(url, type = '_none', options) {
    return this.parsers[type](url, options)
  }

  get({ object, targets, preRoute, isAsync }, options) {
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i]
      if (!object[target]) {
        let targetAPI = this.apis[target]
        let { oneOf = [], demand = [], type } = targetAPI
        let oneOfDemand = oneOf[preRoute[target]] || []
        this.get({ object, targets: [...demand, ...oneOfDemand], preRoute, isAsync }, options)
        if (isAsync) {
          object[target] = (async () => this.parser(await targetAPI.get(Object.fromEntries(await Promise.all(demand.concat(...oneOfDemand).map(async v => [v, await object[v]]))), options), type, options))()
        } else {
          object[target] = this.parser(targetAPI.get(Object.fromEntries(demand.concat(...oneOfDemand).map(v => [v, object[v]])), options), type, options)
        }
        // Hiahiahia
      }
    }
  }

  solve({ object = {}, targets = [], options = {} }) {
    let { error, preRoute, isAsync } = this.router({ object, targets })
    if (error) {
      throw new Error(`Target route: ${error.join(' -> ')}`)
    }
    this.get({ object, targets, preRoute, isAsync }, options)
    if (isAsync || options.async) {
      return new Promise(async resolve => resolve(Object.fromEntries(await Promise.all(Object.entries(object).map(async ([key, value]) => [key, await value])))))
    } else {
      return object
    }
  }
}

module.exports = {
  RelationX
}
