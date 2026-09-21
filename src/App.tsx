import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Explore from './pages/Explore'
import Home from './pages/Home'
import MyList from './pages/MyList'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explorar" element={<Explore />} />
        <Route path="/mi-lista" element={<MyList />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
