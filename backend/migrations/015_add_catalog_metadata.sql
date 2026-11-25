ALTER TABLE games
  ADD COLUMN metadata_provider TEXT,
  ADD COLUMN metadata_game_id BIGINT,
  ADD COLUMN normalized_title TEXT,
  ADD COLUMN genres TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN platforms TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN released TEXT,
  ADD COLUMN rating DOUBLE PRECISION,
  ADD COLUMN metacritic INTEGER,
  ADD COLUMN preview_images TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN popular_rank INTEGER,
  ADD COLUMN recent_rank INTEGER,
  ADD CONSTRAINT games_metadata_provider_valid
    CHECK (metadata_provider IS NULL OR metadata_provider IN ('steam', 'rawg', 'igdb')),
  ADD CONSTRAINT games_metadata_game_id_positive
    CHECK (metadata_game_id IS NULL OR metadata_game_id > 0),
  ADD CONSTRAINT games_rating_nonnegative
    CHECK (rating IS NULL OR rating >= 0),
  ADD CONSTRAINT games_metacritic_valid
    CHECK (metacritic IS NULL OR metacritic BETWEEN 0 AND 100),
  ADD CONSTRAINT games_popular_rank_nonnegative
    CHECK (popular_rank IS NULL OR popular_rank >= 0),
  ADD CONSTRAINT games_recent_rank_nonnegative
    CHECK (recent_rank IS NULL OR recent_rank >= 0);

CREATE INDEX games_metadata_identity_idx
  ON games (metadata_provider, metadata_game_id)
  WHERE metadata_provider IS NOT NULL AND metadata_game_id IS NOT NULL;

CREATE INDEX games_normalized_title_idx
  ON games (normalized_title)
  WHERE normalized_title IS NOT NULL;

CREATE INDEX games_popular_rank_idx
  ON games (popular_rank)
  WHERE popular_rank IS NOT NULL;

CREATE INDEX games_recent_rank_idx
  ON games (recent_rank)
  WHERE recent_rank IS NOT NULL;

CREATE INDEX games_genres_gin_idx
  ON games USING GIN (genres);

CREATE INDEX games_platforms_gin_idx
  ON games USING GIN (platforms);

CREATE INDEX game_offers_active_discount_idx
  ON game_offers (cheapshark_game_id, discount_percent DESC)
  WHERE is_active = TRUE AND discount_percent IS NOT NULL;
