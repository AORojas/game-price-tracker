const GENRE_TRANSLATIONS: Record<string, string> = {
  action: 'Acción',
  adventure: 'Aventura',
  casual: 'Casual',
  indie: 'Indie',
  'massively multiplayer': 'Multijugador Masivo',
  racing: 'Carreras',
  rpg: 'RPG',
  simulation: 'Simulación',
  sports: 'Deportes',
  strategy: 'Estrategia',
}

export function translateGenre(name: string) {
  return GENRE_TRANSLATIONS[name.trim().toLowerCase()] ?? name
}
