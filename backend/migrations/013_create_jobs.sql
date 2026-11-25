CREATE TABLE jobs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  locked_by TEXT,
  idempotency_key TEXT NOT NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  CONSTRAINT jobs_type_not_empty CHECK (length(trim(job_type)) > 0),
  CONSTRAINT jobs_payload_must_be_object CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT jobs_status_valid
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  CONSTRAINT jobs_attempts_nonnegative CHECK (attempts >= 0),
  CONSTRAINT jobs_max_attempts_positive CHECK (max_attempts > 0),
  CONSTRAINT jobs_idempotency_key_not_empty
    CHECK (length(trim(idempotency_key)) > 0),
  CONSTRAINT jobs_lock_state_consistent CHECK (
    (status = 'running'
      AND locked_at IS NOT NULL
      AND lease_expires_at IS NOT NULL
      AND locked_by IS NOT NULL)
    OR
    (status <> 'running'
      AND locked_at IS NULL
      AND lease_expires_at IS NULL
      AND locked_by IS NULL)
  )
);

CREATE UNIQUE INDEX jobs_active_idempotency_key_unique
  ON jobs (idempotency_key)
  WHERE status IN ('pending', 'running');

CREATE INDEX jobs_pending_due_idx
  ON jobs (job_type, next_attempt_at, id)
  WHERE status = 'pending';

CREATE INDEX jobs_expired_lease_idx
  ON jobs (lease_expires_at, id)
  WHERE status = 'running';

CREATE INDEX jobs_finished_retention_idx
  ON jobs (completed_at, id)
  WHERE status IN ('completed', 'failed');
