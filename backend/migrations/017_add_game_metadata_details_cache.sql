ALTER TABLE games
  ADD COLUMN metadata_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN metadata_developers TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN metadata_esrb_rating TEXT,
  ADD COLUMN details_updated_at TIMESTAMPTZ;
