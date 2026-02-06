// ========== 枚举类型 ==========

// 数据来源
export type CardSource = 'upstream' | 'user'

// 上游仓库来源
export type UpstreamSource = 'febobo' | 'sudheerj'

// 题型标签
export type QuestionType = 'concept' | 'coding' | 'output' | 'debug' | 'scenario' | 'design'

// 难度标签
export type DifficultyTag = 'easy' | 'must-know' | 'hard' | 'hand-write'

// 面试频率
export type FrequencyTag = 'high' | 'mid' | 'low'

// 用户掌握度（核心 4 级）
export type MasteryStatus = 'new' | 'fuzzy' | 'can-explain' | 'solid'

// ========== 分类 ==========

export interface Category {
  id: string
  level: 1 | 2 | 3
  name: string
  nameEn?: string
  parentId?: string
  icon?: string
}

// 预设 L1 模块
export const MODULE_CATEGORIES = {
  technical: { id: 'technical', name: '技术面试', nameEn: 'Technical Interview' },
  behavioral: { id: 'behavioral', name: '行为面试', nameEn: 'Behavioral Interview' },
} as const

// 预设 L2 技术分类
export const TECH_CATEGORIES = {
  'web-frontend': { id: 'web-frontend', name: 'Web前端', nameEn: 'Web Frontend', parentId: 'technical' },
  'algorithm': { id: 'algorithm', name: '算法', nameEn: 'Algorithm', parentId: 'technical' },
  'devops': { id: 'devops', name: '运维', nameEn: 'DevOps', parentId: 'technical' },
} as const

// 预设 L3 领域（Web前端）
export const WEB_FRONTEND_DOMAINS = [
  'html', 'css', 'javascript', 'typescript', 'react', 'vue',
  'browser', 'network', 'performance', 'security', 'testing', 'tooling', 'system-design',
  'es6', 'nodejs', 'webpack', 'http', 'design-pattern', 'linux', 'git', 'applet'
] as const

export type WebFrontendDomain = typeof WEB_FRONTEND_DOMAINS[number]

// ========== 测试用例 ==========

export interface TestCase {
  input: unknown[]
  expected: unknown
  description?: string
}

// ========== 卡片 ==========

export interface Card {
  id: string
  source: CardSource
  upstreamSource?: UpstreamSource

  // 三级分类
  categoryL1Id: string
  categoryL2Id: string
  categoryL3Id: string

  // 内容
  title: string
  question: string
  answer?: string

  // 标签系统
  questionType: QuestionType
  difficulty: DifficultyTag
  frequency: FrequencyTag
  customTags: string[]

  // 代码题专属
  codeTemplate?: string
  testCases?: TestCase[]
  entryFunctionName?: string
  supportedLanguages?: ('javascript' | 'typescript')[]

  // 用户掌握度 & 间隔复习
  mastery: MasteryStatus
  reviewCount: number
  intervalDays: number
  dueAt: Date
  lastReviewedAt?: Date

  // 代码题记录
  lastSubmissionCode?: string
  passRate?: number

  // 元数据
  originUpstreamId?: string
  createdAt: Date
  updatedAt: Date
}

// ========== Override ==========

export interface CardOverride {
  cardId: string
  patch: Partial<Card>
  updatedAt: Date
}

// ========== 列表 ==========

export interface CardList {
  id: string
  name: string
  cardIds: string[]
  isDefault?: boolean
  createdAt: Date
  updatedAt: Date
}

// ========== 复习会话 ==========

export interface ReviewFilters {
  onlyDue: boolean
  masteryFilter: MasteryStatus[]
  questionTypeFilter: QuestionType[]
  shuffle: boolean
}

export interface ReviewSession {
  id: string
  scope: string // 'all' | 'category:{id}' | 'list:{id}'
  mode: 'qa' | 'code' | 'mix'
  queueCardIds: string[]
  cursor: number
  filters: ReviewFilters
  updatedAt: Date
}

// ========== 复习日志 ==========

export interface ReviewLog {
  id: string
  reviewedAt: Date
  cardId: string
  categoryL2Id: string
  categoryL3Id: string
  previousMastery: MasteryStatus
  newMastery: MasteryStatus
  didRevealAnswer: boolean
  timeSpentMs: number
}

// ========== 统计相关 ==========

export interface DailyStats {
  date: string // YYYY-MM-DD
  reviewCount: number
  newCount: number
  timeSpentMs: number
  masteryChanges: {
    toSolid: number
    toCanExplain: number
    toFuzzy: number
    toNew: number
  }
}

export interface DomainStats {
  domainId: string
  domainName: string
  total: number
  solid: number
  canExplain: number
  fuzzy: number
  new: number
  masteryRate: number
}

// ========== Labour 面试 ==========

export interface LabourCompany {
  id: string
  name: string
  logoUrl?: string
  createdAt: Date
  questionCount?: number
}

export interface LabourQuestion {
  id: string
  companyId: string
  question: string
  answer?: string
  tags: string[]
  submittedBy?: string
  createdAt: Date
  updatedAt: Date
}

