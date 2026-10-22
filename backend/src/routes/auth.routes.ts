import { Router } from 'express'
import { currentUser, login, logout, register } from '../controllers/auth.controller.js'

const authRouter = Router()

authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.post('/logout', logout)
authRouter.get('/me', currentUser)

export default authRouter
