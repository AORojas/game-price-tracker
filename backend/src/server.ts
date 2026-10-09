import { createApp } from './app.js'
import { cheapSharkApiUrl } from './config/cheapshark.js'
import { redisClient } from './config/redis.js'

const port = Number(process.env.PORT ?? 3000)

if (!Number.isInteger(port) || port <= 0) {
  throw new Error('PORT must be a positive integer')
}

const app = createApp()

await redisClient.connect()

app.listen(port, () => {
  console.log(`GamePriceTracker backend listening on port ${port}`)
  console.log(`CheapShark API base URL: ${cheapSharkApiUrl}`)
})
