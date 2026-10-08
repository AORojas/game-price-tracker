import 'dotenv/config'

export const rawgApiKey = process.env.RAWG_API_KEY
export const rawgApiUrl = 'https://api.rawg.io/api'

if (!URL.canParse(rawgApiUrl)) {
  throw new Error('RAWG_API_URL must be a valid URL')
}
