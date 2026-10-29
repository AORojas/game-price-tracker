export type Favorite = {
  id: string
  game_id: string
  created_at: string
}

export type UserAlert = {
  id: string
  game_id: string
  target_price: string
  is_active: boolean
  created_at: string
}

export type SavedOffer = {
  id: string
  offer_id: string
  price_at_save: string
  url: string
  created_at: string
}

export type SearchHistoryEntry = {
  id: string
  search_term: string
  created_at: string
}

export type UserActivity = {
  favorites: Favorite[]
  alerts: UserAlert[]
  savedOffers: SavedOffer[]
  searchHistory: SearchHistoryEntry[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readJson(response: Response): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'No se pudo completar la operación de actividad.'
    throw new Error(message)
  }
  return payload
}

function isFavorite(value: unknown): value is Favorite {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.game_id === 'string' &&
    typeof value.created_at === 'string'
  )
}

function isAlert(value: unknown): value is UserAlert {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.game_id === 'string' &&
    typeof value.target_price === 'string' &&
    typeof value.is_active === 'boolean' &&
    typeof value.created_at === 'string'
  )
}

function isSavedOffer(value: unknown): value is SavedOffer {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.offer_id === 'string' &&
    typeof value.price_at_save === 'string' &&
    typeof value.url === 'string' &&
    typeof value.created_at === 'string'
  )
}

function isSearchHistoryEntry(value: unknown): value is SearchHistoryEntry {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.search_term === 'string' &&
    typeof value.created_at === 'string'
  )
}

export async function getUserActivity(signal: AbortSignal): Promise<UserActivity> {
  const payload = await readJson(
    await fetch('/api/user-activity', { credentials: 'same-origin', signal }),
  )
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.favorites) ||
    !payload.favorites.every(isFavorite) ||
    !Array.isArray(payload.alerts) ||
    !payload.alerts.every(isAlert) ||
    !Array.isArray(payload.savedOffers) ||
    !payload.savedOffers.every(isSavedOffer) ||
    !Array.isArray(payload.searchHistory) ||
    !payload.searchHistory.every(isSearchHistoryEntry)
  ) {
    throw new Error('El servidor devolvió datos de actividad inválidos.')
  }

  return {
    favorites: payload.favorites,
    alerts: payload.alerts,
    savedOffers: payload.savedOffers,
    searchHistory: payload.searchHistory,
  }
}

export async function toggleFavorite(gameId: string): Promise<{
  isFavorite: boolean
  favorite?: Favorite
}> {
  const payload = await readJson(
    await fetch('/api/user-activity/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ gameId }),
    }),
  )
  if (
    !isRecord(payload) ||
    typeof payload.isFavorite !== 'boolean' ||
    (payload.isFavorite && !isFavorite(payload.favorite))
  ) {
    throw new Error('El servidor devolvió un estado de favorito inválido.')
  }
  return {
    isFavorite: payload.isFavorite,
    ...(isFavorite(payload.favorite) ? { favorite: payload.favorite } : {}),
  }
}

export async function deleteFavorite(favoriteId: string): Promise<void> {
  await readJson(
    await fetch(`/api/user-activity/favorites/${encodeURIComponent(favoriteId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }),
  ).catch((error: unknown) => {
    if (error instanceof SyntaxError) return
    throw error
  })
}

export async function createAlert(
  gameId: string,
  targetPrice: number,
): Promise<UserAlert> {
  const payload = await readJson(
    await fetch('/api/user-activity/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ gameId, targetPrice }),
    }),
  )
  if (!isRecord(payload) || !isAlert(payload.alert)) {
    throw new Error('El servidor devolvió una alerta inválida.')
  }
  return payload.alert
}

export async function updateAlert(
  alertId: string,
  isActive: boolean,
): Promise<UserAlert> {
  const payload = await readJson(
    await fetch(`/api/user-activity/alerts/${encodeURIComponent(alertId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ isActive }),
    }),
  )
  if (!isRecord(payload) || !isAlert(payload.alert)) {
    throw new Error('El servidor devolvió una alerta inválida.')
  }
  return payload.alert
}

export async function deleteAlert(alertId: string): Promise<void> {
  await readJson(
    await fetch(`/api/user-activity/alerts/${encodeURIComponent(alertId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }),
  ).catch((error: unknown) => {
    if (error instanceof SyntaxError) return
    throw error
  })
}

export async function saveOffer(
  offer: Omit<SavedOffer, 'id' | 'created_at'>,
): Promise<SavedOffer> {
  const payload = await readJson(
    await fetch('/api/user-activity/saved-offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        offerId: offer.offer_id,
        priceAtSave: Number(offer.price_at_save),
        url: offer.url,
      }),
    }),
  )
  if (!isRecord(payload) || !isSavedOffer(payload.offer)) {
    throw new Error('El servidor devolvió una oferta guardada inválida.')
  }
  return payload.offer
}

export async function deleteSavedOffer(savedOfferId: string): Promise<void> {
  await readJson(
    await fetch(`/api/user-activity/saved-offers/${encodeURIComponent(savedOfferId)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }),
  ).catch((error: unknown) => {
    if (error instanceof SyntaxError) return
    throw error
  })
}

export async function addSearch(
  searchTerm: string,
): Promise<SearchHistoryEntry> {
  const payload = await readJson(
    await fetch('/api/user-activity/search-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ searchTerm }),
    }),
  )
  if (!isRecord(payload) || !isSearchHistoryEntry(payload.entry)) {
    throw new Error('El servidor devolvió un registro de búsqueda inválido.')
  }
  return payload.entry
}
