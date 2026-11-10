export interface WordCategory {
  name: string
  words: string[]
}

export const CATEGORIES: WordCategory[] = [
  {
    name: 'Animals',
    words: ['TIGER', 'ZEBRA', 'EAGLE', 'SHARK', 'KOALA', 'OTTER', 'FALCON', 'LIZARD', 'RABBIT', 'PANTHER'],
  },
  {
    name: 'Space',
    words: ['COMET', 'ORBIT', 'MOON', 'MARS', 'STAR', 'NEBULA', 'ROCKET', 'SATURN', 'GALAXY', 'METEOR'],
  },
  {
    name: 'Kitchen',
    words: ['SPOON', 'KNIFE', 'OVEN', 'PLATE', 'WHISK', 'KETTLE', 'BLENDER', 'SKILLET', 'LADLE', 'TOASTER'],
  },
]
