import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { postgresPool } from '../config/postgres.js'

const migrationsDirectory = fileURLToPath(new URL('../../migrations/', import.meta.url))
const migrationLockId = 74121543

async function runMigrations() {
  const client = await postgresPool.connect()

  try {
    await client.query('SELECT pg_advisory_lock($1)', [migrationLockId])
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((file) => /^\d+_[\w-]+\.sql$/.test(file))
      .sort()

    for (const name of migrationFiles) {
      await client.query('BEGIN')
      try {
        const applied = await client.query(
          'SELECT 1 FROM schema_migrations WHERE name = $1',
          [name],
        )

        if (applied.rowCount) {
          await client.query('COMMIT')
          continue
        }

        const migrationPath = new URL(`../../migrations/${name}`, import.meta.url)
        const sql = await readFile(migrationPath, 'utf8')
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name])
        await client.query('COMMIT')
        console.log(`Applied database migration: ${name}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }

    console.log('Database migrations are up to date')
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [migrationLockId])
    } finally {
      client.release()
    }
  }
}

try {
  await runMigrations()
} catch (error) {
  console.error('Database migration failed', error)
  process.exitCode = 1
} finally {
  await postgresPool.end()
}
