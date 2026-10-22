export type AuthUser = {
  id: string
  name: string
  email: string
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
    typeof payload.user.email !== 'string'
  ) {
    throw new Error('El servidor devolvió una respuesta de autenticación inválida.')
  }

  return {
    id: payload.user.id,
    name: payload.user.name,
    email: payload.user.email,
  }
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
