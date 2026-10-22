import 'dotenv/config'
import { Pool } from 'pg'

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} must be set in the backend environment`)
  }
  return value
}

const databasePort = Number(requiredEnvironmentVariable('DB_PORT'))
if (!Number.isInteger(databasePort) || databasePort < 1 || databasePort > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535')
}

export const postgresPool = new Pool({
  host: requiredEnvironmentVariable('DB_HOST'),
  port: databasePort,
  database: requiredEnvironmentVariable('DB_NAME'),
  user: requiredEnvironmentVariable('DB_USER'),
  password: process.env.DB_PASSWORD ?? '',
})

postgresPool.on('error', (error) => {
  console.error('PostgreSQL pool error', error)
})
