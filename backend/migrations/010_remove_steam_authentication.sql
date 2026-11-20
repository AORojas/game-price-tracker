ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_steam_id_format;

DROP INDEX IF EXISTS users_steam_id_unique_idx;

ALTER TABLE users
  DROP COLUMN IF EXISTS steam_id;
