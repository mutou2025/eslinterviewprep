import { create } from 'zustand'
import type { Card, MasteryStatus, ReviewFilters, ReviewSession } from '@/types'
import { scheduleNext } from '@/lib/scheduler'
import { updateCardMastery, getCardWithOverride } from '@/lib/db'
import { saveSession } from '@/lib/session-service'

interface ReviewState {
    // 当前会话
    session: ReviewSession | null

    // 当前卡片
    currentCard: Card | null
    isFlipped: boolean

    // 所有卡片（用于快速查找）
    cardMap: Map<string, Card>

    // 计时
    cardStartTime: number

    // 操作
    setSession: (session: ReviewSession) => void
    setCards: (cards: Card[]) => void

    flipCard: () => void
    markMastery: (mastery: MasteryStatus) => Promise<void>

    goToNext: () => void
    goToPrevious: () => void
    goToIndex: (index: number) => void

    updateFilters: (filters: Partial<ReviewFilters>) => void

    reset: () => void
}

export const useReviewStore = create<ReviewState>((set, get) => ({
    session: null,
    currentCard: null,
    isFlipped: false,
    cardMap: new Map(),
    cardStartTime: Date.now(),

    setSession: (session) => {
        const { cardMap } = get()
        const currentCardId = session.queueCardIds[session.cursor]
        const currentCard = cardMap.get(currentCardId) || null

        set({
            session,
            currentCard,
            isFlipped: false,
            cardStartTime: Date.now()
        })
    },

    setCards: (cards) => {
        const cardMap = new Map(cards.map(c => [c.id, c]))
        set({ cardMap })
    },

    flipCard: () => {
        set(state => ({ isFlipped: !state.isFlipped }))
    },

    markMastery: async (mastery) => {
        const { session, currentCard, cardStartTime, cardMap } = get()
        if (!session || !currentCard) return

        // 计算用时
        const timeSpentMs = Math.min(Date.now() - cardStartTime, 300000) // 最多 5 分钟

        // 计算新的调度
        const scheduleUpdate = scheduleNext(currentCard, mastery)

        // 更新数据库
        await updateCardMastery(currentCard.id, mastery, scheduleUpdate)

        // 更新本地状态
        const updatedCard = { ...currentCard, ...scheduleUpdate }
        cardMap.set(currentCard.id, updatedCard)

        // 如果标记为 solid，从队列中移除
        let newQueueCardIds = [...session.queueCardIds]
        if (mastery === 'solid') {
            newQueueCardIds = newQueueCardIds.filter(id => id !== currentCard.id)
        }

        // 移动到下一题
        let newCursor = session.cursor
        if (mastery === 'solid') {
            // 如果移除了当前卡片，cursor 不变（指向下一张）
            if (newCursor >= newQueueCardIds.length) {
                newCursor = 0 // 循环到开头
            }
        } else {
            newCursor = (session.cursor + 1) % session.queueCardIds.length
        }

        const newSession: ReviewSession = {
            ...session,
            queueCardIds: newQueueCardIds,
            cursor: newCursor,
            updatedAt: new Date()
        }

        const nextCard = cardMap.get(newSession.queueCardIds[newCursor]) || null

        set({
            session: newSession,
            currentCard: nextCard,
            cardMap: new Map(cardMap),
            isFlipped: false,
            cardStartTime: Date.now()
        })

        // 保存会话
        saveSession(newSession)
    },

    goToNext: () => {
        const { session, cardMap } = get()
        if (!session || session.queueCardIds.length === 0) return

        const newCursor = (session.cursor + 1) % session.queueCardIds.length
        const newSession = { ...session, cursor: newCursor }
        const nextCard = cardMap.get(session.queueCardIds[newCursor]) || null

        set({
            session: newSession,
            currentCard: nextCard,
            isFlipped: false,
            cardStartTime: Date.now()
        })

        saveSession(newSession)
    },

    goToPrevious: () => {
        const { session, cardMap } = get()
        if (!session || session.queueCardIds.length === 0) return

        const newCursor = session.cursor === 0
            ? session.queueCardIds.length - 1
            : session.cursor - 1
        const newSession = { ...session, cursor: newCursor }
        const prevCard = cardMap.get(session.queueCardIds[newCursor]) || null

        set({
            session: newSession,
            currentCard: prevCard,
            isFlipped: false,
            cardStartTime: Date.now()
        })

        saveSession(newSession)
    },

    goToIndex: (index) => {
        const { session, cardMap } = get()
        if (!session || index < 0 || index >= session.queueCardIds.length) return

        const newSession = { ...session, cursor: index }
        const card = cardMap.get(session.queueCardIds[index]) || null

        set({
            session: newSession,
            currentCard: card,
            isFlipped: false,
            cardStartTime: Date.now()
        })

        saveSession(newSession)
    },

    updateFilters: (filters) => {
        const { session } = get()
        if (!session) return

        const newSession = {
            ...session,
            filters: { ...session.filters, ...filters }
        }

        set({ session: newSession })
        saveSession(newSession)
    },

    reset: () => {
        set({
            session: null,
            currentCard: null,
            isFlipped: false,
            cardMap: new Map(),
            cardStartTime: Date.now()
        })
    }
}))
