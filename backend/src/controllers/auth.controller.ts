import type { NextFunction, Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import {
  deleteSession,
  findOrCreateUserByEmail,
  getUserForSession,
  loginUser,
  OAuthAccountConflictError,
  registerUser,
  SESSION_MAX_AGE_SECONDS,
  updateUserAvatar,
} from '../services/auth.service.js'

const SESSION_COOKIE = 'gpt_session'
const googleOAuthClient = new OAuth2Client()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readCredentials(body: unknown) {
  if (!isRecord(body)) return null
  const email = body.email
  const password = body.password
  if (typeof email !== 'string' || typeof password !== 'string') return null

  const normalizedEmail = email.trim().toLowerCase()
  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    password.length < 8 ||
    password.length > 128
  ) {
    return null
  }

  return { email: normalizedEmail, password }
}

function readSessionToken(request: Request): string | null {
  const cookies = request.headers.cookie?.split(';') ?? []
  const sessionCookie = cookies.find((cookie) => cookie.trim().startsWith(`${SESSION_COOKIE}=`))
  return sessionCookie?.trim().slice(SESSION_COOKIE.length + 1) || null
}

function setSessionCookie(response: Response, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`,
  )
}

function clearSessionCookie(response: Response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`,
  )
}

export async function register(request: Request, response: Response, next: NextFunction) {
  const credentials = readCredentials(request.body)
  if (!credentials || !isRecord(request.body) || typeof request.body.name !== 'string') {
    response.status(400).json({ error: 'Ingresa nombre, correo y contraseña válidos.' })
    return
  }

  const name = request.body.name.trim()
  if (!name || name.length > 100) {
    response.status(400).json({ error: 'El nombre debe tener entre 1 y 100 caracteres.' })
    return
  }

  try {
    const result = await registerUser(name, credentials.email, credentials.password)
    setSessionCookie(response, result.sessionToken)
    response.status(201).json({ user: result.user })
  } catch (error) {
    if (isRecord(error) && error.code === '23505') {
      response.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico.' })
      return
    }
    next(error)
  }
}

export async function login(request: Request, response: Response, next: NextFunction) {
  const credentials = readCredentials(request.body)
  if (!credentials) {
    response.status(400).json({ error: 'Correo o contraseña con formato inválido.' })
    return
  }

  try {
    const result = await loginUser(credentials.email, credentials.password)
    if (!result) {
      response.status(401).json({ error: 'Correo o contraseña incorrectos.' })
      return
    }

    setSessionCookie(response, result.sessionToken)
    response.json({ user: result.user })
  } catch (error) {
    next(error)
  }
}

export async function loginWithGoogle(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const idToken =
    isRecord(request.body) && typeof request.body.idToken === 'string'
      ? request.body.idToken.trim()
      : ''
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  if (!clientId) {
    response.status(503).json({ error: 'El inicio de sesión con Google no está configurado.' })
    return
  }
  if (!idToken || idToken.length > 8192) {
    response.status(400).json({ error: 'El token de Google no es válido.' })
    return
  }

  let payload:
    | {
        email?: string
        email_verified?: boolean
        name?: string
        picture?: string
        sub?: string
      }
    | undefined
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: clientId,
    })
    payload = ticket.getPayload()
  } catch {
    response.status(401).json({ error: 'No se pudo verificar la identidad de Google.' })
    return
  }

  const email = payload?.email?.trim().toLowerCase()
  const googleSub = payload?.sub
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !googleSub ||
    payload?.email_verified !== true
  ) {
    response.status(401).json({ error: 'Google debe proporcionar un correo verificado.' })
    return
  }

  const name = payload.name?.trim().slice(0, 100) || email.split('@')[0]
  const picture = payload.picture && isHttpsUrl(payload.picture) ? payload.picture : null
  try {
    const result = await findOrCreateUserByEmail(email, name, picture, googleSub)
    setSessionCookie(response, result.sessionToken)
    response.json({ user: result.user })
  } catch (error) {
    if (error instanceof OAuthAccountConflictError) {
      response.status(409).json({
        error: 'Este correo ya está vinculado a otra cuenta de Google.',
      })
      return
    }
    next(error)
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export async function currentUser(request: Request, response: Response, next: NextFunction) {
  const token = readSessionToken(request)
  if (!token) {
    response.status(401).json({ error: 'No hay una sesión activa.' })
    return
  }

  try {
    const user = await getUserForSession(token)
    if (!user) {
      clearSessionCookie(response)
      response.status(401).json({ error: 'La sesión expiró o ya no es válida.' })
      return
    }
    response.json({ user })
  } catch (error) {
    next(error)
  }
}

export async function saveAvatar(request: Request, response: Response, next: NextFunction) {
  const token = readSessionToken(request)
  if (!token) {
    response.status(401).json({ error: 'Inicia sesión para guardar tu avatar.' })
    return
  }

  if (
    !isRecord(request.body) ||
    typeof request.body.avatarId !== 'string' ||
    !/^[a-z0-9-]{1,60}$/.test(request.body.avatarId)
  ) {
    response.status(400).json({ error: 'Selecciona un avatar válido.' })
    return
  }

  try {
    const user = await updateUserAvatar(token, request.body.avatarId)
    if (!user) {
      clearSessionCookie(response)
      response.status(401).json({ error: 'La sesión expiró o ya no es válida.' })
      return
    }
    response.json({ user })
  } catch (error) {
    if (isRecord(error) && error.code === '23503') {
      response.status(400).json({ error: 'El avatar seleccionado no está disponible.' })
      return
    }
    next(error)
  }
}

export async function logout(request: Request, response: Response, next: NextFunction) {
  const token = readSessionToken(request)
  try {
    if (token) await deleteSession(token)
    clearSessionCookie(response)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
}
