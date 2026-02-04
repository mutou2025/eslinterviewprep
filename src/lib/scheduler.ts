import { addMinutes, addDays } from 'date-fns'
import type { Card, MasteryStatus } from '@/types'

/**
 * 间隔复习调度算法
 * 基于 4 级掌握度: new → fuzzy → can-explain → solid
 */
export function scheduleNext(
    card: Card,
    newMastery: MasteryStatus
): Partial<Card> {
    const now = new Date()
    const prev = card.intervalDays || 0

    switch (newMastery) {
        case 'new':
            // 未学 - 立即再次出现
            return {
                mastery: 'new',
                intervalDays: 0,
                dueAt: now,
                reviewCount: card.reviewCount + 1,
                lastReviewedAt: now
            }

        case 'fuzzy':
            // 模糊 - 10分钟后再次出现
            return {
                mastery: 'fuzzy',
                intervalDays: 1,
                dueAt: addMinutes(now, 10),
                reviewCount: card.reviewCount + 1,
                lastReviewedAt: now
            }

        case 'can-explain':
            // 会讲 - 间隔翻倍，最少 1 天
            const canExplainDays = Math.max(1, Math.round(prev === 0 ? 1 : prev * 2))
            return {
                mastery: 'can-explain',
                intervalDays: canExplainDays,
                dueAt: addDays(now, canExplainDays),
                reviewCount: card.reviewCount + 1,
                lastReviewedAt: now
            }

        case 'solid':
            // 熟练 - 间隔 ×2.5，最少 7 天
            const solidDays = Math.max(7, Math.round(prev === 0 ? 7 : prev * 2.5))
            return {
                mastery: 'solid',
                intervalDays: solidDays,
                dueAt: addDays(now, solidDays),
                reviewCount: card.reviewCount + 1,
                lastReviewedAt: now
            }
    }
}

/**
 * 计算连续复习天数 (streak)
 */
export function calculateStreak(reviewDates: Date[]): number {
    if (reviewDates.length === 0) return 0

    // 按日期排序（降序）
    const sortedDates = [...reviewDates]
        .map(d => new Date(d).toDateString())
        .filter((v, i, a) => a.indexOf(v) === i) // 去重
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    // 检查今天或昨天是否有复习
    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
        return 0
    }

    let streak = 1
    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1])
        const currDate = new Date(sortedDates[i])
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000)

        if (diffDays === 1) {
            streak++
        } else {
            break
        }
    }

    return streak
}

/**
 * 生成复习队列
 */
export function generateReviewQueue(
    cards: Card[],
    options: {
        onlyDue?: boolean
        masteryFilter?: MasteryStatus[]
        shuffle?: boolean
    } = {}
): Card[] {
    let queue = [...cards]

    // 过滤到期卡片
    if (options.onlyDue) {
        const now = new Date()
        queue = queue.filter(card => card.dueAt <= now)
    }

    // 过滤掌握度
    if (options.masteryFilter && options.masteryFilter.length > 0) {
        queue = queue.filter(card => options.masteryFilter!.includes(card.mastery))
    }

    // 排除已熟练（默认行为）
    queue = queue.filter(card => card.mastery !== 'solid')

    // 随机排序
    if (options.shuffle) {
        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[queue[i], queue[j]] = [queue[j], queue[i]]
        }
    } else {
        // 默认按到期时间排序
        queue.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    }

    return queue
}
