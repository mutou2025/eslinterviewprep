import type { ContentLanguage } from './types'

export interface CardContentTranslation {
    title?: string
    question?: string
    answer?: string
}

export type CardContentOverrides = Record<
    string,
    Partial<Record<ContentLanguage, CardContentTranslation>>
>

// 题目内容国际化映射（按卡片 id 覆盖）
// 可按需继续补充，例如：
// 'card-id-123': {
//   'en-US': { title: '...', question: '...', answer: '...' },
//   'zh-CN': { title: '...', question: '...', answer: '...' }
// }
export const cardContentOverrides: CardContentOverrides = {}
