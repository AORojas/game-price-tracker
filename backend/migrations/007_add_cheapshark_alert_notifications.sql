ALTER TABLE user_alerts
  ADD COLUMN cheapshark_id TEXT,
  ADD COLUMN is_notified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN last_checked_at TIMESTAMPTZ,
  ADD COLUMN notified_at TIMESTAMPTZ,
  ADD COLUMN notification_version INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT user_alerts_cheapshark_id_format
    CHECK (cheapshark_id IS NULL OR cheapshark_id ~ '^[0-9]+$'),
  ADD CONSTRAINT user_alerts_notification_version_nonnegative
    CHECK (notification_version >= 0);

UPDATE user_alerts
SET cheapshark_id = substring(game_id FROM '^cheapshark:([0-9]+)$')
WHERE game_id ~ '^cheapshark:[0-9]+$';

CREATE INDEX user_alerts_active_cheapshark_id_idx
  ON user_alerts (cheapshark_id)
  WHERE is_active = TRUE AND is_notified = FALSE AND cheapshark_id IS NOT NULL;

CREATE TABLE user_alert_email_outbox (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id BIGINT NOT NULL REFERENCES user_alerts (id) ON DELETE CASCADE,
  notification_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMPTZ,
  CONSTRAINT user_alert_email_outbox_status_valid
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  CONSTRAINT user_alert_email_outbox_attempt_count_nonnegative
    CHECK (attempt_count >= 0),
  CONSTRAINT user_alert_email_outbox_version_nonnegative
    CHECK (notification_version >= 0),
  CONSTRAINT user_alert_email_outbox_alert_version_unique
    UNIQUE (alert_id, notification_version)
);

CREATE INDEX user_alert_email_outbox_pending_idx
  ON user_alert_email_outbox (next_attempt_at, id)
  WHERE status IN ('pending', 'failed');
