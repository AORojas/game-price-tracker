import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Explore from './pages/Explore'
import GameDetail from './pages/GameDetail'
import Home from './pages/Home'
import Login from './pages/Login'
import MyList from './pages/MyList'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/explorar" element={<Explore />} />
          <Route path="/explorar/id/:gameId" element={<GameDetail />} />
          <Route path="/mi-lista" element={<MyList />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
