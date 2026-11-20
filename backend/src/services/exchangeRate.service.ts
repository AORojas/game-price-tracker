export type OfficialUsdArsRate = {
  rate: number
  updatedAt: string
}

type DolarApiOfficialResponse = {
  compra: number
  venta: number
  casa: string
  moneda: string
  fechaActualizacion: string
}

export class ExchangeRateServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ExchangeRateServiceError'
  }
}

const OFFICIAL_RATE_URL = 'https://dolarapi.com/v1/dolares/oficial'
const REQUEST_TIMEOUT_MS = 5_000
const CACHE_TTL_MS = 60_000

let cachedRate: OfficialUsdArsRate | null = null
let cachedAt = 0
let inFlightRequest: Promise<OfficialUsdArsRate> | null = null

function isDolarApiOfficialResponse(value: unknown): value is DolarApiOfficialResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.compra === 'number' &&
    Number.isFinite(record.compra) &&
    typeof record.venta === 'number' &&
    Number.isFinite(record.venta) &&
    record.venta > 0 &&
    record.casa === 'oficial' &&
    record.moneda === 'USD' &&
    typeof record.fechaActualizacion === 'string' &&
    Number.isFinite(Date.parse(record.fechaActualizacion))
  )
}

async function fetchOfficialUsdArsRate(): Promise<OfficialUsdArsRate> {
  let response: Response
  try {
    response = await fetch(OFFICIAL_RATE_URL, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    throw new ExchangeRateServiceError('No se pudo consultar la cotización oficial del dólar.', {
      cause: error,
    })
  }

  if (!response.ok) {
    throw new ExchangeRateServiceError(
      `DolarApi respondió con el estado HTTP ${response.status}.`,
    )
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    throw new ExchangeRateServiceError('DolarApi devolvió una respuesta inválida.', {
      cause: error,
    })
  }

  if (!isDolarApiOfficialResponse(payload)) {
    throw new ExchangeRateServiceError('DolarApi devolvió una cotización oficial inválida.')
  }

  return {
    rate: payload.venta,
    updatedAt: payload.fechaActualizacion,
  }
}

export async function getOfficialUsdArsRate(): Promise<OfficialUsdArsRate> {
  if (cachedRate && Date.now() - cachedAt < CACHE_TTL_MS) return cachedRate
  if (inFlightRequest) return inFlightRequest

  const request = fetchOfficialUsdArsRate()
  inFlightRequest = request
  try {
    const rate = await request
    cachedRate = rate
    cachedAt = Date.now()
    return rate
  } finally {
    if (inFlightRequest === request) inFlightRequest = null
  }
}

export function convertArsToUsd(amountArs: number, rate: number): number {
  if (!Number.isFinite(amountArs) || amountArs < 0) {
    throw new RangeError('El importe en ARS debe ser un número válido no negativo.')
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new RangeError('La cotización USD/ARS debe ser un número positivo válido.')
  }

  return Math.round((amountArs / rate + Number.EPSILON) * 100) / 100
}
