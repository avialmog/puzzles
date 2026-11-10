import { deriveSlots } from './numbering'
import type { SolveCrosswordRequest } from './types'

function buildDiagram(request: SolveCrosswordRequest): string {
  const grid: string[][] = request.black.map((row) => row.map((isBlack) => (isBlack ? '#' : '.')))

  // Mark each slot's starting cell with its clue number, so the model can line up
  // clue numbers with grid positions instead of inferring them from list order alone.
  const slots = deriveSlots({ rows: request.rows, cols: request.cols, black: request.black })
  for (const slot of slots) {
    grid[slot.row][slot.col] = String(slot.number)
  }

  return grid.map((row) => row.join(' ')).join('\n')
}

function formatClueList(clues: SolveCrosswordRequest['across']): string {
  return clues.map((c) => `${c.number}. ${c.clue} (${c.length})`).join('\n')
}

export function buildCrosswordPrompt(request: SolveCrosswordRequest): string {
  return [
    `Here is a crossword grid, ${request.rows} rows by ${request.cols} columns. '#' marks a black/blocked cell; '.' marks a cell to be filled with a letter.`,
    '',
    buildDiagram(request),
    '',
    'ACROSS clues (clue number, text, and answer length in parentheses):',
    formatClueList(request.across),
    '',
    'DOWN clues:',
    formatClueList(request.down),
    '',
    'Solve the crossword. Every across and down answer must be consistent with the letters it shares with crossing entries. Answers are uppercase letters only, no punctuation or spaces.',
  ].join('\n')
}
