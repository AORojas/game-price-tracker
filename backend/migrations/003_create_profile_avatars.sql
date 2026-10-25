CREATE TABLE profile_avatars (
  id VARCHAR(60) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(40) NOT NULL,
  avatar_path VARCHAR(255) NOT NULL UNIQUE,
  cover_path VARCHAR(255) NOT NULL UNIQUE,
  CONSTRAINT profile_avatars_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT profile_avatars_category_not_empty CHECK (length(trim(category)) > 0)
);

INSERT INTO profile_avatars (id, name, category, avatar_path, cover_path) VALUES
  ('nova-guardian', 'Guardián de Nova', 'Ciencia ficción', '/profile/avatars/nova-guardian.svg', '/profile/covers/nova-guardian.svg'),
  ('wild-warden', 'Guardiana silvestre', 'Fantasía', '/profile/avatars/wild-warden.svg', '/profile/covers/wild-warden.svg'),
  ('ember-mage', 'Maga de brasas', 'Fantasía', '/profile/avatars/ember-mage.svg', '/profile/covers/ember-mage.svg'),
  ('neon-racer', 'Piloto neón', 'Carreras', '/profile/avatars/neon-racer.svg', '/profile/covers/neon-racer.svg'),
  ('orbit-android', 'Androide orbital', 'Tecnología', '/profile/avatars/orbit-android.svg', '/profile/covers/orbit-android.svg'),
  ('tide-seeker', 'Exploradora de mareas', 'Aventura', '/profile/avatars/tide-seeker.svg', '/profile/covers/tide-seeker.svg');

ALTER TABLE users
  ADD COLUMN avatar_id VARCHAR(60)
  REFERENCES profile_avatars (id)
  ON DELETE SET NULL;
