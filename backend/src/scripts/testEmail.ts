import 'dotenv/config'
import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY?.trim()
if (!apiKey) {
  throw new Error('RESEND_API_KEY must be configured in backend/.env')
}

const recipient = process.argv[2]?.trim()
if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
  throw new Error('Pass a valid test recipient email as the first argument')
}

const sender = process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev'
const resend = new Resend(apiKey)
const { data, error } = await resend.emails.send({
  from: sender,
  to: recipient,
  subject: 'Prueba de GamePriceTracker',
  html: '<p>¡El sistema de alertas está funcionando!</p>',
})

if (error) {
  throw new Error(`Resend failed to send the test email: ${error.message}`)
}
if (!data?.id) {
  throw new Error('Resend did not return an email ID')
}

console.info(`Test email sent. Resend ID: ${data.id}`)
