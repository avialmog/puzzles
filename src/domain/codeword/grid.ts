/** Every distinct number that appears in a non-black cell, sorted ascending. */
export function distinctNumbers(numbers: number[][], black: boolean[][]): number[] {
  const seen = new Set<number>()
  for (let r = 0; r < numbers.length; r++) {
    for (let c = 0; c < numbers[r].length; c++) {
      if (!black[r]?.[c]) seen.add(numbers[r][c])
    }
  }
  return [...seen].sort((a, b) => a - b)
}
