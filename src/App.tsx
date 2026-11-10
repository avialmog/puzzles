import { HashRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home/Home'
import Sudoku from './pages/Sudoku/Sudoku'
import WordScramble from './pages/WordScramble/WordScramble'
import WordSearch from './pages/WordSearch/WordSearch'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/word-scramble" element={<WordScramble />} />
        <Route path="/sudoku" element={<Sudoku />} />
        <Route path="/word-search" element={<WordSearch />} />
      </Routes>
    </HashRouter>
  )
}

export default App
