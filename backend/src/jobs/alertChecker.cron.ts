import cron from 'node-cron'
import { postgresPool } from '../config/postgres.js'
import { gameService } from '../services/game.service.js'
import { sendAlertEmail, type AlertEmail } from '../services/email.service.js'

const ADVISORY_LOCK_ID = 74121544
const OUTBOX_BATCH_SIZE = 50
const EMAIL_CONCURRENCY = 2
const PRICE_CHECK_CONCURRENCY = 2
const RETRY_DELAY_MINUTES = [1, 5, 15]
const STALE_SENDING_MINUTES = 10

type DueAlert = {
  id: string
  email: string
  game_title: string | null
  cheapshark_id: string
  target_price: string
  notification_version: number
}

type OutboxEmail = AlertEmail & {
  outbox_id: string
  attempt_count: number
}

function positiveIntegerEnvironmentVariable(name: string, defaultValue: number) {
  const rawValue = process.env[name]
  const value = rawValue === undefined ? defaultValue : Number(rawValue)
  if (!Number.isInteger(value) || value < 1 || value > 168) {
    throw new Error(`${name} must be an integer between 1 and 168`)
  }
  return value
}

async function forEachConcurrent<T>(
  values: T[],
  concurrency: number,
  callback: (value: T) => Promise<void>,
) {
  let nextIndex = 0
  const errors: unknown[] = []
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex
        nextIndex += 1
        try {
          await callback(values[index])
        } catch (error) {
          errors.push(error)
        }
      }
    }),
  )
  if (errors.length > 0) {
    throw new AggregateError(errors, 'One or more concurrent alert tasks failed')
  }
}

async function getDueAlerts(intervalHours: number) {
  const result = await postgresPool.query<DueAlert>(
    `SELECT a.id::text AS id, u.email, a.game_title, a.cheapshark_id,
            a.target_price::text AS target_price, a.notification_version
     FROM user_alerts a
     JOIN users u ON u.id = a.user_id
     WHERE a.is_active = TRUE
       AND a.is_notified = FALSE
       AND a.cheapshark_id IS NOT NULL
       AND u.email NOT LIKE '%@placeholder.local'
       AND (a.last_checked_at IS NULL
            OR a.last_checked_at <= NOW() - ($1::int * INTERVAL '1 hour'))
     ORDER BY a.id`,
    [intervalHours],
  )
  return result.rows
}

async function updateLastChecked(alerts: DueAlert[]) {
  if (alerts.length === 0) return

  await postgresPool.query(
    `UPDATE user_alerts
     SET last_checked_at = NOW()
     WHERE id = ANY($1::bigint[])
       AND is_active = TRUE
       AND is_notified = FALSE`,
    [alerts.map((alert) => alert.id)],
  )
}

async function notifyAlert(
  alert: DueAlert,
  gameTitle: string,
  offer: { price: number; currency: string; store: string; dealId: string },
) {
  const client = await postgresPool.connect()
  try {
    await client.query('BEGIN')
    const updated = await client.query<{
      notification_version: number
      target_price: string
    }>(
      `UPDATE user_alerts
       SET is_notified = TRUE,
           notified_at = NOW(),
           last_checked_at = NOW(),
           notification_version = notification_version + 1
       WHERE id = $1
         AND is_active = TRUE
         AND is_notified = FALSE
         AND notification_version = $2
         AND target_price = $3::numeric
       RETURNING notification_version, target_price::text AS target_price`,
      [alert.id, alert.notification_version, alert.target_price],
    )

    const current = updated.rows[0]
    if (!current) {
      await client.query('COMMIT')
      return
    }

    await client.query(
      `INSERT INTO user_alert_email_outbox
         (alert_id, notification_version, game_title, target_price,
          current_price, currency, store_name, deal_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        alert.id,
        current.notification_version,
        alert.game_title ?? gameTitle,
        current.target_price,
        offer.price,
        offer.currency,
        offer.store,
        offer.dealId,
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function checkGameAlerts(alerts: DueAlert[]) {
  const gameId = alerts[0].cheapshark_id
  let comparison
  try {
    comparison = await gameService.getGamePrices(gameId)
  } catch (error) {
    console.error('Failed to check CheapShark prices for alert game', {
      cheapsharkId: gameId,
      error,
    })
    await updateLastChecked(alerts)
    return
  }

  const cheapestOffer = comparison.prices[0]
  if (cheapestOffer) {
    await forEachConcurrent(alerts, PRICE_CHECK_CONCURRENCY, async (alert) => {
      if (cheapestOffer.price <= Number(alert.target_price)) {
        await notifyAlert(alert, comparison.game.title, cheapestOffer)
      }
    })
  }
  await updateLastChecked(alerts)
}

async function checkDueAlerts(intervalHours: number) {
  const alerts = await getDueAlerts(intervalHours)
  const alertsByGame = new Map<string, DueAlert[]>()
  for (const alert of alerts) {
    const gameAlerts = alertsByGame.get(alert.cheapshark_id) ?? []
    gameAlerts.push(alert)
    alertsByGame.set(alert.cheapshark_id, gameAlerts)
  }

  const games = Array.from(alertsByGame.values())
  await forEachConcurrent(games, PRICE_CHECK_CONCURRENCY, checkGameAlerts)
  if (games.length > 0) {
    console.info('Checked prices for alert games', {
      games: games.length,
      alerts: alerts.length,
    })
  }
}

async function reclaimStaleOutboxRows() {
  await postgresPool.query(
    `UPDATE user_alert_email_outbox
     SET status = 'failed',
         locked_at = NULL,
         next_attempt_at = NOW(),
         last_error = COALESCE(last_error, 'Recovered an interrupted email attempt')
     WHERE status = 'sending'
       AND locked_at < NOW() - ($1::int * INTERVAL '1 minute')`,
    [STALE_SENDING_MINUTES],
  )
}

async function claimOutboxBatch() {
  const client = await postgresPool.connect()
  try {
    await client.query('BEGIN')
    const selected = await client.query<OutboxEmail>(
      `SELECT o.id::text AS outbox_id, o.alert_id::text AS id,
              o.notification_version, u.email, o.game_title,
              o.target_price::text AS target_price,
              o.current_price::text AS current_price, o.currency,
              o.store_name, o.deal_id, o.attempt_count
       FROM user_alert_email_outbox o
       JOIN user_alerts a ON a.id = o.alert_id
       JOIN users u ON u.id = a.user_id
       WHERE o.status IN ('pending', 'failed')
         AND o.next_attempt_at <= NOW()
         AND a.is_active = TRUE
         AND a.is_notified = TRUE
         AND a.notification_version = o.notification_version
       ORDER BY o.next_attempt_at, o.id
       LIMIT $1
       FOR UPDATE OF o SKIP LOCKED`,
      [OUTBOX_BATCH_SIZE],
    )

    const claimed: OutboxEmail[] = []
    for (const row of selected.rows) {
      const updated = await client.query<{ attempt_count: number }>(
        `UPDATE user_alert_email_outbox
         SET status = 'sending', attempt_count = attempt_count + 1, locked_at = NOW()
         WHERE id = $1
         RETURNING attempt_count`,
        [row.outbox_id],
      )
      const attemptCount = updated.rows[0]?.attempt_count
      if (attemptCount !== undefined) claimed.push({ ...row, attempt_count: attemptCount })
    }
    await client.query('COMMIT')
    return claimed
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function recordEmailSent(outboxId: string) {
  const result = await postgresPool.query(
    `UPDATE user_alert_email_outbox
     SET status = 'sent', sent_at = NOW(), locked_at = NULL, last_error = NULL
     WHERE id = $1 AND status = 'sending'`,
    [outboxId],
  )
  if (result.rowCount !== 1) {
    throw new Error(`Could not mark alert email outbox row ${outboxId} as sent`)
  }
}

async function recordEmailFailure(email: OutboxEmail, error: unknown) {
  const retryIndex = Math.min(email.attempt_count - 1, RETRY_DELAY_MINUTES.length - 1)
  const delayMinutes = RETRY_DELAY_MINUTES[retryIndex]
  const message = error instanceof Error ? error.message : String(error)
  const result = await postgresPool.query(
    `UPDATE user_alert_email_outbox
     SET status = 'failed',
         next_attempt_at = NOW() + ($2::int * INTERVAL '1 minute'),
         locked_at = NULL,
         last_error = $3
     WHERE id = $1 AND status = 'sending'`,
    [email.outbox_id, delayMinutes, message.slice(0, 1000)],
  )
  if (result.rowCount !== 1) {
    throw new Error(`Could not schedule retry for alert email ${email.outbox_id}`)
  }
  console.error('Failed to send alert email; retry scheduled', {
    outboxId: email.outbox_id,
    attempt: email.attempt_count,
    retryInMinutes: delayMinutes,
    error,
  })
}

async function processOutbox() {
  const emails = await claimOutboxBatch()
  await forEachConcurrent(emails, EMAIL_CONCURRENCY, async (email) => {
    try {
      await sendAlertEmail(email)
    } catch (error) {
      await recordEmailFailure(email, error)
      return
    }

    await recordEmailSent(email.outbox_id)
    console.info('Alert email sent', { outboxId: email.outbox_id })
  })
}

async function runAlertChecker(intervalHours: number) {
  const client = await postgresPool.connect()
  let lockAcquired = false
  try {
    const lock = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [ADVISORY_LOCK_ID],
    )
    lockAcquired = lock.rows[0]?.locked === true
    if (!lockAcquired) return

    await reclaimStaleOutboxRows()
    await processOutbox()
    await checkDueAlerts(intervalHours)
    await processOutbox()
  } finally {
    try {
      if (lockAcquired) {
        await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID])
      }
    } finally {
      client.release()
    }
  }
}

export function startAlertChecker() {
  const intervalHours = positiveIntegerEnvironmentVariable('CRON_INTERVAL_HOURS', 1)
  const task = cron.schedule(
    '* * * * *',
    async () => {
      try {
        await runAlertChecker(intervalHours)
      } catch (error) {
        console.error('Alert checker run failed', error)
      }
    },
    { name: 'game-price-alert-checker', noOverlap: true },
  )

  console.info('Alert checker scheduled', {
    priceCheckIntervalHours: intervalHours,
    outboxPollIntervalMinutes: 1,
  })
  return task
}
