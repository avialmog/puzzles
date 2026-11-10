import { describe, expect, it } from 'vitest'
import { pickRandomEntry, scrambleWord } from './shuffle'
import { WORD_LIST } from './wordList'

describe('scrambleWord', () => {
  it('never returns the original word', () => {
    for (const entry of WORD_LIST) {
      for (let i = 0; i < 20; i++) {
        expect(scrambleWord(entry.word)).not.toBe(entry.word)
      }
    }
  })

  it('contains exactly the same letters as the original', () => {
    for (const entry of WORD_LIST) {
      const scrambled = scrambleWord(entry.word)
      expect(scrambled.split('').sort().join('')).toBe(entry.word.split('').sort().join(''))
    }
  })

  it('moves at least two letter positions when the word allows it', () => {
    const word = 'PLANET'
    for (let i = 0; i < 20; i++) {
      const scrambled = scrambleWord(word)
      let moved = 0
      for (let i2 = 0; i2 < word.length; i2++) {
        if (word[i2] !== scrambled[i2]) moved++
      }
      expect(moved).toBeGreaterThanOrEqual(2)
    }
  })

  it('terminates for a word with two letters', () => {
    expect(() => scrambleWord('OX')).not.toThrow()
  })
})

describe('pickRandomEntry', () => {
  it('returns an entry from the word list', () => {
    const entry = pickRandomEntry()
    expect(WORD_LIST).toContainEqual(entry)
  })

  it('excludes the given word when possible', () => {
    for (let i = 0; i < 20; i++) {
      const entry = pickRandomEntry('PLANET')
      expect(entry.word).not.toBe('PLANET')
    }
  })
})
