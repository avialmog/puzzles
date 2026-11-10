import type { SolveCipherRequest, SolveCluesRequest, SolveCrosswordClue } from './types'

function buildDiagram(request: SolveCluesRequest): string {
  const grid: string[][] = request.black.map((row) => row.map((isBlack) => (isBlack ? '#' : '.')))

  // Mark each clue's answer-start cell with its number, so the model can line up
  // clue numbers with grid positions instead of inferring them from list order alone.
  for (const clue of [...request.across, ...request.down]) {
    grid[clue.row][clue.col] = String(clue.number)
  }

  return grid.map((row) => row.join(' ')).join('\n')
}

function formatClueList(clues: SolveCrosswordClue[]): string {
  return clues.map((c) => `${c.number}. ${c.clue} (${c.length})`).join('\n')
}

export function buildCrosswordPrompt(request: SolveCluesRequest): string {
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

function buildCipherDiagram(request: SolveCipherRequest): string {
  const grid: string[][] = request.black.map((row, r) =>
    row.map((isBlack, c) => (isBlack ? '#' : String(request.numbers[r][c]))),
  )
  return grid.map((row) => row.join(' ')).join('\n')
}

export function buildCipherPrompt(request: SolveCipherRequest): string {
  const knownEntries = Object.entries(request.knownLetters)
  const knownText =
    knownEntries.length > 0
      ? knownEntries.map(([num, letter]) => `${num} = ${letter.toUpperCase()}`).join(', ')
      : '(none given)'

  return [
    `Here is a codeword (cipher) crossword grid, ${request.rows} rows by ${request.cols} columns. '#' marks a black/blocked cell. Every other cell shows a number from 1-26.`,
    '',
    buildCipherDiagram(request),
    '',
    'The same number always represents the same letter everywhere in the grid, and different numbers represent different letters (a 1-to-1 substitution cipher over the alphabet). There are no separate clues - every horizontal and vertical run of 2+ non-black cells must form a valid English word once the numbers are replaced by their letters.',
    '',
    `Known number-to-letter mappings: ${knownText}`,
    '',
    'Solve for the complete number-to-letter mapping and return the fully solved grid using the actual uppercase letters (not numbers).',
  ].join('\n')
}
