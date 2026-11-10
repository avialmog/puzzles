import { HashRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home/Home'
import ScanArrowCrossword from './pages/ScanArrowCrossword/ScanArrowCrossword'
import ScanCodeword from './pages/ScanCodeword/ScanCodeword'
import ScanCrossword from './pages/ScanCrossword/ScanCrossword'
import ScanSudoku from './pages/ScanSudoku/ScanSudoku'
import ScanWordSearch from './pages/ScanWordSearch/ScanWordSearch'
import Sudoku from './pages/Sudoku/Sudoku'
import WordScramble from './pages/WordScramble/WordScramble'
import WordSearch from './pages/WordSearch/WordSearch'
import LanguageSwitcher from './shared/i18n/LanguageSwitcher'

function App() {
  return (
    <HashRouter>
      <LanguageSwitcher />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/word-scramble" element={<WordScramble />} />
        <Route path="/sudoku" element={<Sudoku />} />
        <Route path="/sudoku/scan" element={<ScanSudoku />} />
        <Route path="/word-search" element={<WordSearch />} />
        <Route path="/word-search/scan" element={<ScanWordSearch />} />
        <Route path="/crossword/scan" element={<ScanCrossword />} />
        <Route path="/arrow-crossword/scan" element={<ScanArrowCrossword />} />
        <Route path="/codeword/scan" element={<ScanCodeword />} />
      </Routes>
    </HashRouter>
  )
}

export default App
