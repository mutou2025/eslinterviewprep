'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Flashcard } from '@/components/Flashcard'
import { FlashcardControls } from '@/components/FlashcardControls'
import { MasteryProgress } from '@/components/MasteryBadge'
import { useReviewStore } from '@/store/review-store'
import { db, getAllCardsWithOverrides, getCardsByCategory, getCardsByList, getMasteryStats } from '@/lib/db'
import { restoreSession, createSession, getDefaultFilters } from '@/lib/session-service'
import type { Card, MasteryStatus } from '@/types'

interface ReviewPageProps {
    params: Promise<{ mode: string }>
}

export default function ReviewPage({ params }: ReviewPageProps) {
    const searchParams = useSearchParams()
    const scope = searchParams.get('scope') || 'all'

    const [mode, setMode] = useState<string>('qa')
    const [isLoading, setIsLoading] = useState(true)
    const [showContinuePrompt, setShowContinuePrompt] = useState(false)
    const [masteryStats, setMasteryStats] = useState<Record<MasteryStatus, number>>({
        new: 0, fuzzy: 0, 'can-explain': 0, solid: 0
    })

    const {
        session,
        currentCard,
        isFlipped,
        setSession,
        setCards,
        flipCard,
        markMastery,
        goToNext,
        goToPrevious,
        reset
    } = useReviewStore()

    // 加载数据
    const loadData = useCallback(async (continueSession: boolean = true) => {
        setIsLoading(true)

        try {
            // 解析 mode
            const resolvedParams = await params
            setMode(resolvedParams.mode)

            // 获取卡片
            let cards: Card[] = []
            if (scope === 'all') {
                cards = await getAllCardsWithOverrides()
            } else if (scope.startsWith('category:')) {
                const categoryId = scope.replace('category:', '')
                cards = await getCardsByCategory(categoryId)
            } else if (scope.startsWith('list:')) {
                const listId = scope.replace('list:', '')
                cards = await getCardsByList(listId)
            }

            // 设置卡片到 store
            setCards(cards)

            // 尝试恢复会话
            if (continueSession) {
                const existingSession = await restoreSession(scope, resolvedParams.mode as 'qa' | 'code' | 'mix')
                if (existingSession && existingSession.queueCardIds.length > 0) {
                    setShowContinuePrompt(true)
                    setSession(existingSession)
                    setIsLoading(false)
                    return
                }
            }

            // 创建新会话
            const newSession = await createSession(
                scope,
                resolvedParams.mode as 'qa' | 'code' | 'mix',
                cards,
                getDefaultFilters()
            )
            setSession(newSession)

            // 获取统计
            const stats = await getMasteryStats()
            setMasteryStats(stats)

        } catch (error) {
            console.error('Failed to load review data:', error)
        } finally {
            setIsLoading(false)
        }
    }, [scope, params, setCards, setSession])

    useEffect(() => {
        loadData()
        return () => reset()
    }, [loadData, reset])

    // 键盘快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return
            }

            switch (e.key) {
                case ' ':
                    e.preventDefault()
                    flipCard()
                    break
                case 'Enter':
                    e.preventDefault()
                    if (isFlipped) {
                        markMastery('solid')
                    } else {
                        flipCard()
                    }
                    break
                case '1':
                    if (isFlipped) markMastery('new')
                    break
                case '2':
                    if (isFlipped) markMastery('fuzzy')
                    break
                case '3':
                    if (isFlipped) markMastery('can-explain')
                    break
                case '4':
                    if (isFlipped) markMastery('solid')
                    break
                case 'ArrowLeft':
                    goToPrevious()
                    break
                case 'ArrowRight':
                    goToNext()
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isFlipped, flipCard, markMastery, goToNext, goToPrevious])

    // 加载中
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-500">加载中...</p>
                </div>
            </div>
        )
    }

    // 没有卡片
    if (!currentCard || !session || session.queueCardIds.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🎉</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">太棒了！</h2>
                    <p className="text-gray-500 mb-6">
                        当前没有需要复习的卡片，你已经完成了所有学习任务！
                    </p>
                    <a
                        href="/library"
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        去题库看看
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* 进度条 */}
                <div className="mb-6">
                    <MasteryProgress stats={masteryStats} showLabels={false} />
                </div>

                {/* 卡片 */}
                <Flashcard
                    card={currentCard}
                    isFlipped={isFlipped}
                    onFlip={flipCard}
                    onMarkMastery={markMastery}
                />

                {/* 控制栏 */}
                <FlashcardControls
                    currentIndex={session.cursor}
                    totalCount={session.queueCardIds.length}
                    onPrevious={goToPrevious}
                    onNext={goToNext}
                />

                {/* 快捷键提示 */}
                <div className="mt-6 text-center text-sm text-gray-400">
                    <p>快捷键：Space 翻转 | Enter 熟练 | 1-4 标记掌握度 | ←→ 切换</p>
                </div>
            </div>
        </div>
    )
}
