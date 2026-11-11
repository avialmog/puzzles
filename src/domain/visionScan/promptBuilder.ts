import type { PuzzleType } from './types'

export interface ToolSpec {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export interface VisionPrompt {
  text: string
  tool: ToolSpec
}

const PROMPTS: Record<PuzzleType, VisionPrompt> = {
  sudoku: {
    text: [
      'This photo shows a Sudoku grid, 9 rows by 9 columns.',
      'Read every cell and report a 9x9 grid of digits: use 0 for an empty cell and 1-9 for a given digit.',
      'If a digit is hard to read, use the Sudoku constraint (each digit 1-9 appears at most once per row, column, and 3x3 box) to help disambiguate visually similar digits.',
    ].join(' '),
    tool: {
      name: 'submit_sudoku_reading',
      description: 'Submit the read Sudoku grid.',
      input_schema: {
        type: 'object',
        properties: {
          grid: {
            type: 'array',
            items: { type: 'string' },
            description: "Exactly 9 strings, each exactly 9 characters, digits '0'-'9' ('0' = empty).",
          },
        },
        required: ['grid'],
      },
    },
  },
  wordSearch: {
    text: [
      'This photo shows a word search puzzle: a square grid of letters, N rows by N columns.',
      'Determine N from the image (most word search grids are 10-20 cells per side), then read every cell.',
      'Return the complete letter grid, uppercase A-Z only, row by row.',
    ].join(' '),
    tool: {
      name: 'submit_word_search_reading',
      description: 'Submit the read word search letter grid.',
      input_schema: {
        type: 'object',
        properties: {
          grid: {
            type: 'array',
            items: { type: 'string' },
            description: 'N strings, each exactly N uppercase letters A-Z.',
          },
        },
        required: ['grid'],
      },
    },
  },
  crosswordGrid: {
    text: [
      'This photo shows a crossword puzzle grid.',
      'Determine the number of rows and columns, then identify which cells are black/blocked and which are white (to be filled with a letter).',
      "Return the pattern as rows of characters using '#' for a black cell and '.' for a white cell.",
    ].join(' '),
    tool: {
      name: 'submit_crossword_grid_reading',
      description: 'Submit the read crossword black/white cell pattern.',
      input_schema: {
        type: 'object',
        properties: {
          rows: { type: 'integer' },
          cols: { type: 'integer' },
          pattern: {
            type: 'array',
            items: { type: 'string' },
            description: "`rows` strings, each exactly `cols` characters, using '#' for black and '.' for white.",
          },
        },
        required: ['rows', 'cols', 'pattern'],
      },
    },
  },
  crosswordClues: {
    text: [
      'This photo shows a printed list of crossword clues, organized under ACROSS and DOWN headings, each clue prefixed by its number.',
      'Transcribe every clue exactly as printed, grouped by direction.',
    ].join(' '),
    tool: {
      name: 'submit_crossword_clues_reading',
      description: 'Submit the transcribed across/down clue lists.',
      input_schema: {
        type: 'object',
        properties: {
          across: {
            type: 'array',
            items: {
              type: 'object',
              properties: { number: { type: 'integer' }, text: { type: 'string' } },
              required: ['number', 'text'],
            },
          },
          down: {
            type: 'array',
            items: {
              type: 'object',
              properties: { number: { type: 'integer' }, text: { type: 'string' } },
              required: ['number', 'text'],
            },
          },
        },
        required: ['across', 'down'],
      },
    },
  },
  arrowCrossword: {
    text: [
      'This photo shows a Scandinavian-style (arrow) crossword: a square grid where some cells contain printed clue text with a small arrow,',
      'and other cells are blank (to be filled with a letter as part of an answer). An arrow pointing right means the answer starts in the',
      "next cell and reads across; an arrow pointing down means the answer starts in the cell below and reads down. A cell can have two",
      'clues (and two arrows) if it serves both an across and a down answer.',
      'Determine the grid size, then for every cell report its row and column, whether it is a clue cell, and if so, its printed text',
      "and your best guess at the arrow direction ('across', 'down', or 'both'). If you are not confident about the direction for a given",
      'clue cell, omit the direction field for that cell rather than guessing - a person will review and fill it in.',
    ].join(' '),
    tool: {
      name: 'submit_arrow_crossword_reading',
      description: 'Submit the read arrow-crossword grid.',
      input_schema: {
        type: 'object',
        properties: {
          rows: { type: 'integer' },
          cols: { type: 'integer' },
          cells: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                row: { type: 'integer' },
                col: { type: 'integer' },
                isClueCell: { type: 'boolean' },
                text: { type: 'string' },
                direction: { type: 'string', enum: ['across', 'down', 'both'] },
              },
              required: ['row', 'col', 'isClueCell'],
            },
          },
        },
        required: ['rows', 'cols', 'cells'],
      },
    },
  },
  codeword: {
    text: [
      'This photo shows a codeword (cipher) crossword: a crossword-shaped grid where black cells are blocked, and every other cell shows a',
      'printed NUMBER (not a letter) - the same number always represents the same letter everywhere in the grid. Some puzzles also give a',
      'few starter letters directly, as an actual letter shown in a cell instead of a number, or listed in a legend near the grid.',
      'Determine the grid size, read the black/white pattern, read every non-black cell\'s printed number, and report any given starter',
      'letters you can find as a number-to-letter mapping.',
    ].join(' '),
    tool: {
      name: 'submit_codeword_reading',
      description: 'Submit the read codeword grid.',
      input_schema: {
        type: 'object',
        properties: {
          rows: { type: 'integer' },
          cols: { type: 'integer' },
          pattern: {
            type: 'array',
            items: { type: 'string' },
            description: "`rows` strings, each exactly `cols` characters, using '#' for black and '.' for white.",
          },
          numbers: {
            type: 'array',
            items: { type: 'array', items: { type: 'integer' } },
            description: '`rows` arrays of `cols` integers - the printed number in each cell (0 for black cells, ignored).',
          },
          knownLetters: {
            type: 'object',
            description: 'Any given starter number-to-letter mappings, e.g. {"5": "T"}. Empty object if none are visible.',
          },
        },
        required: ['rows', 'cols', 'pattern', 'numbers', 'knownLetters'],
      },
    },
  },
}

export function buildVisionPrompt(puzzleType: PuzzleType): VisionPrompt {
  return PROMPTS[puzzleType]
}
