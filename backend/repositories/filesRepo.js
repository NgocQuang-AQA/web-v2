import mongoose from 'mongoose'

class FilesRepoMongo {
  constructor(dbName) {
    this.dbName = dbName
  }
  conn() {
    return mongoose.connection.useDb(this.dbName, { useCache: true })
  }
  col(name) {
    return this.conn().db.collection(name)
  }
  async count(collection, filter = {}) {
    const { from, to, name, key } = filter || {}
    if (!from && !to && !name && !key) {
      return this.col(collection).countDocuments({})
    }
    const match = {}
    if (from) match._tiDate = { ...(match._tiDate || {}), $gte: new Date(from) }
    if (to) match._tiDate = { ...(match._tiDate || {}), $lte: new Date(to) }
    if (name) match.name = { $regex: String(name), $options: 'i' }
    if (key) match.key = String(key)
    const pipeline = [
      {
        $addFields: {
          _tiDate: {
            $convert: {
              input: '$time_insert',
              to: 'date',
              onError: null,
              onNull: null,
            },
          },
        },
      },
      { $match: match },
      { $count: 'n' },
    ]
    const arr = await this.col(collection).aggregate(pipeline).toArray()
    return arr[0]?.n || 0
  }
  async find(
    collection,
    {
      page = 1,
      pageSize = 20,
      from,
      to,
      sortBy = 'time_insert',
      order = 'desc',
      name,
      key,
    } = {}
  ) {
    const dir = String(order).toLowerCase() === 'asc' ? 1 : -1
    const match = {}
    if (from) match._tiDate = { ...(match._tiDate || {}), $gte: new Date(from) }
    if (to) match._tiDate = { ...(match._tiDate || {}), $lte: new Date(to) }
    if (name) match.name = { $regex: String(name), $options: 'i' }
    if (key) match.key = String(key)
    const sort = (() => {
      if (String(sortBy) === 'name') return { name: dir }
      if (String(sortBy) === 'size') return { _sizeNum: dir }
      return { _tiDate: dir }
    })()
    const pipeline = [
      {
        $addFields: {
          _tiDate: {
            $convert: {
              input: '$time_insert',
              to: 'date',
              onError: null,
              onNull: null,
            },
          },
          _sizeNum: {
            $convert: { input: '$size', to: 'int', onError: 0, onNull: 0 },
          },
        },
      },
      { $match: match },
      { $sort: sort },
      { $skip: (Number(page) - 1) * Number(pageSize) },
      { $limit: Number(pageSize) },
    ]
    const items = await this.col(collection).aggregate(pipeline).toArray()
    return items.map((i) => ({ ...i, id: i._id }))
  }
  async findById(collection, id) {
    let _id = id
    try {
      _id = new mongoose.Types.ObjectId(id)
    } catch {}
    const doc = await this.col(collection).findOne({ _id })
    return doc ? { ...doc, id: doc._id } : null
  }
  async insertMany(collection, items) {
    if (!Array.isArray(items) || items.length === 0) return { inserted: 0 }
    const res = await this.col(collection).insertMany(items)
    return { inserted: res.insertedCount }
  }
}

export { FilesRepoMongo }
