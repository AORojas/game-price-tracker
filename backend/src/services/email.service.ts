import { Resend } from 'resend'
import type { OfficialUsdArsRate } from './exchangeRate.service.js'

export type AlertEmail = {
  id: string
  notification_version: number
  email: string
  game_title: string
  target_price: string
  current_price: string
  currency: string
  store_name: string
  deal_id: string
  exchange_rate: string | null
  exchange_rate_updated_at: Date | null
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function createOfferUrl(dealId: string) {
  if (!dealId.trim()) throw new Error('The offer is missing its CheapShark deal ID')

  const url = new URL('https://www.cheapshark.com/redirect')
  url.searchParams.set('dealID', dealId)
  return url.toString()
}

function formatArsPrice(value: number) {
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
  return `$${formatted} ARS`
}

function formatUsdPrice(value: string) {
  return `USD ${Number(value).toFixed(2)}`
}

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  if (!from) throw new Error('RESEND_FROM_EMAIL is not configured')
  return { client: new Resend(apiKey), from }
}

type EmailContent = {
  to: string
  subject: string
  html: string
  text: string
}

function getEmailProvider(): 'brevo' | 'resend' {
  const configuredProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase()
  if (configuredProvider === 'brevo' || configuredProvider === 'resend') {
    return configuredProvider
  }
  if (configuredProvider) {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${configuredProvider}`)
  }
  return process.env.BREVO_API_KEY?.trim() ? 'brevo' : 'resend'
}

async function sendWithBrevo(email: EmailContent): Promise<string | null> {
  const apiKey = process.env.BREVO_API_KEY?.trim()
  const from = process.env.BREVO_FROM_EMAIL?.trim()
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured')
  if (!from) throw new Error('BREVO_FROM_EMAIL is not configured')

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_FROM_NAME?.trim() || 'GamePriceTracker',
        email: from,
      },
      to: [{ email: email.to }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    }),
  })

  const responseText = await response.text()
  let responseBody: unknown
  try {
    responseBody = responseText ? JSON.parse(responseText) : undefined
  } catch {
    responseBody = undefined
  }

  if (!response.ok) {
    const body = responseBody as { message?: unknown; code?: unknown } | undefined
    const message =
      (typeof body?.message === 'string' && body.message) ||
      (typeof body?.code === 'string' && body.code) ||
      responseText.trim() ||
      'No error details returned'
    throw new Error(
      `Brevo failed to send the email (HTTP ${response.status} ${response.statusText}): ${message}`,
    )
  }

  const body = responseBody as { messageId?: unknown } | undefined
  return typeof body?.messageId === 'string' ? body.messageId : null
}

async function sendEmail(
  email: EmailContent,
  resendEmailDescription: 'password reset email' | 'alert email',
  idempotencyKey?: string,
) {
  if (getEmailProvider() === 'brevo') {
    return { provider: 'brevo' as const, messageId: await sendWithBrevo(email) }
  }

  const { client, from } = createResendClient()
  const message = {
    from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  }
  const result = idempotencyKey
    ? await client.emails.send(message, { idempotencyKey })
    : await client.emails.send(message)

  if (result.error) {
    throw new Error(
      `Resend failed to send the ${resendEmailDescription}: ${result.error.message}`,
    )
  }
  if (!result.data?.id) throw new Error('Resend did not return an email ID')

  return { provider: 'resend' as const, messageId: result.data.id }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  const safeResetUrl = escapeHtml(resetUrl)
  await sendEmail(
    {
      to: email,
      subject: 'Restablece tu contraseña de GamePriceTracker',
      html: `
      <div style="background:#0b1120;padding:32px 16px;font-family:Arial,sans-serif;color:#e2e8f0">
        <div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #263244;border-radius:16px;padding:32px">
          <p style="margin:0 0 24px;color:#60a5fa;font-size:18px;font-weight:700">GamePriceTracker</p>
          <h1 style="margin:0 0 12px;font-size:24px;color:#fff">Restablece tu contraseña</h1>
          <p style="margin:0 0 24px;color:#cbd5e1">Recibimos una solicitud para cambiar la contraseña de tu cuenta. El enlace vence en una hora y solo puede usarse una vez.</p>
          <a href="${safeResetUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Crear nueva contraseña</a>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      </div>`,
      text: `Recibimos una solicitud para cambiar la contraseña de tu cuenta de GamePriceTracker. El enlace vence en una hora y solo puede usarse una vez. Para crear una nueva contraseña, visita: ${resetUrl}. Si no solicitaste este cambio, puedes ignorar este correo.`,
    },
    'password reset email',
  )
}

export async function sendAlertEmail(alert: AlertEmail, rate: OfficialUsdArsRate) {
  const gameTitle = escapeHtml(alert.game_title)
  const storeName = escapeHtml(alert.store_name)
  const currentPriceUsd = Number(alert.current_price)
  const targetPriceUsd = Number(alert.target_price)
  if (!Number.isFinite(currentPriceUsd) || !Number.isFinite(targetPriceUsd)) {
    throw new Error('Alert email contains an invalid USD price')
  }
  const currentPriceArs = escapeHtml(formatArsPrice(currentPriceUsd * rate.rate))
  const targetPriceArs = escapeHtml(formatArsPrice(targetPriceUsd * rate.rate))
  const currentPrice = `${currentPriceArs} (${escapeHtml(formatUsdPrice(alert.current_price))})`
  const targetPrice = `${targetPriceArs} (${escapeHtml(formatUsdPrice(alert.target_price))})`
  const rateUpdatedAt = escapeHtml(
    new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date(rate.updatedAt)),
  )
  const rateDescription = `Cotización oficial vendedor consultada el ${rateUpdatedAt}: USD 1 = ${escapeHtml(formatArsPrice(rate.rate))}.`
  const offerUrl = escapeHtml(createOfferUrl(alert.deal_id))
  const result = await sendEmail(
    {
      to: alert.email,
      subject: `¡El precio de ${alert.game_title} bajó!`,
      html: `
        <div style="background:#0b1120;padding:32px 16px;font-family:Arial,sans-serif;color:#e2e8f0">
          <div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #263244;border-radius:16px;padding:32px">
            <p style="margin:0 0 24px;color:#60a5fa;font-size:18px;font-weight:700">GamePriceTracker</p>
            <h1 style="margin:0 0 12px;font-size:24px;color:#fff">¡Encontramos una oferta!</h1>
            <p style="margin:0 0 24px;color:#cbd5e1">El precio de <strong>${gameTitle}</strong> llegó a tu objetivo.</p>
            <p style="margin:0 0 8px;color:#94a3b8">Precio actual en ${storeName}</p>
            <p style="margin:0 0 8px;color:#34d399;font-size:24px;font-weight:700">${currentPrice}</p>
            <p style="margin:0 0 24px;color:#94a3b8">Objetivo: ${targetPrice}</p>
            <p style="margin:0 0 24px;color:#64748b;font-size:12px">${rateDescription}</p>
            <a href="${offerUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Ver oferta</a>
          </div>
        </div>`,
      text: `El precio de ${alert.game_title} llegó a tu objetivo. Precio actual en ${alert.store_name}: ${currentPrice}. Objetivo: ${targetPrice}. ${rateDescription} Ver oferta: ${createOfferUrl(alert.deal_id)}`,
    },
    'alert email',
    `alert-${alert.id}-v${alert.notification_version}`,
  )
  return result.messageId
}
