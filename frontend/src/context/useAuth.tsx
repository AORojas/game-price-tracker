import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { getCurrentUser, logoutUser, type AuthUser } from '../services/authService'

type AuthContextType = {
  user: AuthUser | null
  isLoading: boolean
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    setIsLoading(true)
    const controller = new AbortController()
    try {
      const currentUser = await getCurrentUser(controller.signal)
      setUser(currentUser)
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Failed to refresh session:', error)
        setUser(null)
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
      setUser(null)
    } catch (error) {
      console.error('Failed to logout:', error)
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
