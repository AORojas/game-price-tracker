import { Router } from 'express'
import {
  currentUser,
  beginSteamLogin,
  completeSteamLogin,
  login,
  loginWithGoogle,
  logout,
  register,
  saveAvatar,
} from '../controllers/auth.controller.js'
import { steamPassport } from '../services/steamAuth.service.js'

const authRouter = Router()

authRouter.use(steamPassport.initialize())
authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.post('/google', loginWithGoogle)
authRouter.get('/steam', beginSteamLogin)
authRouter.get('/steam/callback', completeSteamLogin)
authRouter.post('/logout', logout)
authRouter.get('/me', currentUser)
authRouter.patch('/profile/avatar', saveAvatar)

export default authRouter
