import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pickRandomEntry, scrambleWord } from '../../domain/wordScramble/shuffle'
import type { WordEntry } from '../../domain/wordScramble/types'
import { getSummary, recordResult } from '../../shared/progress/progressStore'
import BackLink from '../../shared/nav/BackLink'
import styles from './WordScramble.module.css'

function newRound(excludeWord?: string): { entry: WordEntry; scrambled: string } {
  const entry = pickRandomEntry(excludeWord)
  return { entry, scrambled: scrambleWord(entry.word) }
}

function WordScramble() {
  const { t, i18n } = useTranslation()
  const [round, setRound] = useState(() => newRound())
  const [guess, setGuess] = useState('')
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect' | 'revealed'>('idle')
  const [showHint, setShowHint] = useState(false)
  const [startedAt] = useState(() => performance.now())
  const [summary, setSummary] = useState(() => getSummary('wordScramble'))
  const locked = status === 'correct' || status === 'revealed'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (locked) return

    if (guess.trim().toUpperCase() === round.entry.word) {
      const elapsedMs = Math.round(performance.now() - startedAt)
      recordResult('wordScramble', { completed: true, elapsedMs, details: round.entry.word })
      setStatus('correct')
      setSummary(getSummary('wordScramble'))
    } else {
      setStatus('incorrect')
    }
  }

  function handleSolve() {
    setGuess(round.entry.word)
    setStatus('revealed')
  }

  function handleNext() {
    setRound(newRound(round.entry.word))
    setGuess('')
    setStatus('idle')
    setShowHint(false)
  }

  const nextArrow = i18n.dir() === 'rtl' ? '←' : '→'

  return (
    <div className={styles.page}>
      <BackLink to="/" label={t('common.home')} />
      <h1>{t('wordScramble.title')}</h1>
      <p className={styles.category}>{t('wordScramble.category', { category: round.entry.category })}</p>

      <div className={styles.scrambled}>{round.scrambled}</div>

      <div className={styles.hintRow}>
        <button type="button" className={styles.hintButton} onClick={() => setShowHint((v) => !v)}>
          {showHint ? t('wordScramble.hideHint') : t('wordScramble.showHint')}
        </button>
        {showHint && <p className={styles.hintText}>{round.entry.hint}</p>}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder={t('wordScramble.guessPlaceholder')}
          autoFocus
          disabled={locked}
        />
        <button type="submit" className={styles.submit} disabled={locked}>
          {t('common.check')}
        </button>
      </form>

      <div className={`${styles.feedback} ${status === 'correct' ? styles.correct : status === 'incorrect' ? styles.incorrect : ''}`}>
        {status === 'correct' && t('wordScramble.feedback.correct')}
        {status === 'incorrect' && t('wordScramble.feedback.incorrect')}
        {status === 'revealed' && t('wordScramble.feedback.revealed', { word: round.entry.word })}
      </div>

      {!locked && (
        <button type="button" className={styles.hintButton} onClick={handleSolve}>
          {t('common.solve')}
        </button>
      )}

      {locked && (
        <button type="button" className={styles.nextButton} onClick={handleNext}>
          {t('wordScramble.nextWord')} {nextArrow}
        </button>
      )}

      <p className={styles.stats}>{t('common.solvedStreak', { solved: summary.completedCount, streak: summary.currentStreak })}</p>
    </div>
  )
}

export default WordScramble
