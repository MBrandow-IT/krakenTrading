'use server'

import PoolManager from './pool-manager'

const sysConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME,
  options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true
  }
}

interface QueryConfig {
  text: string;
  values?: any[];
}

export async function executeQuery(
  query: string | QueryConfig, 
) {
  const poolManager = PoolManager.getInstance()
  let connectionConfig = {...sysConfig}

  const dbName = 'db_CryptoTracker'

  if (dbName) {
    connectionConfig.database = dbName
  }

  const poolName = `pool-${connectionConfig.database}`

  try {
    const pool = await poolManager.get({
      name: poolName,
      config: connectionConfig
    })

    if (typeof query === 'string') {
      return await pool.request().query(query)
    }
    
    let request = pool.request()
    query.values?.forEach((value, index) => {
      request = request.input(`param${index}`, value)
    })
    return await request.query(query.text)
  } catch (err) {
    console.error('SQL error', err)
    throw err
  }
}