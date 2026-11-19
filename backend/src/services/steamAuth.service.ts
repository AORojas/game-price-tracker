import passport from 'passport'
import SteamStrategy from 'passport-steam'
import { findOrCreateUserBySteamId } from './auth.service.js'

let strategyRegistered = false

function getApplicationOrigin(value: string, setting: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${setting} must be a valid URL`)
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${setting} must be an HTTP(S) origin`)
  }
  return url.origin
}

function getFrontendOrigin(): string {
  const configuredUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:5173'
  return getApplicationOrigin(configuredUrl, 'FRONTEND_URL')
}

export function getFrontendLoginRedirect(result: 'steam' | 'steam-error'): string {
  const redirectUrl = new URL('/login', getFrontendOrigin())
  redirectUrl.searchParams.set('oauth', result)
  return redirectUrl.toString()
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function configureSteamStrategy(): boolean {
  const apiKey = process.env.STEAM_API_KEY?.trim()
  if (!apiKey) return false
  if (strategyRegistered) return true

  const frontendOrigin = getFrontendOrigin()

  passport.use(
    'steam',
    new SteamStrategy(
      {
        returnURL: `${frontendOrigin}/api/auth/steam/callback`,
        realm: `${frontendOrigin}/`,
        apiKey,
      },
      (identifier, profile, done) => {
        const steamIdMatch =
          /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})\/?$/.exec(identifier)
        if (!steamIdMatch || profile.id !== steamIdMatch[1]) {
          done(new Error('Steam returned an invalid OpenID identifier'))
          return
        }

        const name = profile.displayName?.trim().slice(0, 100) || 'Usuario de Steam'
        const avatar =
          profile.photos
            ?.map((photo) => photo.value)
            .find(
              (value): value is string =>
                typeof value === 'string' && isHttpsUrl(value),
            ) ?? null
        void findOrCreateUserBySteamId(steamIdMatch[1], name, avatar)
          .then((authResult) => done(null, authResult))
          .catch(done)
      },
    ),
  )
  strategyRegistered = true
  return true
}

export { passport as steamPassport }
