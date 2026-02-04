import Dexie, { type Table } from 'dexie'
import type { Card, CardOverride, Category, CardList, ReviewSession, ReviewLog } from '@/types'

export class FlashcardDB extends Dexie {
    cards!: Table<Card>
    overrides!: Table<CardOverride>
    categories!: Table<Category>
    lists!: Table<CardList>
    sessions!: Table<ReviewSession>
    logs!: Table<ReviewLog>

    constructor() {
        super('interview-flashcards')

        this.version(1).stores({
            cards: 'id, source, upstreamSource, categoryL1Id, categoryL2Id, categoryL3Id, mastery, dueAt, questionType, difficulty, frequency',
            overrides: 'cardId',
            categories: 'id, level, parentId',
            lists: 'id, isDefault',
            sessions: 'id, scope',
            logs: 'id, reviewedAt, cardId, categoryL2Id, categoryL3Id'
        })
    }
}

export const db = new FlashcardDB()

// ========== 初始化默认数据 ==========

export async function initializeDefaultData() {
    // 检查是否已有默认列表
    try {
        const defaultList = await db.lists.get('favorites')
        if (!defaultList) {
            await db.lists.put({
                id: 'favorites',
                name: '⭐ 最喜欢的',
                cardIds: [],
                isDefault: true,
                createdAt: new Date(),
                updatedAt: new Date()
            })
        }
    } catch (e) {
        console.warn('Failed to initialize default list:', e)
    }

    // 初始化分类（使用 bulkPut 避免重复插入错误）
    try {
        const categories: Category[] = [
            // L1
            { id: 'technical', level: 1, name: '技术面试', nameEn: 'Technical Interview' },
            { id: 'behavioral', level: 1, name: '行为面试', nameEn: 'Behavioral Interview' },
            // L2
            { id: 'web-frontend', level: 2, name: 'Web前端', nameEn: 'Web Frontend', parentId: 'technical' },
            { id: 'algorithm', level: 2, name: '算法', nameEn: 'Algorithm', parentId: 'technical' },
            // L3 - Web Frontend
            { id: 'javascript', level: 3, name: 'JavaScript', parentId: 'web-frontend' },
            { id: 'typescript', level: 3, name: 'TypeScript', parentId: 'web-frontend' },
            { id: 'react', level: 3, name: 'React', parentId: 'web-frontend' },
            { id: 'vue', level: 3, name: 'Vue', parentId: 'web-frontend' },
            { id: 'css', level: 3, name: 'CSS', parentId: 'web-frontend' },
            { id: 'html', level: 3, name: 'HTML', parentId: 'web-frontend' },
            { id: 'browser', level: 3, name: 'Browser', parentId: 'web-frontend' },
            { id: 'network', level: 3, name: 'Network', parentId: 'web-frontend' },
            { id: 'http', level: 3, name: 'HTTP', parentId: 'web-frontend' },
            { id: 'performance', level: 3, name: 'Performance', parentId: 'web-frontend' },
            { id: 'security', level: 3, name: 'Security', parentId: 'web-frontend' },
            { id: 'tooling', level: 3, name: 'Tooling', parentId: 'web-frontend' },
            { id: 'webpack', level: 3, name: 'Webpack', parentId: 'web-frontend' },
            { id: 'nodejs', level: 3, name: 'NodeJS', parentId: 'web-frontend' },
            { id: 'es6', level: 3, name: 'ES6', parentId: 'web-frontend' },
            { id: 'design-pattern', level: 3, name: '设计模式', nameEn: 'Design Pattern', parentId: 'web-frontend' },
            { id: 'git', level: 3, name: 'Git', parentId: 'web-frontend' },
            { id: 'linux', level: 3, name: 'Linux', parentId: 'web-frontend' },
        ]
        await db.categories.bulkPut(categories)
    } catch (e) {
        console.warn('Failed to initialize categories:', e)
    }
}

// ========== 卡片操作 ==========

export async function getCardWithOverride(cardId: string): Promise<Card | undefined> {
    const card = await db.cards.get(cardId)
    if (!card) return undefined

    const override = await db.overrides.get(cardId)
    if (!override) return card

    return { ...card, ...override.patch }
}

export async function getAllCardsWithOverrides(): Promise<Card[]> {
    const cards = await db.cards.toArray()
    const overrides = await db.overrides.toArray()
    const overrideMap = new Map(overrides.map(o => [o.cardId, o.patch]))

    return cards.map(card => {
        const patch = overrideMap.get(card.id)
        return patch ? { ...card, ...patch } : card
    })
}

export async function getDueCards(now: Date = new Date()): Promise<Card[]> {
    const allCards = await getAllCardsWithOverrides()
    return allCards.filter(card =>
        card.dueAt <= now && card.mastery !== 'solid'
    )
}

export async function getCardsByCategory(categoryL3Id: string): Promise<Card[]> {
    const allCards = await getAllCardsWithOverrides()
    return allCards.filter(card => card.categoryL3Id === categoryL3Id)
}

export async function getCardsByList(listId: string): Promise<Card[]> {
    const list = await db.lists.get(listId)
    if (!list) return []

    const allCards = await getAllCardsWithOverrides()
    const cardMap = new Map(allCards.map(c => [c.id, c]))

    return list.cardIds
        .map(id => cardMap.get(id))
        .filter((c): c is Card => c !== undefined)
}

export async function updateCardMastery(
    cardId: string,
    newMastery: Card['mastery'],
    scheduleUpdate: Partial<Card>
): Promise<void> {
    const card = await db.cards.get(cardId)
    if (!card) return

    if (card.source === 'upstream') {
        // 对于上游卡片，使用 override
        const existingOverride = await db.overrides.get(cardId)
        const newPatch = {
            ...(existingOverride?.patch || {}),
            mastery: newMastery,
            ...scheduleUpdate,
            updatedAt: new Date()
        }
        await db.overrides.put({
            cardId,
            patch: newPatch,
            updatedAt: new Date()
        })
    } else {
        // 用户卡片直接更新
        await db.cards.update(cardId, {
            mastery: newMastery,
            ...scheduleUpdate,
            updatedAt: new Date()
        })
    }
}

// ========== 统计查询 ==========

export async function getMasteryStats(): Promise<Record<Card['mastery'], number>> {
    const cards = await getAllCardsWithOverrides()
    const stats = { new: 0, fuzzy: 0, 'can-explain': 0, solid: 0 }
    cards.forEach(card => {
        stats[card.mastery]++
    })
    return stats
}

export async function getDomainStats(): Promise<Map<string, { total: number; solid: number }>> {
    const cards = await getAllCardsWithOverrides()
    const stats = new Map<string, { total: number; solid: number }>()

    cards.forEach(card => {
        const existing = stats.get(card.categoryL3Id) || { total: 0, solid: 0 }
        existing.total++
        if (card.mastery === 'solid') existing.solid++
        stats.set(card.categoryL3Id, existing)
    })

    return stats
}
