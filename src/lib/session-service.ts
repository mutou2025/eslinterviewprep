import type { ReviewSession, ReviewFilters, Card } from '@/types'
import { generateReviewQueue } from './scheduler'
import { getSupabaseClient } from './supabase-client'
import { getAllCardSummariesWithOverrides } from './data-service'

const SESSION_DEBOUNCE_MS = 500
let saveTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * 生成会话 ID
 */
function generateSessionId(scope: string, mode: string): string {
    return `${scope}:${mode}`
}

/**
 * 保存复习会话（防抖）
 */
export function saveSession(session: ReviewSession): void {
    if (saveTimeout) {
        clearTimeout(saveTimeout)
    }

    saveTimeout = setTimeout(async () => {
        await saveSessionImmediate(session)
    }, SESSION_DEBOUNCE_MS)
}

/**
 * 立即保存会话（不防抖）
 */
export async function saveSessionImmediate(session: ReviewSession): Promise<void> {
    if (saveTimeout) {
        clearTimeout(saveTimeout)
        saveTimeout = null
    }

    const supabase = getSupabaseClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return

    await supabase.from('review_sessions').upsert({
        id: session.id,
        user_id: data.user.id,
        scope: session.scope,
        mode: session.mode,
        queue_card_ids: session.queueCardIds,
        cursor: session.cursor,
        filters: session.filters,
        updated_at: new Date().toISOString()
    })
}

/**
 * 恢复复习会话
 */
export async function restoreSession(
    scope: string,
    mode: 'qa' | 'code' | 'mix'
): Promise<ReviewSession | null> {
    const sessionId = generateSessionId(scope, mode)

    const supabase = getSupabaseClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return null

    const { data: sessionRow } = await supabase
        .from('review_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', data.user.id)
        .maybeSingle()

    if (!sessionRow) return null

    const session: ReviewSession = {
        id: sessionRow.id,
        scope: sessionRow.scope,
        mode: sessionRow.mode,
        queueCardIds: sessionRow.queue_card_ids || [],
        cursor: sessionRow.cursor ?? 0,
        filters: (sessionRow.filters as ReviewFilters) || getDefaultFilters(),
        updatedAt: sessionRow.updated_at ? new Date(sessionRow.updated_at) : new Date()
    }

    // 验证会话中的卡片是否仍然存在
    const validatedSession = await validateSession(session)

    return validatedSession
}

/**
 * 验证会话（过滤已删除卡片，修正 cursor）
 */
async function validateSession(session: ReviewSession): Promise<ReviewSession> {
    const cards = await getAllCardSummariesWithOverrides()
    const existingCardIds = new Set(cards.map(c => c.id))

    // 过滤不存在的卡片
    const validCardIds = session.queueCardIds.filter(id => existingCardIds.has(id))

    // 修正 cursor
    let cursor = session.cursor
    if (cursor >= validCardIds.length) {
        cursor = Math.max(0, validCardIds.length - 1)
    }

    return {
        ...session,
        queueCardIds: validCardIds,
        cursor
    }
}

/**
 * 创建新的复习会话
 */
export async function createSession(
    scope: string,
    mode: 'qa' | 'code' | 'mix',
    cards: Card[],
    filters: ReviewFilters
): Promise<ReviewSession> {
    const queue = generateReviewQueue(cards, {
        onlyDue: filters.onlyDue,
        masteryFilter: filters.masteryFilter.length > 0 ? filters.masteryFilter : undefined,
        shuffle: filters.shuffle
    })

    const session: ReviewSession = {
        id: generateSessionId(scope, mode),
        scope,
        mode,
        queueCardIds: queue.map(c => c.id),
        cursor: 0,
        filters,
        updatedAt: new Date()
    }

    await saveSessionImmediate(session)
    return session
}

/**
 * 删除会话
 */
export async function deleteSession(scope: string, mode: string): Promise<void> {
    const sessionId = generateSessionId(scope, mode)
    const supabase = getSupabaseClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) return

    await supabase.from('review_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', data.user.id)
}

/**
 * 获取默认筛选器
 */
export function getDefaultFilters(): ReviewFilters {
    return {
        onlyDue: true,
        masteryFilter: [],
        questionTypeFilter: [],
        shuffle: false
    }
}
