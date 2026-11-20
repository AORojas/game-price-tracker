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

export async function sendAlertEmail(alert: AlertEmail, rate: OfficialUsdArsRate) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  if (!from) throw new Error('RESEND_FROM_EMAIL is not configured')

  const client = new Resend(apiKey)
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
  const { data, error } = await client.emails.send(
    {
      from,
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
    { idempotencyKey: `alert-${alert.id}-v${alert.notification_version}` },
  )

  if (error) {
    throw new Error(`Resend failed to send the alert email: ${error.message}`)
  }
  if (!data?.id) throw new Error('Resend did not return an email ID')

  return data.id
}
