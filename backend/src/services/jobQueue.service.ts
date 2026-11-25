import { postgresPool } from '../config/postgres.js'

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

export type EnqueuedJob = {
  id: string
  status: JobStatus
}

export type ClaimedJob = {
  id: string
  jobType: string
  payload: unknown
  attempts: number
  maxAttempts: number
  leaseExpiresAt: Date
}

type ClaimedJobRow = {
  id: string
  job_type: string
  payload: unknown
  attempts: number
  max_attempts: number
  lease_expires_at: Date
}

function assertNonEmpty(value: string, field: string) {
  if (!value.trim()) {
    throw new Error(`${field} must not be empty`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function enqueueJob(input: {
  jobType: string
  payload: Record<string, unknown>
  idempotencyKey: string
  maxAttempts?: number
}): Promise<EnqueuedJob> {
  assertNonEmpty(input.jobType, 'Job type')
  assertNonEmpty(input.idempotencyKey, 'Job idempotency key')
  if (!isRecord(input.payload)) {
    throw new Error('Job payload must be an object')
  }

  const maxAttempts = input.maxAttempts ?? 3
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('Job max attempts must be a positive integer')
  }

  const serializedPayload = JSON.stringify(input.payload)
  if (serializedPayload === undefined) {
    throw new Error('Job payload could not be serialized')
  }

  const result = await postgresPool.query<EnqueuedJob>(
    `INSERT INTO jobs (job_type, payload, idempotency_key, max_attempts)
     VALUES ($1, $2::jsonb, $3, $4)
     ON CONFLICT (idempotency_key)
       WHERE status IN ('pending', 'running')
     DO UPDATE SET updated_at = jobs.updated_at
     RETURNING id::text AS id, status`,
    [input.jobType.trim(), serializedPayload, input.idempotencyKey.trim(), maxAttempts],
  )

  const job = result.rows[0]
  if (!job) {
    throw new Error('Job could not be enqueued')
  }
  return job
}

export async function claimJobs(input: {
  jobType: string
  workerId: string
  limit?: number
  leaseSeconds?: number
}): Promise<ClaimedJob[]> {
  assertNonEmpty(input.jobType, 'Job type')
  assertNonEmpty(input.workerId, 'Worker ID')

  const limit = input.limit ?? 1
  const leaseSeconds = input.leaseSeconds ?? 60
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10) {
    throw new Error('Job claim limit must be an integer between 1 and 10')
  }
  if (!Number.isSafeInteger(leaseSeconds) || leaseSeconds < 1 || leaseSeconds > 3600) {
    throw new Error('Job lease must be an integer between 1 and 3600 seconds')
  }

  const client = await postgresPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE jobs
       SET status = CASE
             WHEN attempts >= max_attempts THEN 'failed'
             ELSE 'pending'
           END,
           next_attempt_at = CASE
             WHEN attempts >= max_attempts THEN next_attempt_at
             ELSE CURRENT_TIMESTAMP
           END,
           completed_at = CASE
             WHEN attempts >= max_attempts THEN CURRENT_TIMESTAMP
             ELSE NULL
           END,
           locked_at = NULL,
           lease_expires_at = NULL,
           locked_by = NULL,
           last_error = COALESCE(last_error, 'Worker lease expired'),
           updated_at = CURRENT_TIMESTAMP
       WHERE job_type = $1
         AND status = 'running'
         AND lease_expires_at <= CURRENT_TIMESTAMP`,
      [input.jobType.trim()],
    )
    await client.query(
      `UPDATE jobs
       SET status = 'failed',
           completed_at = CURRENT_TIMESTAMP,
           last_error = COALESCE(last_error, 'Maximum job attempts exhausted'),
           updated_at = CURRENT_TIMESTAMP
       WHERE job_type = $1
         AND status = 'pending'
         AND attempts >= max_attempts`,
      [input.jobType.trim()],
    )

    const result = await client.query<ClaimedJobRow>(
      `WITH due_jobs AS (
         SELECT id
         FROM jobs
         WHERE job_type = $1
           AND status = 'pending'
           AND attempts < max_attempts
           AND next_attempt_at <= CURRENT_TIMESTAMP
         ORDER BY next_attempt_at, id
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       UPDATE jobs AS job
       SET status = 'running',
           attempts = job.attempts + 1,
           locked_at = CURRENT_TIMESTAMP,
           lease_expires_at = CURRENT_TIMESTAMP + ($3::int * INTERVAL '1 second'),
           locked_by = $4,
           updated_at = CURRENT_TIMESTAMP
       FROM due_jobs
       WHERE job.id = due_jobs.id
       RETURNING job.id::text AS id, job.job_type, job.payload, job.attempts,
                 job.max_attempts, job.lease_expires_at`,
      [input.jobType.trim(), limit, leaseSeconds, input.workerId.trim()],
    )
    const claimedJobs = result.rows.map((row) => {
      return {
        id: row.id,
        jobType: row.job_type,
        payload: row.payload,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        leaseExpiresAt: row.lease_expires_at,
      }
    })
    await client.query('COMMIT')
    return claimedJobs
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function completeJob(jobId: string, workerId: string): Promise<void> {
  if (!/^[1-9]\d*$/.test(jobId)) {
    throw new Error('Job ID must be a positive integer')
  }
  assertNonEmpty(workerId, 'Worker ID')

  const result = await postgresPool.query(
    `UPDATE jobs
     SET status = 'completed',
         completed_at = CURRENT_TIMESTAMP,
         locked_at = NULL,
         lease_expires_at = NULL,
         locked_by = NULL,
         last_error = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND status = 'running'
       AND locked_by = $2
       AND lease_expires_at > CURRENT_TIMESTAMP`,
    [jobId, workerId.trim()],
  )
  if (result.rowCount !== 1) {
    throw new Error(`Job ${jobId} is not owned by worker ${workerId} or its lease expired`)
  }
}

export async function failJob(input: {
  jobId: string
  workerId: string
  message: string
  retryDelaySeconds: number
  retryable?: boolean
}): Promise<'pending' | 'failed'> {
  if (!/^[1-9]\d*$/.test(input.jobId)) {
    throw new Error('Job ID must be a positive integer')
  }
  assertNonEmpty(input.workerId, 'Worker ID')
  assertNonEmpty(input.message, 'Job failure message')
  if (!Number.isSafeInteger(input.retryDelaySeconds) || input.retryDelaySeconds < 0) {
    throw new Error('Job retry delay must be a non-negative integer')
  }

  const result = await postgresPool.query<{ status: 'pending' | 'failed' }>(
    `UPDATE jobs
     SET status = CASE
           WHEN $5::boolean = FALSE OR attempts >= max_attempts THEN 'failed'
           ELSE 'pending'
         END,
         next_attempt_at = CASE
           WHEN $5::boolean = FALSE OR attempts >= max_attempts THEN next_attempt_at
           ELSE CURRENT_TIMESTAMP + ($4::int * INTERVAL '1 second')
         END,
         completed_at = CASE
           WHEN $5::boolean = FALSE OR attempts >= max_attempts THEN CURRENT_TIMESTAMP
           ELSE NULL
         END,
         locked_at = NULL,
         lease_expires_at = NULL,
         locked_by = NULL,
         last_error = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
       AND status = 'running'
       AND locked_by = $2
       AND lease_expires_at > CURRENT_TIMESTAMP
     RETURNING status`,
    [
      input.jobId,
      input.workerId.trim(),
      input.message.trim().slice(0, 1000),
      input.retryDelaySeconds,
      input.retryable ?? true,
    ],
  )

  const job = result.rows[0]
  if (!job) {
    throw new Error(
      `Job ${input.jobId} is not owned by worker ${input.workerId} or its lease expired`,
    )
  }
  return job.status
}
