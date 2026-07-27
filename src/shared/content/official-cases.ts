import type { CaseDraft } from '@/shared/models/case-draft'
import { compileCaseBlueprint } from '@/shared/services/CaseCompiler'
import type { CaseBlueprint } from '@/editor/services/AiCaseDesignerClient'

export interface OfficialCaseChapter {
  readonly id: string
  readonly chapter: 1 | 2 | 3 | 4 | 5 | 6
  readonly patientBeat: string
  readonly learningObjective: string
  readonly sources: readonly { readonly id: string; readonly title: string; readonly url: string }[]
  readonly draft: CaseDraft
  /** Classic level ID to use as the underlying game world */
  readonly classicLevelId: string
}

const SOURCE_LIBRARY = {
  oxygen: { id: 'who-oxygen', title: 'WHO：血氧与呼吸健康', url: 'https://www.who.int/health-topics/oxygen' },
  immunity: { id: 'nih-immunity', title: 'NIH：免疫系统概览', url: 'https://www.niaid.nih.gov/research/immune-system-overview' },
  inflammation: { id: 'nih-inflammation', title: 'NIH：炎症反应', url: 'https://www.niehs.nih.gov/health/topics/conditions/inflammation' },
} as const

function chapter(
  id: string,
  chapterNumber: OfficialCaseChapter['chapter'],
  patientBeat: string,
  learningObjective: string,
  blueprint: CaseBlueprint,
  sources: OfficialCaseChapter['sources'],
  classicLevelId: string,
): OfficialCaseChapter {
  const compiled = compileCaseBlueprint(blueprint, { seed: id, source: 'template' })
  if (!compiled.caseConfig) throw new Error('Official cases require caseConfig')
  const draft: CaseDraft = {
    ...compiled,
    id,
    metadata: { ...compiled.metadata, author: '《细胞远征》医学内容组' },
    caseConfig: {
      ...compiled.caseConfig,
      briefing: {
        start: patientBeat,
        success: '患者本阶段指标恢复稳定。',
        failure: '患者指标恶化，请重新评估运输与免疫职责。',
      },
      education: { topic: learningObjective, sourceIds: sources.map(source => source.id) },
    },
  }
  return { id, chapter: chapterNumber, patientBeat, learningObjective, sources, draft, classicLevelId }
}

export const OFFICIAL_CASES: readonly OfficialCaseChapter[] = [
  chapter('case-chapter-1-wound', 1,
    '患者运动时发生皮肤擦伤，局部组织首先需要稳定氧供。',
    '理解红细胞运输氧气如何支持创伤修复。',
    {
      title: '第一章：擦伤后的氧供', primaryCell: 'rbc', difficulty: 'assist', tags: ['创伤', '供氧'], icon: '🩹',
      description: '向受损组织持续输送氧气。', vitals: { oxygen: 82, infection: 8, tissue: 72 },
      oxygenDecayPerSecond: 0.8, infectionGrowthPerSecond: 0.3, tissueDecayPerSecond: 0.2,
      nodeCounts: { oxygenRoutes: 1, infectionSites: 0 }, allowedEvents: ['ACUTE_HYPOXIA'],
      educationalTopic: '创伤修复与氧供', stabilitySeconds: 4,
    },
    [SOURCE_LIBRARY.oxygen],
    '0', // Level 0: 血液循环
  ),
  chapter('case-chapter-2-invasion', 2,
    '擦伤处出现细菌入侵，患者局部红肿，白细胞开始防御。',
    '理解先天免疫如何识别并清除感染灶。',
    {
      title: '第二章：感染入侵', primaryCell: 'wbc', difficulty: 'standard', tags: ['感染', '先天免疫'], icon: '🦠',
      description: '清除两个感染灶并保护组织。', vitals: { oxygen: 76, infection: 34, tissue: 70 },
      oxygenDecayPerSecond: 0.7, infectionGrowthPerSecond: 0.5, tissueDecayPerSecond: 0.25,
      nodeCounts: { oxygenRoutes: 0, infectionSites: 2 }, allowedEvents: ['INFECTION_REBOUND', 'ATP_CRISIS'],
      educationalTopic: '白细胞与先天免疫', stabilitySeconds: 5,
    },
    [SOURCE_LIBRARY.immunity],
    '1', // Level 1: WBC
  ),
  chapter('case-chapter-3-hypoxia', 3,
    '炎症增加了耗氧，患者出现短暂气促，需要恢复肺泡到组织的运输。',
    '理解炎症期氧需求上升与红细胞职责。',
    {
      title: '第三章：炎症性缺氧', primaryCell: 'rbc', difficulty: 'standard', tags: ['缺氧', '循环'], icon: '🫁',
      description: '建立两条氧运输路径。', vitals: { oxygen: 64, infection: 22, tissue: 66 },
      oxygenDecayPerSecond: 0.9, infectionGrowthPerSecond: 0.35, tissueDecayPerSecond: 0.3,
      nodeCounts: { oxygenRoutes: 2, infectionSites: 0 }, allowedEvents: ['ACUTE_HYPOXIA', 'TRANSPORT_BLOCKAGE'],
      educationalTopic: '氧合与循环运输', stabilitySeconds: 5,
    },
    [SOURCE_LIBRARY.oxygen, SOURCE_LIBRARY.inflammation],
    '2', // Level 2: Alveoli
  ),
  chapter('case-chapter-4-rebound', 4,
    '感染一度反弹，患者发热，白细胞需要控制扩散而不是追求击杀分数。',
    '理解感染控制以患者指标稳定为结果。',
    {
      title: '第四章：感染反弹', primaryCell: 'wbc', difficulty: 'challenge', tags: ['发热', '感染控制'], icon: '🌡️',
      description: '清除三个感染灶并维持组织活性。', vitals: { oxygen: 72, infection: 42, tissue: 62 },
      oxygenDecayPerSecond: 0.75, infectionGrowthPerSecond: 0.55, tissueDecayPerSecond: 0.35,
      nodeCounts: { oxygenRoutes: 0, infectionSites: 3 }, allowedEvents: ['INFECTION_REBOUND', 'ATP_CRISIS'],
      educationalTopic: '感染反弹与炎症控制', stabilitySeconds: 6,
    },
    [SOURCE_LIBRARY.immunity, SOURCE_LIBRARY.inflammation],
    '3', // Level 3: Vessel
  ),
  chapter('case-chapter-5-cooperation', 5,
    '患者进入恢复期，运输与防御必须同时工作，任何单一职责都不足以稳定指标。',
    '理解红白细胞协作维持内环境稳定。',
    {
      title: '第五章：运输与防御协作', primaryCell: 'coop', difficulty: 'standard', tags: ['协作', '恢复'], icon: '🤝',
      description: '同时完成供氧与感染清除。', vitals: { oxygen: 75, infection: 28, tissue: 68 },
      oxygenDecayPerSecond: 0.65, infectionGrowthPerSecond: 0.4, tissueDecayPerSecond: 0.25,
      nodeCounts: { oxygenRoutes: 1, infectionSites: 1 }, allowedEvents: ['ACUTE_HYPOXIA', 'INFECTION_REBOUND', 'TRANSPORT_BLOCKAGE'],
      educationalTopic: '运输、防御与组织修复', stabilitySeconds: 6,
    },
    [SOURCE_LIBRARY.oxygen, SOURCE_LIBRARY.immunity],
    '4', // Level 4: Lymph
  ),
  chapter('case-chapter-6-recovery', 6,
    '患者完成康复，免疫记忆形成，最终报告回顾运输、防御与恢复的协作。',
    '综合解释氧运输、免疫防御和免疫记忆。',
    {
      title: '第六章：康复与免疫记忆', primaryCell: 'coop', difficulty: 'challenge', tags: ['康复', '免疫记忆'], icon: '🧬',
      description: '完成综合病例并稳定全部患者指标。', vitals: { oxygen: 70, infection: 30, tissue: 65 },
      oxygenDecayPerSecond: 0.7, infectionGrowthPerSecond: 0.4, tissueDecayPerSecond: 0.3,
      nodeCounts: { oxygenRoutes: 2, infectionSites: 2 }, allowedEvents: ['ACUTE_HYPOXIA', 'INFECTION_REBOUND', 'TRANSPORT_BLOCKAGE', 'ATP_CRISIS'],
      educationalTopic: '适应性免疫与免疫记忆', stabilitySeconds: 7,
    },
    [SOURCE_LIBRARY.oxygen, SOURCE_LIBRARY.immunity, SOURCE_LIBRARY.inflammation],
    '5', // Level 5: Boss
  ),
]
