import { createHash } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { postgresPool } from '../config/postgres.js'

export type AuthenticatedLocals = {
  userId: string
}

const SESSION_COOKIE = 'gpt_session'

function readSessionToken(request: Request): string | null {
  const cookies = request.headers.cookie?.split(';') ?? []
  const cookie = cookies.find((item) => item.trim().startsWith(`${SESSION_COOKIE}=`))
  return cookie?.trim().slice(SESSION_COOKIE.length + 1) || null
}

export async function requireAuthenticatedUser(
  request: Request,
  response: Response<unknown, AuthenticatedLocals>,
  next: NextFunction,
) {
  const token = readSessionToken(request)
  if (!token) {
    response.status(401).json({ error: 'Inicia sesión para acceder a tu actividad.' })
    return
  }

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const result = await postgresPool.query<{ user_id: string }>(
      `SELECT user_id::text AS user_id
       FROM user_sessions
       WHERE token_hash = $1
         AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash],
    )
    const userId = result.rows[0]?.user_id
    if (!userId) {
      response.status(401).json({ error: 'La sesión expiró o ya no es válida.' })
      return
    }

    response.locals.userId = userId
    next()
  } catch (error) {
    next(error)
  }
}
