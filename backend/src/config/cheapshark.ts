import 'dotenv/config'

export const cheapSharkApiUrl =
  process.env.CHEAPSHARK_API_URL ?? 'https://www.cheapshark.com/api/1.0'

if (!URL.canParse(cheapSharkApiUrl)) {
  throw new Error('CHEAPSHARK_API_URL must be a valid URL')
}
