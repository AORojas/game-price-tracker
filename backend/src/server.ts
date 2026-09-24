import 'dotenv/config'
import { createApp } from './app.js'

const port = Number(process.env.PORT ?? 3000)
const cheapSharkApiUrl =
  process.env.CHEAPSHARK_API_URL ?? 'https://www.cheapshark.com/api/1.0'

if (!Number.isInteger(port) || port <= 0) {
  throw new Error('PORT must be a positive integer')
}

if (!URL.canParse(cheapSharkApiUrl)) {
  throw new Error('CHEAPSHARK_API_URL must be a valid URL')
}

const app = createApp()

app.listen(port, () => {
  console.log(`GamePriceTracker backend listening on port ${port}`)
  console.log(`CheapShark API base URL: ${cheapSharkApiUrl}`)
})
