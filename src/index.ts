type Node = {
  demand?: string[]
  get: (object: any, options: any) => any
  oneOf?: string[][]
  type?: string
}

type Nodes = {
  [x: string]: Node
}

type Parsers = {
  [x: string]: (object: any, options: any) => any
}

type Obj = { [x: string]: any }
type Tar = string[]
type preRoute = { [x: string]: number }

class RelationX {
  apis: Nodes
  private parsers: Parsers
  constructor({ nodes, parsers }: { nodes: Nodes, parsers?: Parsers }) {
    this.apis = nodes
    this.parsers = {
      ...parsers,
      _none: <T>(e: T): T => e
    }
    Object
      .values(this.apis)
      .forEach(({ type }) => {
        if (type && !this.parsers[type]) {
          throw new Error(`Unknow Type: ${type}`)
        }
      })
  }

  router({ object, targets, map = [], preRoute = {} }: { object: Obj, targets: Tar, map?: string[], preRoute?: any }): { error: string[] } | { preRoute: preRoute } {
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i]
      if (!object[target]) {
        if (!this.apis[target]) {
          return { error: [target, '?'] }
        }
        if (map.includes(target)) {
          return { error: [target, 'LOOP'] }
        }
        const demands = this.apis[target].demand
        if (demands) {
          const routeResult = this.router({ object, targets: demands, map: [...map, target], preRoute })
          if ('error' in routeResult) {
            return { error: [target, ...routeResult.error] }
          }
        }

        let { oneOf } = this.apis[target]
        if (oneOf) {
          let errors = []
          for (let j = 0; j < oneOf.length && preRoute[target] === undefined; j++) {
            const routeResult = this.router({ object, targets: oneOf[j], map: [...map, target], preRoute })
            if ('error' in routeResult) {
              errors.push(routeResult.error.join(' -> '))
            } else {
              preRoute[target] = j
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

  parser(value: any, type: string = '_none', options: any) {
    return this.parsers[type](value, options)
  }

  async get({ object, targets, preRoute }: { object: Obj, targets: Tar, preRoute: preRoute }, options: any) {
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i]
      if (!object[target]) {
        let targetAPI = this.apis[target]
        let { oneOf = [], demand = [], type } = targetAPI
        let oneOfDemand = oneOf[preRoute[target]] || []
        this.get({ object, targets: [...demand, ...oneOfDemand], preRoute }, options)
        object[target] = (async () => this.parser(await targetAPI.get(Object.fromEntries(await Promise.all([...demand, ...oneOfDemand].map(async v => [v, await object[v]]))), options), type, options))()
        // Hiahiahia
      }
    }
  }

  relation = async (object: Obj, targets: string[], options?: any) => {
    const routeResult = this.router({ object, targets })
    if ('error' in routeResult) {
      throw new Error(`Target route: ${routeResult.error.join(' -> ')}`)
    }
    const { preRoute } = routeResult
    this.get({ object, targets, preRoute }, options)
    return Object.fromEntries(await Promise.all(Object.keys(object).map(async key => [key, await object[key]])))
  }
}

export = RelationX
