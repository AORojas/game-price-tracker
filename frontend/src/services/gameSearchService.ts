export interface GameSearchResult {
  id: string
  title: string
  image: string
  lowestPrice: number
  lowestDealId: string
}

export interface GamePriceOffer {
  store: string
  price: number
  regularPrice: number | null
  discount: number | null
  currency: string
  dealId: string
}

export interface GamePriceComparison {
  game: {
    id: string
    title: string
    image: string
  }
  prices: GamePriceOffer[]
  cheapest: {
    store: string
    price: number
  } | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isGameSearchResult(value: unknown): value is GameSearchResult {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.image === 'string' &&
    typeof value.lowestPrice === 'number' &&
    Number.isFinite(value.lowestPrice) &&
    value.lowestPrice >= 0 &&
    typeof value.lowestDealId === 'string'
  )
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isGamePriceOffer(value: unknown): value is GamePriceOffer {
  return (
    isRecord(value) &&
    typeof value.store === 'string' &&
    typeof value.price === 'number' &&
    Number.isFinite(value.price) &&
    value.price >= 0 &&
    isNullableFiniteNumber(value.regularPrice) &&
    (value.regularPrice === null || value.regularPrice >= 0) &&
    isNullableFiniteNumber(value.discount) &&
    (value.discount === null || (value.discount >= 0 && value.discount <= 100)) &&
    typeof value.currency === 'string' &&
    /^[A-Z]{3}$/.test(value.currency) &&
    typeof value.dealId === 'string'
  )
}

function isGamePriceComparison(value: unknown): value is GamePriceComparison {
  if (!isRecord(value) || !isRecord(value.game) || !Array.isArray(value.prices)) {
    return false
  }

  const validGame =
    typeof value.game.id === 'string' &&
    typeof value.game.title === 'string' &&
    typeof value.game.image === 'string'
  const validCheapest =
    value.cheapest === null ||
    (isRecord(value.cheapest) &&
      typeof value.cheapest.store === 'string' &&
      typeof value.cheapest.price === 'number' &&
      Number.isFinite(value.cheapest.price) &&
      value.cheapest.price >= 0)

  return validGame && value.prices.every(isGamePriceOffer) && validCheapest
}

async function fetchJson(
  url: string,
  signal: AbortSignal,
): Promise<{ response: Response; payload: unknown }> {
  let response: Response

  try {
    response = await fetch(url, { signal })
  } catch (error) {
    if (signal.aborted) throw error
    throw new Error('No se pudo conectar con el backend. Verificá que esté iniciado.')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('El backend devolvió una respuesta inválida.')
  }

  return { response, payload }
}

export async function searchGames(
  title: string,
  signal: AbortSignal,
): Promise<GameSearchResult[]> {
  const params = new URLSearchParams({ title })
  const { response, payload } = await fetchJson(
    `/api/games/search?${params.toString()}`,
    signal,
  )

  if (!response.ok) {
    if (
      response.status === 404 &&
      isRecord(payload) &&
      isRecord(payload.error) &&
      payload.error.code === 'GAME_NOT_FOUND'
    ) {
      return []
    }

    throw new Error('No se pudo completar la búsqueda. Intentá nuevamente.')
  }

  if (
    !isRecord(payload) ||
    !Array.isArray(payload.results) ||
    !payload.results.every(isGameSearchResult)
  ) {
    throw new Error('El backend devolvió resultados con un formato inesperado.')
  }

  return payload.results
}

export async function getGamePriceComparison(
  gameId: string,
  signal: AbortSignal,
): Promise<GamePriceComparison> {
  const { response, payload } = await fetchJson(
    `/api/games/${encodeURIComponent(gameId)}/prices`,
    signal,
  )

  if (!response.ok) {
    if (
      response.status === 404 &&
      isRecord(payload) &&
      isRecord(payload.error) &&
      payload.error.code === 'GAME_NOT_FOUND'
    ) {
      throw new Error('No se encontró este videojuego en la fuente de precios.')
    }

    throw new Error('No se pudieron cargar las ofertas. Intentá nuevamente.')
  }

  if (!isGamePriceComparison(payload)) {
    throw new Error('El backend devolvió una comparación con un formato inesperado.')
  }

  return payload
}
