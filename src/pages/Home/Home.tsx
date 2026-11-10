import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PuzzleMode } from '../../shared/progress/progressStore'
import { getSummary } from '../../shared/progress/progressStore'
import styles from './Home.module.css'

interface ModeInfo {
  mode: PuzzleMode
  path: string
  key: string
}

const MODES: ModeInfo[] = [
  { mode: 'wordScramble', path: '/word-scramble', key: 'wordScramble' },
  { mode: 'sudoku', path: '/sudoku', key: 'sudoku' },
  { mode: 'wordSearch', path: '/word-search', key: 'wordSearch' },
]

const SCAN_ONLY_MODES = [
  { path: '/crossword/scan', key: 'crossword' },
  { path: '/arrow-crossword/scan', key: 'arrowCrossword' },
  { path: '/codeword/scan', key: 'codeword' },
]

function Home() {
  const { t } = useTranslation()

  return (
    <div className={styles.page}>
      <h1>{t('app.title')}</h1>
      <p className={styles.subtitle}>{t('home.subtitle')}</p>
      <div className={styles.grid}>
        {MODES.map((m) => {
          const summary = getSummary(m.mode)
          return (
            <Link key={m.key} to={m.path} className={styles.card}>
              <div className={styles.cardTitle}>{t(`home.modes.${m.key}.title`)}</div>
              <div className={styles.cardDesc}>{t(`home.modes.${m.key}.desc`)}</div>
              <div className={styles.cardStats}>{t('home.solved', { count: summary.completedCount })}</div>
            </Link>
          )
        })}
        {SCAN_ONLY_MODES.map((m) => (
          <Link key={m.key} to={m.path} className={styles.card}>
            <div className={styles.cardTitle}>{t(`home.modes.${m.key}.title`)}</div>
            <div className={styles.cardDesc}>{t(`home.modes.${m.key}.desc`)}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Home
