import 'dotenv/config'
import { createClient } from 'redis'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'

if (!URL.canParse(redisUrl)) {
  throw new Error('REDIS_URL must be a valid URL')
}

export const redisClient = createClient({ url: redisUrl })

redisClient.on('error', (error) => {
  console.error('Redis client error', error)
})
