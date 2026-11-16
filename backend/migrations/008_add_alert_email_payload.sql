ALTER TABLE user_alert_email_outbox
  ADD COLUMN game_title TEXT NOT NULL DEFAULT 'Videojuego',
  ADD COLUMN target_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN current_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN store_name TEXT NOT NULL DEFAULT 'Tienda',
  ADD COLUMN deal_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN locked_at TIMESTAMPTZ;

ALTER TABLE user_alert_email_outbox
  ADD CONSTRAINT user_alert_email_outbox_prices_nonnegative
    CHECK (target_price >= 0 AND current_price >= 0),
  ADD CONSTRAINT user_alert_email_outbox_currency_format
    CHECK (currency ~ '^[A-Z]{3}$');

ALTER TABLE user_alert_email_outbox
  ALTER COLUMN game_title DROP DEFAULT,
  ALTER COLUMN target_price DROP DEFAULT,
  ALTER COLUMN current_price DROP DEFAULT,
  ALTER COLUMN currency DROP DEFAULT,
  ALTER COLUMN store_name DROP DEFAULT,
  ALTER COLUMN deal_id DROP DEFAULT;
