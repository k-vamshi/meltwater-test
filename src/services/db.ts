import {Pool} from 'pg'

interface DbClient {
  client: any,
}

class DataBaseClient implements DbClient {
  constructor() {
    this.client = new Pool({
      ...
    })
  }
}

export const dbClient = new DataBaseClient();