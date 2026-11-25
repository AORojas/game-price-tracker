import type { PoolClient } from 'pg'
import { postgresPool } from './config/postgres.js'
import { redisClient } from './config/redis.js'
import { processNextCatalogOfferRefresh } from './services/catalogIngestion.service.js'

const DEFAULT_POLL_INTERVAL_MS = 5_000
const MIN_POLL_INTERVAL_MS = 1_000
const MAX_POLL_INTERVAL_MS = 60_000
const CATALOG_WORKER_LOCK_NAMESPACE = 74121544
const CATALOG_WORKER_LOCK_ID = 1

function getPollIntervalMs() {
  const configuredInterval = process.env.CATALOG_WORKER_POLL_INTERVAL_MS
  if (configuredInterval === undefined || configuredInterval.trim() === '') {
    return DEFAULT_POLL_INTERVAL_MS
  }

  const interval = Number(configuredInterval)
  if (
    !Number.isSafeInteger(interval) ||
    interval < MIN_POLL_INTERVAL_MS ||
    interval > MAX_POLL_INTERVAL_MS
  ) {
    throw new Error(
      `CATALOG_WORKER_POLL_INTERVAL_MS must be an integer between ${MIN_POLL_INTERVAL_MS} and ${MAX_POLL_INTERVAL_MS}`,
    )
  }
  return interval
}

function waitForNextPoll(intervalMs: number, signal: AbortSignal) {
  if (signal.aborted) return Promise.resolve()

  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, intervalMs)
    signal.addEventListener('abort', finish, { once: true })
    if (signal.aborted) finish()
  })
}

async function runCatalogWorker() {
  const pollIntervalMs = getPollIntervalMs()
  const shutdownController = new AbortController()
  const requestShutdown = (signal: NodeJS.Signals) => {
    console.info('Catalog worker shutting down', { signal })
    shutdownController.abort()
  }
  const onSigint = () => requestShutdown('SIGINT')
  const onSigterm = () => requestShutdown('SIGTERM')
  let lockClient: PoolClient | undefined
  let lockAcquired = false

  process.once('SIGINT', onSigint)
  process.once('SIGTERM', onSigterm)

  try {
    await redisClient.connect()
    lockClient = await postgresPool.connect()
    const lockResult = await lockClient.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1, $2) AS locked',
      [CATALOG_WORKER_LOCK_NAMESPACE, CATALOG_WORKER_LOCK_ID],
    )
    lockAcquired = lockResult.rows[0]?.locked === true

    if (!lockAcquired) {
      console.info('Another catalog worker is already running; this instance will exit')
      return
    }

    lockClient.on('error', (error) => {
      console.error('Catalog worker lost its PostgreSQL lock connection', error)
      process.exitCode = 1
      shutdownController.abort()
    })

    const workerId = `catalog-worker-${process.pid}`
    console.info('Catalog worker started', { workerId, pollIntervalMs })

    while (!shutdownController.signal.aborted) {
      try {
        const result = await processNextCatalogOfferRefresh(workerId)
        if (result.status !== 'idle') {
          console.info('Catalog worker processed a job', result)
        }
      } catch (error) {
        console.error('Catalog worker poll failed', error)
      }

      await waitForNextPoll(pollIntervalMs, shutdownController.signal)
    }
  } finally {
    process.off('SIGINT', onSigint)
    process.off('SIGTERM', onSigterm)

    try {
      if (lockClient && lockAcquired) {
        await lockClient.query(
          'SELECT pg_advisory_unlock($1, $2)',
          [CATALOG_WORKER_LOCK_NAMESPACE, CATALOG_WORKER_LOCK_ID],
        )
      }
    } finally {
      lockClient?.release()
      try {
        if (redisClient.isOpen) await redisClient.quit()
      } finally {
        await postgresPool.end()
      }
    }
  }
}

runCatalogWorker().catch((error: unknown) => {
  console.error('Catalog worker stopped unexpectedly', error)
  process.exitCode = 1
})
