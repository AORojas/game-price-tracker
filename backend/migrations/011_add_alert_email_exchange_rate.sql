ALTER TABLE user_alert_email_outbox
  ADD COLUMN exchange_rate NUMERIC(16, 6),
  ADD COLUMN exchange_rate_updated_at TIMESTAMPTZ;

ALTER TABLE user_alert_email_outbox
  ADD CONSTRAINT user_alert_email_outbox_exchange_rate_snapshot
    CHECK (
      (exchange_rate IS NULL) = (exchange_rate_updated_at IS NULL)
      AND (exchange_rate IS NULL OR exchange_rate > 0)
    );
