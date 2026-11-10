import { Link } from 'react-router-dom'
import type { PuzzleMode } from '../../shared/progress/progressStore'
import { getSummary } from '../../shared/progress/progressStore'
import styles from './Home.module.css'

interface ModeInfo {
  mode: PuzzleMode
  path: string
  title: string
  desc: string
}

const MODES: ModeInfo[] = [
  { mode: 'wordScramble', path: '/word-scramble', title: 'Word Scramble', desc: 'Unscramble the letters to find the word' },
  { mode: 'sudoku', path: '/sudoku', title: 'Sudoku', desc: 'Classic number logic puzzle' },
  { mode: 'wordSearch', path: '/word-search', title: 'Word Search', desc: 'Find hidden words in a grid of letters' },
]

function Home() {
  return (
    <div className={styles.page}>
      <h1>Puzzles</h1>
      <p className={styles.subtitle}>Pick a puzzle to play</p>
      <div className={styles.grid}>
        {MODES.map((m) => {
          const summary = getSummary(m.mode)
          return (
            <Link key={m.mode} to={m.path} className={styles.card}>
              <div className={styles.cardTitle}>{m.title}</div>
              <div className={styles.cardDesc}>{m.desc}</div>
              <div className={styles.cardStats}>Solved: {summary.completedCount}</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default Home
