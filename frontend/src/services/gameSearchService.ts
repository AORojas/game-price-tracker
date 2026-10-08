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

export interface GameMetadata {
  id: number
  title: string
  image: string | null
  released: string | null
  rating: number
  metacritic: number | null
  genres: string[]
  platforms: string[]
}

export interface GameMetadataFilterOption {
  id: number
  name: string
  slug: string
}

export interface GameMetadataFilterOptions {
  genres: GameMetadataFilterOption[]
  platforms: GameMetadataFilterOption[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isGameMetadata(value: unknown): value is GameMetadata {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.title === 'string' &&
    (typeof value.image === 'string' || value.image === null) &&
    (typeof value.released === 'string' || value.released === null) &&
    typeof value.rating === 'number' &&
    Number.isFinite(value.rating) &&
    (typeof value.metacritic === 'number' || value.metacritic === null) &&
    Array.isArray(value.genres) &&
    value.genres.every((genre) => typeof genre === 'string') &&
    Array.isArray(value.platforms) &&
    value.platforms.every((platform) => typeof platform === 'string')
  )
}

function isGameMetadataFilterOption(value: unknown): value is GameMetadataFilterOption {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.slug === 'string'
  )
}

function isGameMetadataSearchResponse(
  value: unknown,
): value is { count: number; results: GameMetadata[] } {
  return (
    isRecord(value) &&
    typeof value.count === 'number' &&
    Array.isArray(value.results) &&
    value.results.every(isGameMetadata)
  )
}

function normalizeGameTitle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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

export async function getGameMetadata(
  title: string,
  signal: AbortSignal,
): Promise<GameMetadata | null> {
  const params = new URLSearchParams({ title })
  const { response, payload } = await fetchJson(
    `/api/games/metadata/search?${params.toString()}`,
    signal,
  )

  if (!response.ok) {
    const errorCode =
      isRecord(payload) && isRecord(payload.error) ? payload.error.code : undefined
    if (errorCode === 'NOT_CONFIGURED') {
      throw new Error('La integración con RAWG no está configurada en el backend.')
    }
    if (errorCode === 'RATE_LIMITED') {
      throw new Error('Se alcanzó el límite de consultas de RAWG. Intentá más tarde.')
    }
    throw new Error('No se pudo cargar la información adicional de RAWG.')
  }

  if (!isGameMetadataSearchResponse(payload)) {
    throw new Error('El backend devolvió metadatos con un formato inesperado.')
  }

  const normalizedTitle = normalizeGameTitle(title)
  return (
    payload.results.find(
      (result) => normalizeGameTitle(result.title) === normalizedTitle,
    ) ?? null
  )
}

export async function getGameMetadataFilterOptions(
  signal: AbortSignal,
): Promise<GameMetadataFilterOptions> {
  const { response, payload } = await fetchJson('/api/games/metadata/filters', signal)

  if (!response.ok) {
    throw new Error('No se pudieron cargar los filtros de RAWG.')
  }

  if (
    !isRecord(payload) ||
    !Array.isArray(payload.genres) ||
    !payload.genres.every(isGameMetadataFilterOption) ||
    !Array.isArray(payload.platforms) ||
    !payload.platforms.every(isGameMetadataFilterOption)
  ) {
    throw new Error('El backend devolvió filtros con un formato inesperado.')
  }

  return {
    genres: payload.genres,
    platforms: payload.platforms,
  }
}

export async function searchGameMetadata(
  title: string,
  filters: { genres: string[]; platforms: number[] },
  signal: AbortSignal,
): Promise<GameMetadata[]> {
  const params = new URLSearchParams({ title })
  if (filters.genres.length > 0) {
    params.set('genres', filters.genres.join(','))
  }
  if (filters.platforms.length > 0) {
    params.set('platforms', filters.platforms.join(','))
  }

  const { response, payload } = await fetchJson(
    `/api/games/metadata/search?${params.toString()}`,
    signal,
  )

  if (!response.ok) {
    const errorCode =
      isRecord(payload) && isRecord(payload.error) ? payload.error.code : undefined
    if (errorCode === 'NOT_CONFIGURED') {
      throw new Error('La integración con RAWG no está configurada en el backend.')
    }
    if (errorCode === 'RATE_LIMITED') {
      throw new Error('Se alcanzó el límite de consultas de RAWG. Intentá más tarde.')
    }
    throw new Error('No se pudieron aplicar los filtros de RAWG.')
  }

  if (!isGameMetadataSearchResponse(payload)) {
    throw new Error('El backend devolvió metadatos con un formato inesperado.')
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
