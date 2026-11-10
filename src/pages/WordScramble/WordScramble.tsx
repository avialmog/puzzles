import { useState } from 'react'
import { Link } from 'react-router-dom'
import { pickRandomEntry, scrambleWord } from '../../domain/wordScramble/shuffle'
import type { WordEntry } from '../../domain/wordScramble/types'
import { getSummary, recordResult } from '../../shared/progress/progressStore'
import styles from './WordScramble.module.css'

function newRound(excludeWord?: string): { entry: WordEntry; scrambled: string } {
  const entry = pickRandomEntry(excludeWord)
  return { entry, scrambled: scrambleWord(entry.word) }
}

function WordScramble() {
  const [round, setRound] = useState(() => newRound())
  const [guess, setGuess] = useState('')
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [showHint, setShowHint] = useState(false)
  const [startedAt] = useState(() => performance.now())
  const [summary, setSummary] = useState(() => getSummary('wordScramble'))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'correct') return

    if (guess.trim().toUpperCase() === round.entry.word) {
      const elapsedMs = Math.round(performance.now() - startedAt)
      recordResult('wordScramble', { completed: true, elapsedMs, details: round.entry.word })
      setStatus('correct')
      setSummary(getSummary('wordScramble'))
    } else {
      setStatus('incorrect')
    }
  }

  function handleNext() {
    setRound(newRound(round.entry.word))
    setGuess('')
    setStatus('idle')
    setShowHint(false)
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        ← Home
      </Link>
      <h1>Word Scramble</h1>
      <p className={styles.category}>Category: {round.entry.category}</p>

      <div className={styles.scrambled}>{round.scrambled}</div>

      <div className={styles.hintRow}>
        <button type="button" className={styles.hintButton} onClick={() => setShowHint((v) => !v)}>
          {showHint ? 'Hide hint' : 'Show hint'}
        </button>
        {showHint && <p className={styles.hintText}>{round.entry.hint}</p>}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="Your guess"
          autoFocus
          disabled={status === 'correct'}
        />
        <button type="submit" className={styles.submit} disabled={status === 'correct'}>
          Check
        </button>
      </form>

      <div className={`${styles.feedback} ${status === 'correct' ? styles.correct : status === 'incorrect' ? styles.incorrect : ''}`}>
        {status === 'correct' && 'Correct!'}
        {status === 'incorrect' && 'Not quite — try again.'}
      </div>

      {status === 'correct' && (
        <button type="button" className={styles.nextButton} onClick={handleNext}>
          Next word →
        </button>
      )}

      <p className={styles.stats}>
        Solved: {summary.completedCount} · Streak: {summary.currentStreak}
      </p>
    </div>
  )
}

export default WordScramble
