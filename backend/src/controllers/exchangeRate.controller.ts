import type { NextFunction, Request, Response } from 'express'
import {
  ExchangeRateServiceError,
  getOfficialUsdArsRate,
} from '../services/exchangeRate.service.js'

export async function getUsdArsRate(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    response.json(await getOfficialUsdArsRate())
  } catch (error) {
    if (error instanceof ExchangeRateServiceError) {
      response.status(503).json({ error: 'La cotización oficial no está disponible.' })
      return
    }
    next(error)
  }
}
