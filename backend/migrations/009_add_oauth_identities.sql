ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD COLUMN google_sub TEXT,
  ADD COLUMN steam_id VARCHAR(17),
  ADD COLUMN avatar_url TEXT;

CREATE UNIQUE INDEX users_google_sub_unique_idx
  ON users (google_sub)
  WHERE google_sub IS NOT NULL;

CREATE UNIQUE INDEX users_steam_id_unique_idx
  ON users (steam_id)
  WHERE steam_id IS NOT NULL;

ALTER TABLE users
  ADD CONSTRAINT users_steam_id_format
    CHECK (steam_id IS NULL OR steam_id ~ '^[0-9]{17}$'),
  ADD CONSTRAINT users_avatar_url_https
    CHECK (avatar_url IS NULL OR avatar_url ~ '^https://');
