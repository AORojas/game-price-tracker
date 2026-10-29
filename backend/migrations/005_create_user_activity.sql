CREATE TABLE user_favorites (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_favorites_game_id_not_empty CHECK (length(trim(game_id)) > 0),
  CONSTRAINT user_favorites_user_game_unique UNIQUE (user_id, game_id)
);

CREATE INDEX user_favorites_user_id_idx ON user_favorites (user_id);

CREATE TABLE user_alerts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  target_price NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_alerts_game_id_not_empty CHECK (length(trim(game_id)) > 0),
  CONSTRAINT user_alerts_target_price_nonnegative CHECK (target_price >= 0)
);

CREATE INDEX user_alerts_user_id_idx ON user_alerts (user_id);

CREATE TABLE user_saved_offers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  offer_id TEXT NOT NULL,
  price_at_save NUMERIC(10, 2) NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_saved_offers_offer_id_not_empty CHECK (length(trim(offer_id)) > 0),
  CONSTRAINT user_saved_offers_price_nonnegative CHECK (price_at_save >= 0),
  CONSTRAINT user_saved_offers_url_not_empty CHECK (length(trim(url)) > 0)
);

CREATE INDEX user_saved_offers_user_id_idx ON user_saved_offers (user_id);

CREATE TABLE user_search_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_search_history_term_not_empty CHECK (length(trim(search_term)) > 0)
);

CREATE UNIQUE INDEX user_search_history_user_term_unique_idx
  ON user_search_history (user_id, lower(search_term));
CREATE INDEX user_search_history_user_id_created_at_idx
  ON user_search_history (user_id, created_at DESC);
