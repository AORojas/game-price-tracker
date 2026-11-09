CREATE TABLE game_price_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id TEXT NOT NULL,
  lowest_price NUMERIC(10, 2) NOT NULL,
  observed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT game_price_history_game_id_not_empty CHECK (length(trim(game_id)) > 0),
  CONSTRAINT game_price_history_lowest_price_nonnegative CHECK (lowest_price >= 0),
  CONSTRAINT game_price_history_game_day_unique UNIQUE (game_id, observed_on)
);

CREATE INDEX game_price_history_game_date_idx
  ON game_price_history (game_id, observed_on);
