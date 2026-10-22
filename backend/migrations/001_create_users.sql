CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT users_email_not_empty CHECK (length(trim(email)) > 0)
);

CREATE UNIQUE INDEX users_email_unique_idx ON users (lower(email));
