export interface GameSearchResult {
  id: string
  title: string
  image: string
  lowestPrice: number
  lowestDealId: string
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

export async function searchGames(
  title: string,
  signal: AbortSignal,
): Promise<GameSearchResult[]> {
  const params = new URLSearchParams({ title })
  let response: Response

  try {
    response = await fetch(`/api/games/search?${params.toString()}`, { signal })
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

  if (!response.ok) {
    if (
      response.status === 404 &&
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'object' &&
      payload.error !== null &&
      'code' in payload.error &&
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
