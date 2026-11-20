export type UsdArsQuote = {
  rate: number
  updatedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function getUsdArsQuote(signal?: AbortSignal): Promise<UsdArsQuote> {
  const response = await fetch('/api/exchange-rates/usd-ars', {
    credentials: 'same-origin',
    signal,
  })
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'No se pudo obtener la cotización oficial del dólar.'
    throw new Error(message)
  }

  if (
    !isRecord(payload) ||
    typeof payload.rate !== 'number' ||
    !Number.isFinite(payload.rate) ||
    payload.rate <= 0 ||
    typeof payload.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(payload.updatedAt))
  ) {
    throw new Error('El servidor devolvió una cotización USD/ARS inválida.')
  }

  return {
    rate: payload.rate,
    updatedAt: payload.updatedAt,
  }
}
