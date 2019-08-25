class RelationX {
  constructor({ nodes = {}, parsers = {} }) {
    this.apis = nodes
    this.parsers = { ...parsers,
      _none: e => e
    }
    this.relation = (object, targets, options) => this.solve({ object, targets, options })
  }

  router({ object = {}, targets = [], map = [], preRoute = {} }) {
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i]
      if (!object[target]) {
        if (!this.apis[target]) {
          return { error: [target, '?'] }
        }
        if (map.includes(target)) {
          return { error: [target, 'LOOP'] }
        }
        if (this.apis[target].demand) {
          let { error } = this.router({ object, targets: this.apis[target].demand, map: [...map, target], preRoute })
          if (error) {
            return { error: [target, ...error] }
          }
        }

        let { oneOf } = this.apis[target]
        if (oneOf) {
          let errors = []
          for (let j = 0; j < oneOf.length && preRoute[target] === undefined; j++) {
            let { error } = this.router({ object, targets: oneOf[j], map: [...map, target], preRoute })
            if (!error) {
              preRoute[target] = j
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
    return { preRoute }
  }

  parser(url, type = '_none', options) {
    return this.parsers[type](url, options)
  }

  get({ object, targets = [], preRoute }, options) {
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i]
      if (!object[target]) {
        let targetAPI = this.apis[target]
        let { oneOf = [], demand = [], type } = targetAPI
        let oneOfDemand = oneOf[preRoute[target]] || []
        this.get({ object, targets: [...demand, ...oneOfDemand], preRoute }, options)
        object[target] = (async () => this.parser(await targetAPI.get(Object.assign({}, ...await Promise.all(demand.concat(...oneOfDemand).map(async v => ({
          [v]: await object[v]
        })))), options), type, options))()
        // Hiahiahia
      }
    }
  }

  async solve({ object = {}, targets = [], options }) {
    let { error, preRoute } = this.router({ object, targets })
    if (error) {
      throw new Error(`Target route: ${error.join(' -> ')}`)
    }
    this.get({ object, targets, preRoute }, options)
    return Object.assign({}, ...await Promise.all(Object.keys(object).map(async key => ({
      [key]: await object[key]
    }))))
  }
}

module.exports = {
  RelationX
}
