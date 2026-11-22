export type AuthUser = {
  id: string
  name: string
  email: string
  avatarId: string | null
  avatarUrl: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readUserResponse(response: Response): Promise<AuthUser> {
  const payload: unknown = await response.json()
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'No se pudo completar la solicitud.'
    throw new Error(message)
  }

  if (
    !isRecord(payload) ||
    !isRecord(payload.user) ||
    typeof payload.user.id !== 'string' ||
    typeof payload.user.name !== 'string' ||
    typeof payload.user.email !== 'string' ||
    (payload.user.avatarId !== null && typeof payload.user.avatarId !== 'string') ||
    (payload.user.avatarUrl !== null && typeof payload.user.avatarUrl !== 'string')
  ) {
    throw new Error('El servidor devolvió una respuesta de autenticación inválida.')
  }

  return {
    id: payload.user.id,
    name: payload.user.name,
    email: payload.user.email,
    avatarId: payload.user.avatarId,
    avatarUrl: payload.user.avatarUrl,
  }
}

async function readApiPayload(response: Response): Promise<unknown> {
  const payload: unknown = await response.json()
  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'No se pudo completar la solicitud.'
    throw new Error(message)
  }
  return payload
}

async function submitCredentials(
  endpoint: '/api/auth/login' | '/api/auth/register',
  credentials: { email: string; password: string; name?: string },
): Promise<AuthUser> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(credentials),
  })
  return readUserResponse(response)
}

export function loginUser(email: string, password: string): Promise<AuthUser> {
  return submitCredentials('/api/auth/login', { email, password })
}

export function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  return submitCredentials('/api/auth/register', { name, email, password })
}

export async function loginWithGoogle(idToken: string): Promise<AuthUser> {
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ idToken }),
  })
  return readUserResponse(response)
}

export async function requestPasswordReset(email: string): Promise<string> {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email }),
  })
  const payload = await readApiPayload(response)
  if (!isRecord(payload) || typeof payload.message !== 'string') {
    throw new Error('El servidor devolvió una respuesta de recuperación inválida.')
  }
  return payload.message
}

export async function recoverPasswordWithGoogle(credential: string): Promise<string> {
  const response = await fetch('/api/auth/recover-with-google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ credential }),
  })
  const payload = await readApiPayload(response)
  if (!isRecord(payload) || typeof payload.token !== 'string') {
    throw new Error('El servidor devolvió un token de recuperación inválido.')
  }
  return payload.token
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ token, password }),
  })
  const payload = await readApiPayload(response)
  if (!isRecord(payload) || typeof payload.message !== 'string') {
    throw new Error('El servidor devolvió una respuesta de restablecimiento inválida.')
  }
}

export async function updateProfileAvatar(avatarId: string): Promise<AuthUser> {
  const response = await fetch('/api/auth/profile/avatar', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ avatarId }),
  })
  return readUserResponse(response)
}

export async function getCurrentUser(signal: AbortSignal): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', {
    credentials: 'same-origin',
    signal,
  })
  if (response.status === 401) return null
  return readUserResponse(response)
}

export async function logoutUser(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new Error('No se pudo cerrar la sesión.')
  }
}
