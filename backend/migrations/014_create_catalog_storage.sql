CREATE TABLE games (
  cheapshark_game_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT,
  steam_app_id BIGINT,
  rawg_id BIGINT,
  igdb_id BIGINT,
  metadata_updated_at TIMESTAMPTZ,
  offers_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT games_cheapshark_id_format
    CHECK (cheapshark_game_id ~ '^[0-9]+$'),
  CONSTRAINT games_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT games_image_url_not_empty
    CHECK (image_url IS NULL OR length(trim(image_url)) > 0),
  CONSTRAINT games_steam_app_id_positive
    CHECK (steam_app_id IS NULL OR steam_app_id > 0),
  CONSTRAINT games_rawg_id_positive
    CHECK (rawg_id IS NULL OR rawg_id > 0),
  CONSTRAINT games_igdb_id_positive
    CHECK (igdb_id IS NULL OR igdb_id > 0)
);

CREATE INDEX games_steam_app_id_idx
  ON games (steam_app_id)
  WHERE steam_app_id IS NOT NULL;

CREATE INDEX games_rawg_id_idx
  ON games (rawg_id)
  WHERE rawg_id IS NOT NULL;

CREATE INDEX games_igdb_id_idx
  ON games (igdb_id)
  WHERE igdb_id IS NOT NULL;

CREATE TABLE game_offers (
  cheapshark_deal_id TEXT PRIMARY KEY,
  cheapshark_game_id TEXT NOT NULL
    REFERENCES games (cheapshark_game_id) ON DELETE CASCADE,
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  store_logo_url TEXT,
  price NUMERIC(10, 2) NOT NULL,
  regular_price NUMERIC(10, 2),
  discount_percent NUMERIC(5, 2),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT game_offers_deal_id_not_empty
    CHECK (length(trim(cheapshark_deal_id)) > 0),
  CONSTRAINT game_offers_store_id_not_empty
    CHECK (length(trim(store_id)) > 0),
  CONSTRAINT game_offers_store_name_not_empty
    CHECK (length(trim(store_name)) > 0),
  CONSTRAINT game_offers_store_logo_not_empty
    CHECK (store_logo_url IS NULL OR length(trim(store_logo_url)) > 0),
  CONSTRAINT game_offers_price_nonnegative CHECK (price >= 0),
  CONSTRAINT game_offers_regular_price_nonnegative
    CHECK (regular_price IS NULL OR regular_price >= 0),
  CONSTRAINT game_offers_discount_valid
    CHECK (discount_percent IS NULL OR discount_percent BETWEEN 0 AND 100),
  CONSTRAINT game_offers_currency_format CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX game_offers_active_cheapest_idx
  ON game_offers (cheapshark_game_id, price)
  WHERE is_active = TRUE;

CREATE INDEX game_offers_active_store_idx
  ON game_offers (store_id, cheapshark_game_id)
  WHERE is_active = TRUE;
