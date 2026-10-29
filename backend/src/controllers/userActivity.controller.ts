import type { NextFunction, Request, Response } from 'express'
import type { AuthenticatedLocals } from '../middleware/requireAuthenticatedUser.js'
import {
  addUserSearch,
  createUserAlert,
  createUserSavedOffer,
  deleteUserAlert,
  deleteUserFavorite,
  deleteUserSavedOffer,
  getUserAlerts,
  getUserActivity,
  getUserFavorites,
  getUserSavedOffers,
  getUserSearchHistory,
  toggleUserFavorite,
  updateUserAlert,
} from '../services/userActivity.service.js'

type ActivityRequest = Request<
  Record<string, string>,
  unknown,
  unknown,
  Record<string, string>,
  AuthenticatedLocals
>
type ActivityResponse = Response<unknown, AuthenticatedLocals>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidExternalId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length <= 200 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  )
}

function isValidRecordId(value: string): boolean {
  return /^\d{1,19}$/.test(value) && BigInt(value) > 0n && BigInt(value) <= 9_223_372_036_854_775_807n
}

function isValidPrice(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 99_999_999.99
  )
}

function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function sendMissingRecord(response: ActivityResponse, resource: string) {
  response.status(404).json({ error: `${resource} no encontrado.` })
}

export async function getActivity(
  _request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  try {
    response.json(await getUserActivity(response.locals.userId))
  } catch (error) {
    next(error)
  }
}

async function getResource<T>(
  response: ActivityResponse,
  next: NextFunction,
  getData: (userId: string) => Promise<T>,
) {
  try {
    response.json(await getData(response.locals.userId))
  } catch (error) {
    next(error)
  }
}

export function getFavorites(
  _request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  return getResource(response, next, getUserFavorites)
}

export function getAlerts(
  _request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  return getResource(response, next, getUserAlerts)
}

export function getSavedOffers(
  _request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  return getResource(response, next, getUserSavedOffers)
}

export function getSearchHistory(
  _request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  return getResource(response, next, getUserSearchHistory)
}

export async function toggleFavorite(
  request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  const gameId = isRecord(request.body) ? request.body.gameId : undefined
  if (!isValidExternalId(gameId)) {
    response.status(400).json({ error: 'Ingresa un identificador de juego válido.' })
    return
  }

  try {
    response.json(await toggleUserFavorite(response.locals.userId, gameId.trim()))
  } catch (error) {
    next(error)
  }
}

export async function removeFavorite(
  request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  const { favoriteId } = request.params
  if (!isValidRecordId(favoriteId)) {
    response.status(400).json({ error: 'El identificador del favorito no es válido.' })
    return
  }

  try {
    if (!(await deleteUserFavorite(response.locals.userId, favoriteId))) {
      sendMissingRecord(response, 'Favorito')
      return
    }
    response.status(204).end()
  } catch (error) {
    next(error)
  }
}

export async function createAlert(
  request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  const body = isRecord(request.body) ? request.body : null
  if (!body || !isValidExternalId(body.gameId) || !isValidPrice(body.targetPrice)) {
    response.status(400).json({ error: 'Ingresa un juego y un precio objetivo válido.' })
    return
  }

  try {
    const alert = await createUserAlert(
      response.locals.userId,
      body.gameId.trim(),
      body.targetPrice,
    )
    response.status(201).json({ alert })
  } catch (error) {
    next(error)
  }
}

export async function updateAlert(
  request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  const { alertId } = request.params
  const isActive = isRecord(request.body) ? request.body.isActive : undefined
  if (!isValidRecordId(alertId) || typeof isActive !== 'boolean') {
    response.status(400).json({ error: 'Ingresa un estado válido para la alerta.' })
    return
  }

  try {
    const alert = await updateUserAlert(response.locals.userId, alertId, isActive)
    if (!alert) {
      sendMissingRecord(response, 'Alerta')
      return
    }
    response.json({ alert })
  } catch (error) {
    next(error)
  }
}

export async function removeAlert(
  request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  const { alertId } = request.params
  if (!isValidRecordId(alertId)) {
    response.status(400).json({ error: 'El identificador de la alerta no es válido.' })
    return
  }

  try {
    if (!(await deleteUserAlert(response.locals.userId, alertId))) {
      sendMissingRecord(response, 'Alerta')
      return
    }
    response.status(204).end()
  } catch (error) {
    next(error)
  }
}

export async function saveOffer(
  request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  const body = isRecord(request.body) ? request.body : null
  if (
    !body ||
    !isValidExternalId(body.offerId) ||
    !isValidPrice(body.priceAtSave) ||
    !isSafeHttpUrl(body.url)
  ) {
    response.status(400).json({ error: 'Los datos de la oferta no son válidos.' })
    return
  }

  try {
    const offer = await createUserSavedOffer(
      response.locals.userId,
      body.offerId.trim(),
      body.priceAtSave,
      body.url,
    )
    response.status(201).json({ offer })
  } catch (error) {
    next(error)
  }
}

export async function removeSavedOffer(
  request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  const { savedOfferId } = request.params
  if (!isValidRecordId(savedOfferId)) {
    response.status(400).json({ error: 'El identificador de la oferta no es válido.' })
    return
  }

  try {
    if (!(await deleteUserSavedOffer(response.locals.userId, savedOfferId))) {
      sendMissingRecord(response, 'Oferta guardada')
      return
    }
    response.status(204).end()
  } catch (error) {
    next(error)
  }
}

export async function addSearch(
  request: ActivityRequest,
  response: ActivityResponse,
  next: NextFunction,
) {
  const searchTerm = isRecord(request.body) ? request.body.searchTerm : undefined
  if (
    typeof searchTerm !== 'string' ||
    !searchTerm.trim() ||
    searchTerm.trim().length > 200
  ) {
    response.status(400).json({ error: 'Ingresa un término de búsqueda válido.' })
    return
  }

  try {
    const entry = await addUserSearch(response.locals.userId, searchTerm.trim())
    response.status(201).json({ entry })
  } catch (error) {
    next(error)
  }
}
