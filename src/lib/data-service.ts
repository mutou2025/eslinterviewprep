import type { Card, CardList, Category, MasteryStatus, UpstreamSource } from '@/types'
import { getSupabaseClient } from './supabase-client'
import {
    getCacheMeta,
    setCacheMeta,
    upsertCardSummaries,
    getCachedCardSummariesByCategory,
    getCachedCardSummariesPage,
    type CardSummary
} from './card-cache'

type CardRow = {
    id: string
    source: string
    upstream_source: string | null
    category_l1_id: string
    category_l2_id: string
    category_l3_id: string
    title: string
    question: string
    answer: string | null
    question_type: string
    difficulty: string
    frequency: string
    custom_tags: string[] | null
    code_template: string | null
    test_cases: unknown[] | null
    entry_function_name: string | null
    supported_languages: string[] | null
    origin_upstream_id: string | null
    created_at: string | null
    updated_at: string | null
}

type OverrideRow = {
    card_id: string
    mastery: MasteryStatus | null
    review_count: number | null
    interval_days: number | null
    due_at: string | null
    last_reviewed_at: string | null
    last_submission_code: string | null
    pass_rate: number | null
    updated_at: string | null
}

type CategoryRow = {
    id: string
    level: number
    name: string
    name_en: string | null
    parent_id: string | null
    icon: string | null
}

type CardListRow = {
    id: string
    user_id: string
    name: string
    card_ids: string[] | null
    is_default: boolean | null
    created_at: string | null
    updated_at: string | null
}

type CreateUserCardInput = {
    title: string
    question?: string
    answer: string
    categoryL3Id: string
    categoryL2Id?: string
    questionType?: Card['questionType']
    difficulty?: Card['difficulty']
    frequency?: Card['frequency']
    customTags?: string[]
}

function toCard(row: CardRow): Card {
    return {
        id: row.id,
        source: row.source as Card['source'],
        upstreamSource: (row.upstream_source as UpstreamSource | null) ?? undefined,
        categoryL1Id: row.category_l1_id,
        categoryL2Id: row.category_l2_id,
        categoryL3Id: row.category_l3_id,
        title: row.title,
        question: row.question,
        answer: row.answer || undefined,
        questionType: row.question_type as Card['questionType'],
        difficulty: row.difficulty as Card['difficulty'],
        frequency: row.frequency as Card['frequency'],
        customTags: row.custom_tags || [],
        codeTemplate: row.code_template || undefined,
        testCases: (row.test_cases as Card['testCases']) || undefined,
        entryFunctionName: row.entry_function_name || undefined,
        supportedLanguages: (row.supported_languages as Card['supportedLanguages']) || undefined,
        mastery: 'new',
        reviewCount: 0,
        intervalDays: 0,
        dueAt: new Date(),
        lastReviewedAt: undefined,
        lastSubmissionCode: undefined,
        passRate: undefined,
        originUpstreamId: row.origin_upstream_id || undefined,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
    }
}

function applyOverride(card: Card, override?: OverrideRow | null): Card {
    if (!override) return card
    return {
        ...card,
        mastery: override.mastery ?? card.mastery,
        reviewCount: override.review_count ?? card.reviewCount,
        intervalDays: override.interval_days ?? card.intervalDays,
        dueAt: override.due_at ? new Date(override.due_at) : card.dueAt,
        lastReviewedAt: override.last_reviewed_at ? new Date(override.last_reviewed_at) : card.lastReviewedAt,
        lastSubmissionCode: override.last_submission_code ?? card.lastSubmissionCode,
        passRate: override.pass_rate ?? card.passRate,
        updatedAt: override.updated_at ? new Date(override.updated_at) : card.updatedAt
    }
}

function applyOverridesToCards(cards: Card[], overrides: OverrideRow[] | null | undefined): Card[] {
    if (!overrides || overrides.length === 0) return cards
    const map = new Map(overrides.map(row => [row.card_id, row]))
    return cards.map(card => applyOverride(card, map.get(card.id)))
}

async function getUserId(): Promise<string | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return data.user.id
}

export async function initializeDefaultData(): Promise<void> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return

    const { data: existing, error } = await supabase
        .from('card_lists')
        .select('id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle()

    if (error) {
        console.warn('Failed to check default list:', error)
        return
    }

    if (!existing) {
        await supabase.from('card_lists').insert({
            user_id: userId,
            name: '⭐ 最喜欢的',
            card_ids: [],
            is_default: true
        })
    }
}

export async function getCategories(level?: 1 | 2 | 3): Promise<Category[]> {
    const supabase = getSupabaseClient()
    let query = supabase.from('categories').select('*')
    if (level) query = query.eq('level', level)

    const { data, error } = await query
    if (error) {
        console.error('Failed to load categories:', error)
        return []
    }

    return (data as CategoryRow[]).map(row => ({
        id: row.id,
        level: row.level as 1 | 2 | 3,
        name: row.name,
        nameEn: row.name_en || undefined,
        parentId: row.parent_id || undefined,
        icon: row.icon || undefined
    }))
}

export async function getAllCardsWithOverrides(): Promise<Card[]> {
    return getAllCardsWithOverridesInternal({ includeAnswer: true })
}

export async function getAllCardSummariesWithOverrides(): Promise<Card[]> {
    return getAllCardsWithOverridesInternal({ includeAnswer: false })
}

async function getAllCardsWithOverridesInternal(options: { includeAnswer: boolean }): Promise<Card[]> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()

    const selectColumns = options.includeAnswer
        ? 'id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,answer,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at'
        : 'id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at'

    const { data: cardRows, error: cardsError } = await supabase
        .from('cards')
        .select(selectColumns)
        .order('id')

    if (cardsError || !cardRows) {
        console.error('Failed to load cards:', cardsError)
        return []
    }

    const cards = (cardRows as unknown as CardRow[]).map(toCard)

    if (!userId) return cards

    const { data: overrideRows, error: overrideError } = await supabase
        .from('card_overrides')
        .select('*')
        .eq('user_id', userId)

    if (overrideError || !overrideRows) {
        console.warn('Failed to load overrides:', overrideError)
        return cards
    }

    const overrideMap = new Map((overrideRows as OverrideRow[]).map(row => [row.card_id, row]))

    return cards.map(card => applyOverride(card, overrideMap.get(card.id)))
}

export async function getCardSummariesPage(options: {
    page: number
    pageSize: number
    search?: string
    categoryL3Id?: string
    categoryL3Ids?: string[]
}): Promise<{ cards: Card[]; total: number }> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()

    const from = (options.page - 1) * options.pageSize
    const to = from + options.pageSize - 1

    const selectColumns = 'id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at'

    let query = supabase.from('cards').select(selectColumns, { count: 'exact' })

    if (options.search && options.search.trim()) {
        const q = options.search.trim()
        query = query.or(`title.ilike.%${q}%,question.ilike.%${q}%`)
    }

    if (options.categoryL3Id && options.categoryL3Id.trim()) {
        query = query.eq('category_l3_id', options.categoryL3Id.trim())
    } else if (options.categoryL3Ids) {
        if (options.categoryL3Ids.length === 0) {
            return { cards: [], total: 0 }
        }
        query = query.in('category_l3_id', options.categoryL3Ids)
    }

    const { data: cardRows, error: cardsError, count } = await query
        .order('id')
        .range(from, to)

    if (cardsError || !cardRows) {
        console.error('Failed to load cards:', cardsError)
        return { cards: [], total: 0 }
    }

    const cards = (cardRows as CardRow[]).map(toCard)

    if (!userId || cards.length === 0) {
        return { cards, total: count || cards.length }
    }

    const cardIds = cards.map(c => c.id)
    const { data: overrideRows } = await supabase
        .from('card_overrides')
        .select('*')
        .eq('user_id', userId)
        .in('card_id', cardIds)

    const overrideMap = new Map((overrideRows as OverrideRow[] | null || []).map(row => [row.card_id, row]))
    return { cards: cards.map(card => applyOverride(card, overrideMap.get(card.id))), total: count || cards.length }
}

export async function getCardSummariesPageCached(options: {
    page: number
    pageSize: number
    search?: string
    categoryL3Id?: string
    categoryL3Ids?: string[]
}): Promise<{ cards: Card[]; total: number }> {
    await syncCardSummaryCache()
    const cached = await getCachedCardSummariesPage(options)
    const overrides = await getOverridesByIds(cached.cards.map(card => card.id))
    const cards = applyOverridesToCards(
        cached.cards.map(toCardFromCache),
        overrides
    )
    return { cards, total: cached.total }
}

export async function getCardSolvedCountCached(options: {
    search?: string
    categoryL3Id?: string
    categoryL3Ids?: string[]
}): Promise<number> {
    const { solved } = await getCardSolvedProgressCached(options)
    return solved
}

export async function getSolvedCardIdsCached(): Promise<Set<string>> {
    await syncCardSummaryCache()

    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return new Set()

    const { data: overrideRows } = await supabase
        .from('card_overrides')
        .select('card_id, mastery, review_count')
        .eq('user_id', userId)

    return new Set(
        ((overrideRows as Array<{ card_id: string; mastery: MasteryStatus | null; review_count: number | null }> | null) || [])
            .filter(row => (row.review_count ?? 0) > 0 || (row.mastery !== null && row.mastery !== 'new'))
            .map(row => row.card_id)
    )
}

export async function getCardSolvedProgressCached(options: {
    search?: string
    categoryL3Id?: string
    categoryL3Ids?: string[]
}): Promise<{ solved: number; total: number }> {
    await syncCardSummaryCache()

    let cards = await getCachedCardSummariesByCategory({
        categoryL3Id: options.categoryL3Id,
        categoryL3Ids: options.categoryL3Ids
    })

    if (options.search && options.search.trim()) {
        const q = options.search.trim().toLowerCase()
        cards = cards.filter(card =>
            card.title.toLowerCase().includes(q) ||
            card.question.toLowerCase().includes(q)
        )
    }

    const total = cards.length
    if (total === 0) return { solved: 0, total: 0 }

    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return { solved: 0, total }

    const { data: overrideRows } = await supabase
        .from('card_overrides')
        .select('card_id, mastery, review_count')
        .eq('user_id', userId)

    const solvedCardIds = new Set(
        ((overrideRows as Array<{ card_id: string; mastery: MasteryStatus | null; review_count: number | null }> | null) || [])
            .filter(row => (row.review_count ?? 0) > 0 || (row.mastery !== null && row.mastery !== 'new'))
            .map(row => row.card_id)
    )

    let solved = 0
    for (const card of cards) {
        if (solvedCardIds.has(card.id)) solved += 1
    }

    return { solved, total }
}

function toCardFromCache(summary: CardSummary): Card {
    return {
        id: summary.id,
        source: summary.source as Card['source'],
        upstreamSource: summary.upstreamSource || undefined,
        categoryL1Id: summary.categoryL1Id,
        categoryL2Id: summary.categoryL2Id,
        categoryL3Id: summary.categoryL3Id,
        title: summary.title,
        question: summary.question,
        answer: undefined,
        questionType: summary.questionType as Card['questionType'],
        difficulty: summary.difficulty as Card['difficulty'],
        frequency: summary.frequency as Card['frequency'],
        customTags: summary.customTags || [],
        codeTemplate: undefined,
        testCases: undefined,
        entryFunctionName: undefined,
        supportedLanguages: undefined,
        mastery: 'new',
        reviewCount: 0,
        intervalDays: 0,
        dueAt: new Date(),
        lastReviewedAt: undefined,
        lastSubmissionCode: undefined,
        passRate: undefined,
        originUpstreamId: summary.originUpstreamId || undefined,
        createdAt: summary.createdAt instanceof Date ? summary.createdAt : new Date(summary.createdAt),
        updatedAt: summary.updatedAt instanceof Date ? summary.updatedAt : new Date(summary.updatedAt)
    }
}

export async function getCardWithOverride(cardId: string): Promise<Card | undefined> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()

    const { data: cardRow, error } = await supabase
        .from('cards')
        .select('id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,answer,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at')
        .eq('id', cardId)
        .maybeSingle()

    if (error || !cardRow) return undefined

    const card = toCard(cardRow as CardRow)

    if (!userId) return card

    const { data: overrideRow } = await supabase
        .from('card_overrides')
        .select('*')
        .eq('user_id', userId)
        .eq('card_id', cardId)
        .maybeSingle()

    return applyOverride(card, overrideRow as OverrideRow | null)
}

export async function getCardSummary(cardId: string): Promise<Card | undefined> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()

    const { data: cardRow, error } = await supabase
        .from('cards')
        .select('id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at')
        .eq('id', cardId)
        .maybeSingle()

    if (error || !cardRow) return undefined

    const card = toCard(cardRow as CardRow)

    if (!userId) return card

    const { data: overrideRow } = await supabase
        .from('card_overrides')
        .select('*')
        .eq('user_id', userId)
        .eq('card_id', cardId)
        .maybeSingle()

    return applyOverride(card, overrideRow as OverrideRow | null)
}

export async function getCardAnswer(cardId: string): Promise<string | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('cards')
        .select('answer')
        .eq('id', cardId)
        .maybeSingle()

    if (error || !data) return null
    return (data as { answer: string | null }).answer
}

export async function getOverridesByIds(cardIds: string[]): Promise<OverrideRow[]> {
    if (cardIds.length === 0) return []
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return []

    const { data } = await supabase
        .from('card_overrides')
        .select('*')
        .eq('user_id', userId)
        .in('card_id', cardIds)

    return (data as OverrideRow[] | null) || []
}

export async function getCardsByCategory(categoryL3Id: string): Promise<Card[]> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()

    const { data: cardRows, error } = await supabase
        .from('cards')
        .select('id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at')
        .eq('category_l3_id', categoryL3Id)

    if (error || !cardRows) return []

    const cards = (cardRows as CardRow[]).map(toCard)
    if (!userId) return cards

    const cardIds = cards.map(c => c.id)
    const { data: overrideRows } = await supabase
        .from('card_overrides')
        .select('*')
        .eq('user_id', userId)
        .in('card_id', cardIds)

    const overrideMap = new Map((overrideRows as OverrideRow[] | null || []).map(row => [row.card_id, row]))
    return cards.map(card => applyOverride(card, overrideMap.get(card.id)))
}

export async function getCardsByList(listId: string): Promise<Card[]> {
    const list = await getListById(listId)
    if (!list) return []

    return getCardsByIds(list.cardIds)
}

export async function getCardsByIds(cardIds: string[]): Promise<Card[]> {
    if (cardIds.length === 0) return []
    const supabase = getSupabaseClient()
    const userId = await getUserId()

    const { data: cardRows, error } = await supabase
        .from('cards')
        .select('id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at')
        .in('id', cardIds)

    if (error || !cardRows) return []

    const cards = (cardRows as CardRow[]).map(toCard)
    if (!userId) return cards

    const { data: overrideRows } = await supabase
        .from('card_overrides')
        .select('*')
        .eq('user_id', userId)
        .in('card_id', cardIds)

    const overrideMap = new Map((overrideRows as OverrideRow[] | null || []).map(row => [row.card_id, row]))
    const cardMap = new Map(cards.map(card => [card.id, applyOverride(card, overrideMap.get(card.id))]))
    return cardIds.map(id => cardMap.get(id)).filter((c): c is Card => Boolean(c))
}

export async function getDueCards(now: Date = new Date()): Promise<Card[]> {
    const cards = await getAllCardsWithOverridesInternal({ includeAnswer: false })
    return cards.filter(card => card.dueAt <= now && card.mastery !== 'solid')
}

export async function getDueCount(now: Date = new Date()): Promise<number> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return 0

    const { count: totalCards } = await supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })

    const { data: overrides } = await supabase
        .from('card_overrides')
        .select('due_at, mastery')
        .eq('user_id', userId)

    const overrideRows = (overrides as Array<{ due_at: string | null; mastery: MasteryStatus }> | null) || []
    const dueFromOverrides = overrideRows.filter(row => {
        if (row.mastery === 'solid') return false
        if (!row.due_at) return false
        return new Date(row.due_at) <= now
    }).length

    const overriddenCount = overrideRows.length
    const untrackedCount = Math.max(0, (totalCards || 0) - overriddenCount)

    return dueFromOverrides + untrackedCount
}

export async function updateCardMastery(
    card: Card,
    newMastery: MasteryStatus,
    scheduleUpdate: Partial<Card>,
    timeSpentMs: number
): Promise<void> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return

    const payload = {
        user_id: userId,
        card_id: card.id,
        mastery: newMastery,
        review_count: scheduleUpdate.reviewCount ?? card.reviewCount,
        interval_days: scheduleUpdate.intervalDays ?? card.intervalDays,
        due_at: scheduleUpdate.dueAt ? new Date(scheduleUpdate.dueAt).toISOString() : card.dueAt.toISOString(),
        last_reviewed_at: scheduleUpdate.lastReviewedAt
            ? new Date(scheduleUpdate.lastReviewedAt).toISOString()
            : new Date().toISOString(),
        updated_at: new Date().toISOString()
    }

    const { error } = await supabase.from('card_overrides').upsert(payload, {
        onConflict: 'user_id,card_id'
    })
    if (error) {
        console.error('Failed to update mastery:', error)
    }

    await supabase.from('review_logs').insert({
        user_id: userId,
        card_id: card.id,
        reviewed_at: new Date().toISOString(),
        previous_mastery: card.mastery,
        new_mastery: newMastery,
        did_reveal_answer: true,
        time_spent_ms: timeSpentMs
    })
}

export async function getMasteryStats(): Promise<Record<MasteryStatus, number>> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return { new: 0, fuzzy: 0, 'can-explain': 0, solid: 0 }

    const { count: totalCards } = await supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })

    const { data: overrideRows } = await supabase
        .from('card_overrides')
        .select('mastery')
        .eq('user_id', userId)

    const stats: Record<MasteryStatus, number> = { new: 0, fuzzy: 0, 'can-explain': 0, solid: 0 }
        ; (overrideRows as Array<{ mastery: MasteryStatus }> | null || []).forEach(row => {
            stats[row.mastery]++
        })

    const nonNew = stats.fuzzy + stats['can-explain'] + stats.solid
    stats.new = Math.max(0, (totalCards || 0) - nonNew)

    return stats
}

export async function getDomainStats(): Promise<Map<string, { total: number; solid: number }>> {
    const cards = await getAllCardsWithOverridesInternal({ includeAnswer: false })
    const stats = new Map<string, { total: number; solid: number }>()
    cards.forEach(card => {
        const entry = stats.get(card.categoryL2Id) || { total: 0, solid: 0 }
        entry.total++
        if (card.mastery === 'solid') entry.solid++
        stats.set(card.categoryL2Id, entry)
    })
    return stats
}

export async function getReviewCards(scope: string, limit: number): Promise<Card[]> {
    if (scope.startsWith('list:')) {
        const listId = scope.replace('list:', '')
        return getCardsByList(listId)
    }

    if (scope.startsWith('category:')) {
        const categoryId = scope.replace('category:', '')
        const supabase = getSupabaseClient()
        const { data: cardRows, error } = await supabase
            .from('cards')
            .select('id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at')
            .eq('category_l3_id', categoryId)
            .limit(limit)

        if (error || !cardRows) return []
        const cards = (cardRows as CardRow[]).map(toCard)
        const overrides = await getOverridesByIds(cards.map(c => c.id))
        return applyOverridesToCards(cards, overrides)
    }

    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return []

    const { data: dueRows } = await supabase
        .from('card_overrides')
        .select('card_id')
        .eq('user_id', userId)
        .neq('mastery', 'solid')
        .lte('due_at', new Date().toISOString())
        .limit(limit)

    const dueIds = (dueRows as Array<{ card_id: string }> | null || []).map(row => row.card_id)
    const cards = await getCardsByIds(dueIds)

    if (cards.length >= limit) return cards

    const remaining = limit - cards.length
    const { data: extraRows } = await supabase
        .from('cards')
        .select('id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at')
        .limit(remaining)

    const extraCards = (extraRows as CardRow[] | null || []).map(toCard)
    const extraOverrides = await getOverridesByIds(extraCards.map(c => c.id))
    return [...cards, ...applyOverridesToCards(extraCards, extraOverrides)]
}

export async function syncCardSummaryCache(): Promise<void> {
    const supabase = getSupabaseClient()
    const lastSynced = await getCacheMeta('cards_last_synced')
    let page = 0
    const pageSize = 500

    while (true) {
        const from = page * pageSize
        const to = from + pageSize - 1

        let query = supabase
            .from('cards')
            .select('id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at')
            .order('updated_at', { ascending: true })
            .range(from, to)

        if (lastSynced) {
            query = query.gt('updated_at', lastSynced)
        }

        const { data: rows, error } = await query
        if (error || !rows || rows.length === 0) break

        const summaries: CardSummary[] = (rows as CardRow[]).map(row => ({
            id: row.id,
            source: row.source as Card['source'],
            upstreamSource: (row.upstream_source as Card['upstreamSource']) || undefined,
            categoryL1Id: row.category_l1_id,
            categoryL2Id: row.category_l2_id,
            categoryL3Id: row.category_l3_id,
            title: row.title,
            question: row.question,
            questionType: row.question_type as Card['questionType'],
            difficulty: row.difficulty as Card['difficulty'],
            frequency: row.frequency as Card['frequency'],
            customTags: row.custom_tags || [],
            originUpstreamId: row.origin_upstream_id || undefined,
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
            updatedAtRaw: row.updated_at
        }))

        await upsertCardSummaries(summaries)

        const latest = summaries[summaries.length - 1]?.updatedAtRaw
        if (latest) {
            await setCacheMeta('cards_last_synced', latest)
        }

        page += 1
    }
}

export async function getLists(): Promise<CardList[]> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return []

    const { data, error } = await supabase
        .from('card_lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error || !data) {
        console.error('Failed to load lists:', error)
        return []
    }

    return (data as CardListRow[]).map(row => ({
        id: row.id,
        name: row.name,
        cardIds: row.card_ids || [],
        isDefault: row.is_default || false,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
    }))
}

export async function getListById(listId: string): Promise<CardList | null> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return null

    const { data, error } = await supabase
        .from('card_lists')
        .select('*')
        .eq('id', listId)
        .eq('user_id', userId)
        .maybeSingle()

    if (error || !data) return null

    const row = data as CardListRow
    return {
        id: row.id,
        name: row.name,
        cardIds: row.card_ids || [],
        isDefault: row.is_default || false,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
    }
}

export async function getDefaultList(): Promise<CardList | null> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return null

    const { data, error } = await supabase
        .from('card_lists')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle()

    if (error || !data) return null

    const row = data as CardListRow
    return {
        id: row.id,
        name: row.name,
        cardIds: row.card_ids || [],
        isDefault: row.is_default || false,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
    }
}

export async function createList(name: string, cardIds: string[] = [], isDefault: boolean = false): Promise<CardList | null> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return null

    const { data, error } = await supabase
        .from('card_lists')
        .insert({
            user_id: userId,
            name,
            card_ids: cardIds,
            is_default: isDefault
        })
        .select('*')
        .single()

    if (error || !data) {
        console.error('Failed to create list:', error)
        return null
    }

    const row = data as CardListRow
    return {
        id: row.id,
        name: row.name,
        cardIds: row.card_ids || [],
        isDefault: row.is_default || false,
        createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
    }
}

export async function createUserCard(input: CreateUserCardInput): Promise<Card | null> {
    const supabase = getSupabaseClient()
    const cardId = `user-${crypto.randomUUID()}`
    const nowIso = new Date().toISOString()

    const payload = {
        id: cardId,
        source: 'user',
        upstream_source: null,
        category_l1_id: 'technical',
        category_l2_id: input.categoryL2Id || 'web-frontend',
        category_l3_id: input.categoryL3Id,
        title: input.title.trim(),
        question: (input.question || input.title).trim(),
        answer: input.answer.trim(),
        question_type: input.questionType || 'concept',
        difficulty: input.difficulty || 'must-know',
        frequency: input.frequency || 'mid',
        custom_tags: input.customTags || [],
        origin_upstream_id: null,
        created_at: nowIso,
        updated_at: nowIso
    }

    const { data, error } = await supabase
        .from('cards')
        .insert(payload)
        .select('id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,answer,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at')
        .single()

    if (error || !data) {
        console.error('Failed to create user card:', error)
        return null
    }

    return toCard(data as CardRow)
}

export async function updateList(listId: string, updates: { name?: string; cardIds?: string[] }): Promise<void> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return

    const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString()
    }
    if (typeof updates.name !== 'undefined') payload.name = updates.name
    if (typeof updates.cardIds !== 'undefined') payload.card_ids = updates.cardIds

    const { error } = await supabase
        .from('card_lists')
        .update(payload)
        .eq('id', listId)
        .eq('user_id', userId)

    if (error) console.error('Failed to update list:', error)
}

export async function deleteList(listId: string): Promise<void> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return

    const { error } = await supabase
        .from('card_lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', userId)

    if (error) console.error('Failed to delete list:', error)
}

export async function ensureCardsAvailable(): Promise<number> {
    const supabase = getSupabaseClient()
    const { count, error } = await supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })

    if (error) {
        console.error('Failed to check cards:', error)
        return 0
    }

    return count || 0
}

export async function clearUserData(): Promise<void> {
    const supabase = getSupabaseClient()
    const userId = await getUserId()
    if (!userId) return

    await supabase.from('card_overrides').delete().eq('user_id', userId)
    await supabase.from('review_sessions').delete().eq('user_id', userId)
    await supabase.from('review_logs').delete().eq('user_id', userId)
    await supabase.from('card_lists').delete().eq('user_id', userId)
}
