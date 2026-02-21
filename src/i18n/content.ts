import type { Card, Category } from '@/types'
import { cardContentOverrides } from './content-overrides'
import type { ContentLanguage } from './types'

export interface LocalizedCardContent {
    title: string
    question: string
    answer?: string
}

function pickByLanguage(
    language: ContentLanguage,
    zhText?: string,
    enText?: string
): string | undefined {
    if (language === 'zh-CN') {
        return zhText || enText
    }
    return enText || zhText
}

export function getLocalizedCardContent(
    card: Pick<Card, 'id' | 'title' | 'question' | 'answer' | 'titleZh' | 'titleEn' | 'questionZh' | 'questionEn' | 'answerZh' | 'answerEn'>,
    language: ContentLanguage
): LocalizedCardContent {
    const override = cardContentOverrides[card.id]?.[language]

    const title = override?.title
        || pickByLanguage(language, card.titleZh, card.titleEn)
        || card.title

    const question = override?.question
        || pickByLanguage(language, card.questionZh, card.questionEn)
        || card.question

    const answer = override?.answer
        || pickByLanguage(language, card.answerZh, card.answerEn)
        || card.answer

    return { title, question, answer }
}

export function getLocalizedCategoryName(category: Pick<Category, 'name' | 'nameEn'>, language: ContentLanguage): string {
    if (language === 'en-US') {
        return category.nameEn || category.name
    }
    return category.name
}
