import express from 'express'
import authRouter from './routes/auth.routes.js'
import gameRouter from './routes/game.routes.js'
import userActivityRouter from './routes/userActivity.routes.js'

export function createApp() {
  const app = express()

  app.use(express.json({ limit: '16kb' }))

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/games', gameRouter)
  app.use('/api/user-activity', userActivityRouter)

  app.use((
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('Unhandled API error', error)
    response.status(500).json({ error: 'Ocurrió un error inesperado en el servidor.' })
  })

  return app
}
