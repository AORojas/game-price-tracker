ALTER TABLE games
  ADD COLUMN metadata_title TEXT,
  ADD COLUMN metadata_image_url TEXT,
  ADD CONSTRAINT games_metadata_title_not_empty
    CHECK (metadata_title IS NULL OR length(trim(metadata_title)) > 0),
  ADD CONSTRAINT games_metadata_image_url_not_empty
    CHECK (metadata_image_url IS NULL OR length(trim(metadata_image_url)) > 0);
