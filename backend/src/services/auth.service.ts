import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { PoolClient } from 'pg'
import { postgresPool } from '../config/postgres.js'

const scrypt = promisify(scryptCallback)
const PASSWORD_HASH_BYTES = 64
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export type AuthUser = {
  id: string
  name: string
  email: string
  avatarId: string | null
  avatarUrl: string | null
}

export type AuthResult = {
  user: AuthUser
  sessionToken: string
}

export class OAuthAccountConflictError extends Error {
  constructor() {
    super('This email is already linked to a different Google account')
    this.name = 'OAuthAccountConflictError'
  }
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scrypt(password, salt, PASSWORD_HASH_BYTES)) as Buffer
  return `scrypt$${salt}$${derivedKey.toString('hex')}`
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, keyHex] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !keyHex || !/^[\da-f]+$/i.test(keyHex)) {
    return false
  }

  const expectedKey = Buffer.from(keyHex, 'hex')
  if (expectedKey.length !== PASSWORD_HASH_BYTES) return false

  const actualKey = (await scrypt(password, salt, expectedKey.length)) as Buffer
  return timingSafeEqual(actualKey, expectedKey)
}

async function createSession(client: PoolClient, userId: string): Promise<string> {
  await client.query('DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP')
  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashSessionToken(token)
  await client.query(
    `INSERT INTO user_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 second'))`,
    [tokenHash, userId, SESSION_MAX_AGE_SECONDS],
  )
  return token
}

async function commitUserSession(
  client: PoolClient,
  user: AuthUser,
): Promise<AuthResult> {
  const sessionToken = await createSession(client, user.id)
  return { user, sessionToken }
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const passwordHash = await hashPassword(password)
  const client = await postgresPool.connect()

  try {
    await client.query('BEGIN')
    const result = await client.query<AuthUser>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id::text AS id, name, email, avatar_id AS "avatarId",
                 avatar_url AS "avatarUrl"`,
      [name, email, passwordHash],
    )
    const authResult = await commitUserSession(client, result.rows[0])
    await client.query('COMMIT')
    return authResult
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult | null> {
  const client = await postgresPool.connect()

  try {
    await client.query('BEGIN')
    const result = await client.query<AuthUser & { password_hash: string | null }>(
      `SELECT id::text AS id, name, email, avatar_id AS "avatarId",
              avatar_url AS "avatarUrl", password_hash
       FROM users
       WHERE lower(email) = $1`,
      [email],
    )
    const row = result.rows[0]
    if (!row || !row.password_hash || !(await verifyPassword(password, row.password_hash))) {
      await client.query('ROLLBACK')
      return null
    }

    const authResult = await commitUserSession(client, {
      id: row.id,
      name: row.name,
      email: row.email,
      avatarId: row.avatarId,
      avatarUrl: row.avatarUrl,
    })
    await client.query('COMMIT')
    return authResult
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function getUserForSession(token: string): Promise<AuthUser | null> {
  const result = await postgresPool.query<AuthUser>(
    `SELECT users.id::text AS id, users.name, users.email,
            users.avatar_id AS "avatarId", users.avatar_url AS "avatarUrl"
     FROM user_sessions
     JOIN users ON users.id = user_sessions.user_id
     WHERE user_sessions.token_hash = $1
       AND user_sessions.expires_at > CURRENT_TIMESTAMP`,
    [hashSessionToken(token)],
  )
  return result.rows[0] ?? null
}

export async function updateUserAvatar(
  token: string,
  avatarId: string,
): Promise<AuthUser | null> {
  const result = await postgresPool.query<AuthUser>(
    `UPDATE users
     SET avatar_id = $2
     WHERE id = (
       SELECT user_id
       FROM user_sessions
       WHERE token_hash = $1
         AND expires_at > CURRENT_TIMESTAMP
     )
     RETURNING id::text AS id, name, email, avatar_id AS "avatarId",
               avatar_url AS "avatarUrl"`,
    [hashSessionToken(token), avatarId],
  )
  return result.rows[0] ?? null
}

export async function findOrCreateUserByEmail(
  email: string,
  name: string,
  picture: string | null,
  googleSub: string,
): Promise<AuthResult> {
  const client = await postgresPool.connect()

  try {
    await client.query('BEGIN')
    const bySubject = await client.query<AuthUser>(
      `SELECT id::text AS id, name, email, avatar_id AS "avatarId",
              avatar_url AS "avatarUrl"
       FROM users
       WHERE google_sub = $1
       FOR UPDATE`,
      [googleSub],
    )
    let user = bySubject.rows[0]

    if (!user) {
      const byEmail = await client.query<AuthUser & { google_sub: string | null }>(
        `SELECT id::text AS id, name, email, avatar_id AS "avatarId",
                avatar_url AS "avatarUrl", google_sub
         FROM users
         WHERE lower(email) = $1
         FOR UPDATE`,
        [email],
      )
      const existing = byEmail.rows[0]
      if (existing?.google_sub && existing.google_sub !== googleSub) {
        throw new OAuthAccountConflictError()
      }

      if (existing) {
        const linked = await client.query<AuthUser>(
          `UPDATE users
           SET google_sub = $2, avatar_url = COALESCE($3, avatar_url)
           WHERE id = $1
           RETURNING id::text AS id, name, email, avatar_id AS "avatarId",
                     avatar_url AS "avatarUrl"`,
          [existing.id, googleSub, picture],
        )
        user = linked.rows[0]
      } else {
        const created = await client.query<AuthUser>(
          `INSERT INTO users (name, email, password_hash, google_sub, avatar_url)
           VALUES ($1, $2, NULL, $3, $4)
           RETURNING id::text AS id, name, email, avatar_id AS "avatarId",
                     avatar_url AS "avatarUrl"`,
          [name, email, googleSub, picture],
        )
        user = created.rows[0]
      }
    } else if (picture && picture !== user.avatarUrl) {
      const updated = await client.query<AuthUser>(
        `UPDATE users
         SET avatar_url = $2
         WHERE id = $1
         RETURNING id::text AS id, name, email, avatar_id AS "avatarId",
                   avatar_url AS "avatarUrl"`,
        [user.id, picture],
      )
      user = updated.rows[0]
    }

    const authResult = await commitUserSession(client, user)
    await client.query('COMMIT')
    return authResult
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function findOrCreateUserBySteamId(
  steamId: string,
  name: string,
  avatar: string | null,
): Promise<AuthResult> {
  const client = await postgresPool.connect()

  try {
    await client.query('BEGIN')
    const existing = await client.query<AuthUser>(
      `SELECT id::text AS id, name, email, avatar_id AS "avatarId",
              avatar_url AS "avatarUrl"
       FROM users
       WHERE steam_id = $1
       FOR UPDATE`,
      [steamId],
    )
    let user = existing.rows[0]

    if (user) {
      const updated = await client.query<AuthUser>(
        `UPDATE users
         SET name = $2, avatar_url = COALESCE($3, avatar_url)
         WHERE id = $1
         RETURNING id::text AS id, name, email, avatar_id AS "avatarId",
                   avatar_url AS "avatarUrl"`,
        [user.id, name, avatar],
      )
      user = updated.rows[0]
    } else {
      const syntheticEmail = `steam_${steamId}@placeholder.local`
      const created = await client.query<AuthUser>(
        `INSERT INTO users (name, email, password_hash, steam_id, avatar_url)
         VALUES ($1, $2, NULL, $3, $4)
         RETURNING id::text AS id, name, email, avatar_id AS "avatarId",
                   avatar_url AS "avatarUrl"`,
        [name, syntheticEmail, steamId, avatar],
      )
      user = created.rows[0]
    }

    const authResult = await commitUserSession(client, user)
    await client.query('COMMIT')
    return authResult
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteSession(token: string): Promise<void> {
  await postgresPool.query('DELETE FROM user_sessions WHERE token_hash = $1', [
    hashSessionToken(token),
  ])
}
