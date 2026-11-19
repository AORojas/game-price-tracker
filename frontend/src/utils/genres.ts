const GENRE_TRANSLATIONS: Record<string, string> = {
  action: 'Acción',
  adventure: 'Aventura',
  'board games': 'Juegos de mesa',
  casual: 'Casual',
  card: 'Cartas',
  educational: 'Educativos',
  family: 'Familiar',
  fighting: 'Lucha',
  indie: 'Indie',
  'massively multiplayer': 'Multijugador Masivo',
  platformer: 'Plataformas',
  puzzle: 'Puzles',
  racing: 'Carreras',
  rpg: 'RPG',
  simulation: 'Simulación',
  shooter: 'Disparos',
  sports: 'Deportes',
  strategy: 'Estrategia',
}

export function translateGenre(name: string) {
  return GENRE_TRANSLATIONS[name.trim().toLowerCase()] ?? name
}
