UPDATE profile_avatars
SET name = CASE id
    WHEN 'nova-guardian' THEN 'Exploradora azul'
    WHEN 'wild-warden' THEN 'Guerrero barbudo'
    WHEN 'ember-mage' THEN 'Guerrera de cabello blanco'
    WHEN 'neon-racer' THEN 'Guerrero rojo'
    WHEN 'orbit-android' THEN 'Zorro explorador'
    WHEN 'tide-seeker' THEN 'Viajero encapuchado'
  END,
  category = CASE id
    WHEN 'nova-guardian' THEN 'Ciencia ficción'
    WHEN 'wild-warden' THEN 'Acción'
    WHEN 'ember-mage' THEN 'Fantasía'
    WHEN 'neon-racer' THEN 'Acción'
    WHEN 'orbit-android' THEN 'Aventura'
    WHEN 'tide-seeker' THEN 'Aventura'
  END
WHERE id IN (
  'nova-guardian',
  'wild-warden',
  'ember-mage',
  'neon-racer',
  'orbit-android',
  'tide-seeker'
);

ALTER TABLE profile_avatars
  DROP COLUMN avatar_path,
  DROP COLUMN cover_path;
