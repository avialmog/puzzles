export interface WordEntry {
  word: string
  hint: string
  category: string
}

export interface ScrambleRound {
  entry: WordEntry
  scrambled: string
}
