// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { clearProgress, getSummary, recordResult } from './progressStore'

describe('progressStore', () => {
  beforeEach(() => {
    clearProgress('wordScramble')
  })

  it('returns an empty summary when nothing recorded', () => {
    expect(getSummary('wordScramble')).toEqual({ completedCount: 0, bestTimeMs: null, currentStreak: 0 })
  })

  it('tracks completed count and best time', () => {
    recordResult('wordScramble', { completed: true, elapsedMs: 5000 }, 1)
    recordResult('wordScramble', { completed: true, elapsedMs: 2000 }, 2)
    const summary = getSummary('wordScramble')
    expect(summary.completedCount).toBe(2)
    expect(summary.bestTimeMs).toBe(2000)
    expect(summary.currentStreak).toBe(2)
  })

  it('resets streak after a non-completed entry', () => {
    recordResult('wordScramble', { completed: true, elapsedMs: 1000 }, 1)
    recordResult('wordScramble', { completed: false }, 2)
    recordResult('wordScramble', { completed: true, elapsedMs: 1000 }, 3)
    expect(getSummary('wordScramble').currentStreak).toBe(1)
  })

  it('keeps progress isolated per mode', () => {
    recordResult('wordScramble', { completed: true, elapsedMs: 1000 }, 1)
    expect(getSummary('sudoku').completedCount).toBe(0)
  })
})
