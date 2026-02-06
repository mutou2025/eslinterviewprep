import Dexie, { type Table } from 'dexie'
import type { Card } from '@/types'

export type CardSummary = Pick<Card, 'id' | 'source' | 'upstreamSource' | 'categoryL1Id' | 'categoryL2Id' | 'categoryL3Id' | 'title' | 'question' | 'questionType' | 'difficulty' | 'frequency' | 'customTags' | 'originUpstreamId' | 'createdAt' | 'updatedAt'> & {
    updatedAtRaw?: string | null
}

type CacheMeta = { key: string; value: string }

class CardCacheDB extends Dexie {
    cards!: Table<CardSummary>
    meta!: Table<CacheMeta>

    constructor() {
        super('interview-flashcards-cache')
        this.version(1).stores({
            cards: 'id, categoryL3Id, updatedAt',
            meta: 'key'
        })
    }
}

const cacheDb = new CardCacheDB()

export async function getCacheMeta(key: string): Promise<string | null> {
    const row = await cacheDb.meta.get(key)
    return row?.value ?? null
}

export async function setCacheMeta(key: string, value: string): Promise<void> {
    await cacheDb.meta.put({ key, value })
}

export async function upsertCardSummaries(rows: CardSummary[]): Promise<void> {
    await cacheDb.cards.bulkPut(rows)
}

export async function getCachedCardSummariesByCategory(categoryL3Id?: string): Promise<CardSummary[]> {
    if (categoryL3Id) {
        return cacheDb.cards.where('categoryL3Id').equals(categoryL3Id).toArray()
    }
    return cacheDb.cards.toArray()
}

export async function getCachedCardSummariesPage(options: {
    page: number
    pageSize: number
    search?: string
    categoryL3Id?: string
}): Promise<{ cards: CardSummary[]; total: number }> {
    const { page, pageSize, search, categoryL3Id } = options
    const from = (page - 1) * pageSize
    const to = from + pageSize

    let cards = await getCachedCardSummariesByCategory(categoryL3Id)

    if (search && search.trim()) {
        const q = search.trim().toLowerCase()
        cards = cards.filter(card =>
            card.title.toLowerCase().includes(q) ||
            card.question.toLowerCase().includes(q)
        )
    }

    cards.sort((a, b) => a.id.localeCompare(b.id))
    const total = cards.length
    const paged = cards.slice(from, to)

    return { cards: paged, total }
}
