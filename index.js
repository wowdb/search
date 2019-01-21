const { MONGO_DB, MONGO_URI, PORT } = process.env

const http = require('http')
const url = require('url')

const { MongoClient } = require('mongodb')
const FuzzySearch = require('fz-search')
const get = require('lodash.get')

class Search {
  static async init() {
    await this.fetchData()

    const server = http.createServer(async (request, reply) => {
      const parsed = url.parse(request.url, true)

      const { action, query } = get(parsed, 'query', {})

      if (action === 'reload') {
        await this.fetchData()

        this.reply(reply, 200, {
          status: 'done'
        })
      } else if (query) {
        const data = this.fuzzy.search(query)

        this.reply(reply, 200, data)
      } else {
        this.reply(reply, 400, {
          error: 'Missing query'
        })
      }
    })

    server.listen(PORT, () => {
      console.log(`listening on ${PORT}`)
    })
  }

  static async fetchData() {
    const client = await MongoClient.connect(MONGO_URI, {
      useNewUrlParser: true
    })

    this.db = client.db(MONGO_DB)

    const achievements = await this.fetch(
      'achievements',
      {
        description: 1,
        icon: 1,
        id: 1,
        points: 1,
        title: 1
      },
      ({ description, id, icon, points, title: name }) => ({
        description,
        icon,
        id,
        name,
        points,
        type: 'achievement'
      })
    )

    const bosses = await this.fetch(
      'bosses',
      {
        description: 1,
        id: 1,
        name: 1
      },
      ({ description, id, name }) => ({
        description,
        id,
        name,
        type: 'boss'
      })
    )

    const items = await this.fetch(
      'items',
      {
        icon: 1,
        id: 1,
        itemLevel: 1,
        name: 1,
        quality: 1,
        requiredLevel: 1
      },
      ({ icon, id, itemLevel, name, quality, requiredLevel }) => ({
        icon,
        id,
        itemLevel,
        name,
        quality,
        requiredLevel,
        type: 'item'
      })
    )

    const mounts = await this.fetch(
      'mounts',
      {
        icon: 1,
        spellId: 1,
        name: 1,
        qualityId: 1
      },
      ({ icon, name, qualityId: quality, spellId: id }) => ({
        icon,
        id,
        name,
        quality,
        type: 'mount'
      })
    )

    const pets = await this.fetch(
      'pets',
      {
        creatureId: 1,
        icon: 1,
        name: 1,
        qualityId: 1
      },
      ({ icon, name, creatureId: id, qualityId: quality }) => ({
        icon,
        id,
        name,
        quality,
        type: 'pet'
      })
    )

    const quests = await this.fetch(
      'quests',
      {
        description: 1,
        id: 1,
        title: 1
      },
      ({ description, id, title: name }) => ({
        description,
        id,
        name,
        type: 'quest'
      })
    )

    const spells = await this.fetch(
      'spells',
      {
        description: 1,
        icon: 1,
        id: 1,
        name: 1
      },
      ({ description, icon, id, name }) => ({
        description,
        icon,
        id,
        name,
        type: 'spell'
      })
    )

    const zones = await this.fetch(
      'zones',
      {
        description: 1,
        id: 1,
        name: 1
      },
      ({ description, id, name }) => ({
        description,
        id,
        name,
        type: 'zone'
      })
    )

    client.close()

    this.fuzzy = new FuzzySearch({
      keys: ['name', 'description'],
      source: [].concat(
        achievements,
        bosses,
        items,
        mounts,
        pets,
        quests,
        spells,
        zones
      )
    })

    console.log('data reloaded')
  }

  static async fetch(collection, projection, mapper) {
    const data = await this.db
      .collection(collection)
      .find({}, projection)
      .toArray()

    return data.map(mapper)
  }

  static reply(reply, status, data) {
    reply.writeHead(status, {
      'content-type': 'application/json'
    })

    reply.end(JSON.stringify(data))
  }
}

Search.init()
