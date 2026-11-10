export type PuzzleMode = 'sudoku' | 'wordSearch' | 'wordScramble'

export interface ProgressEntry {
  timestamp: number
  completed: boolean
  elapsedMs?: number
  details?: string
}

export interface ProgressSummary {
  completedCount: number
  bestTimeMs: number | null
  currentStreak: number
}

const MAX_ENTRIES = 200

function storageKey(mode: PuzzleMode): string {
  return `puzzles.progress.${mode}`
}

function readEntries(mode: PuzzleMode): ProgressEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(mode))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function recordResult(mode: PuzzleMode, entry: Omit<ProgressEntry, 'timestamp'>, now = Date.now()): ProgressEntry[] {
  const entries = readEntries(mode)
  entries.push({ ...entry, timestamp: now })
  const trimmed = entries.slice(-MAX_ENTRIES)
  localStorage.setItem(storageKey(mode), JSON.stringify(trimmed))
  return trimmed
}

export function getSummary(mode: PuzzleMode): ProgressSummary {
  const entries = readEntries(mode)
  const completed = entries.filter((e) => e.completed)
  const times = completed.map((e) => e.elapsedMs).filter((t): t is number => typeof t === 'number')
  let currentStreak = 0
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].completed) currentStreak++
    else break
  }
  return {
    completedCount: completed.length,
    bestTimeMs: times.length === 0 ? null : Math.min(...times),
    currentStreak,
  }
}

export function clearProgress(mode: PuzzleMode): void {
  localStorage.removeItem(storageKey(mode))
}
