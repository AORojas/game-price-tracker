ALTER TABLE user_favorites
  ADD COLUMN game_title TEXT,
  ADD COLUMN game_image TEXT,
  ADD CONSTRAINT user_favorites_game_title_not_empty
    CHECK (game_title IS NULL OR length(trim(game_title)) > 0);

ALTER TABLE user_alerts
  ADD COLUMN game_title TEXT,
  ADD COLUMN game_image TEXT,
  ADD CONSTRAINT user_alerts_game_title_not_empty
    CHECK (game_title IS NULL OR length(trim(game_title)) > 0);

ALTER TABLE user_saved_offers
  ADD COLUMN game_title TEXT,
  ADD COLUMN game_image TEXT,
  ADD CONSTRAINT user_saved_offers_game_title_not_empty
    CHECK (game_title IS NULL OR length(trim(game_title)) > 0);
