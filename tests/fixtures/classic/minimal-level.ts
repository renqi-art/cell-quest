import type { ClassicLevelDefinition } from '@/shared/classic/types'

export const MINIMAL_CLASSIC_LEVEL = {
  id: 'fixture-minimal',
  name: '最小经典关卡',
  width: 5,
  cellType: 1,
  winCondition: 'reach-finish',
  sky: ['#07101f', '#16213e'],
  map: [
    '     ',
    'P g F',
    '#####',
  ],
  floatPlatforms: [],
  pipeSpawners: [],
  tutorials: [],
  knowledgeCards: [],
} as const satisfies ClassicLevelDefinition
