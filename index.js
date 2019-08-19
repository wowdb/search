const { PORT } = process.env

const fastify = require('fastify')

const Search = require('./lib/search')

const server = fastify()

server.get('/reload', async () => {
  Search.fetch()

  return {
    status: 'done'
  }
})

server.post('/lookup', async request => {
  const { body } = request

  const types = Object.keys(body)

  const data = await Promise.all(
    types.map(type => Search.lookup(type, body[type]))
  )

  return data.reduce((data, results) => {
    data.push(...results)

    return data
  }, [])
})

server.get('/search', async request => {
  const {
    query: { query }
  } = request

  const data = await Search.search(query)

  return data
})

server.listen(PORT, err => {
  if (err) {
    throw err
  }
})
