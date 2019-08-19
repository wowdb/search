const { MONGO_DB, MONGO_URI } = process.env

const FuzzySearch = require('fz-search')
const { range, flatten } = require('lodash')
const { MongoClient } = require('mongodb')

class Search {
  constructor() {
    this.fetch()
  }

  /**
   * Search for objects
   * @param {string} query Search query
   * @returns {Object[]} Search results
   */
  async search(query) {
    const { fuzzy } = this

    if (!fuzzy) {
      await this._sleep()

      return this.search(query)
    }

    return fuzzy.search(query)
  }

  /**
   * Lookup objects by type and id
   * @param {string} type Object type
   * @param {number[]} ids Object ids
   * @returns {Object[]} Objects
   */
  async lookup(type, ids) {
    const { data } = this

    if (!data) {
      await this._sleep()

      return this.lookup(type, ids)
    }

    return data.filter(
      object => object.type === type && ids.includes(object.id)
    )
  }

  /**
   * Fetch data and index for search
   */
  async fetch() {
    const client = await this._openDatabase()

    console.log('☑️ started')

    const achievements = await this._fetch(
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

    console.log('☑️ achievements')

    const bosses = await this._fetch(
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

    console.log('☑️ bosses')

    const items = await this._fetch(
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

    console.log('☑️ items')

    const mounts = await this._fetch(
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

    console.log('☑️ mounts')

    const pets = await this._fetch(
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

    console.log('☑️ pets')

    const quests = await this._fetch(
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

    console.log('☑️ quests')

    const spells = await this._fetch(
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

    console.log('☑️ spells')

    const zones = await this._fetch(
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

    console.log('☑️ zones')

    this.data = [].concat(
      achievements,
      bosses,
      items,
      mounts,
      pets,
      quests,
      spells,
      zones
    )

    this.fuzzy = new FuzzySearch({
      keys: ['name', 'description'],
      source: this.data
    })

    this._closeDatabase(client)

    console.log('✅ done')
  }

  /**
   * Fetch data and format for search
   * @param {string} collection Name of collection
   * @param {Object} projection Fields to retrieve
   * @method mapper Mapping function
   * @returns {Object[]} Mapped data
   */
  async _fetch(collection, projection, mapper) {
    const count = await this.db.collection(collection).estimatedDocumentCount()

    const data = await Promise.all(
      range(count / 1000).map(index =>
        this.db
          .collection(collection)
          .find({}, projection)
          .limit(1000)
          .skip(index * 1000)
          .toArray()
      )
    )

    return flatten(data).map(mapper)
  }

  /**
   * Open a database connection
   * @returns {MongoClient}
   */
  async _openDatabase() {
    const client = await MongoClient.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    this.db = client.db(MONGO_DB)

    return client
  }

  /**
   * Close the database connection
   * @param {MongoClient} client Database client
   */
  async _closeDatabase(client) {
    await client.close()

    this.db = null
  }

  /**
   * Sleep away
   */
  _sleep() {
    return new Promise(resolve => setTimeout(resolve, 100))
  }
}

module.exports = new Search()
