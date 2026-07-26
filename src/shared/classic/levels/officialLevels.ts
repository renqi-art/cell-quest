import { LEVEL_0_BLOOD } from './level0-blood'
import { LEVEL_1_WBC } from './level1-wbc'
import { LEVEL_2_ALVEOLI } from './level2-alveoli'
import { LEVEL_3_VESSEL } from './level3-vessel'
import { LEVEL_4_LYMPH } from './level4-lymph'
import { LEVEL_5_BOSS } from './level5-boss'
import type { ClassicLevelDefinition } from '../types'

export const OFFICIAL_CLASSIC_LEVELS = Object.freeze([
  LEVEL_0_BLOOD,
  LEVEL_1_WBC,
  LEVEL_2_ALVEOLI,
  LEVEL_3_VESSEL,
  LEVEL_4_LYMPH,
  LEVEL_5_BOSS,
] satisfies readonly ClassicLevelDefinition[])
