import express from 'express'
import gameRouter from './routes/game.routes.js'

export function createApp() {
  const app = express()

  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.use('/api/games', gameRouter)

  return app
}
