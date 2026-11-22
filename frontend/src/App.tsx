import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/useAuth'
import Explore from './pages/Explore'
import ForgotPassword from './pages/ForgotPassword'
import GameDetail from './pages/GameDetail'
import Home from './pages/Home'
import Login from './pages/Login'
import MyList from './pages/MyList'
import Profile from './pages/Profile'
import ProfileCustomization from './pages/ProfileCustomization'
import ResetPassword from './pages/ResetPassword'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/explorar" element={<Explore />} />
            <Route path="/explorar/id/:gameId" element={<GameDetail />} />
            <Route path="/mi-lista" element={<MyList />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/perfil/editar" element={<ProfileCustomization />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
