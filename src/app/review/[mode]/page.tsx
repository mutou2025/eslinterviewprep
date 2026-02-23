'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Flashcard } from '@/components/Flashcard'
import { FlashcardControls } from '@/components/FlashcardControls'
import { MasteryProgress } from '@/components/MasteryBadge'
import { useReviewStore } from '@/store/review-store'
import { useI18n } from '@/i18n/provider'
import { getReviewCards, getMasteryStats, getCardAnswer } from '@/lib/data-service'
import { restoreSession, createSession, getDefaultFilters } from '@/lib/session-service'
import type { Card, MasteryStatus } from '@/types'

interface ReviewPageProps {
    params: Promise<{ mode: string }>
}

export default function ReviewPage({ params }: ReviewPageProps) {
    const searchParams = useSearchParams()
    const scope = searchParams.get('scope') || 'all'
    const { t } = useI18n()

    const [isLoading, setIsLoading] = useState(true)
    const [answerLoadingIds, setAnswerLoadingIds] = useState<Set<string>>(new Set())
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
        reset,
        setCardAnswer
    } = useReviewStore()

    // 加载数据
    const loadData = useCallback(async (continueSession: boolean = true) => {
        setIsLoading(true)

        try {
            // 解析 mode
            const resolvedParams = await params
            // 获取卡片
            let cards: Card[] = []
            cards = await getReviewCards(scope, 200)

            // 设置卡片到 store
            setCards(cards)

            // 尝试恢复会话
            if (continueSession) {
                const existingSession = await restoreSession(scope, resolvedParams.mode as 'qa' | 'code' | 'mix')
                if (existingSession && existingSession.queueCardIds.length > 0) {
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

    // 定义 handleLoadAnswer 在 early return 之前，确保 hooks 顺序一致
    const handleLoadAnswer = useCallback(async () => {
        if (!currentCard || currentCard.answer) return
        if (answerLoadingIds.has(currentCard.id)) return

        setAnswerLoadingIds(prev => {
            const next = new Set(prev)
            next.add(currentCard.id)
            return next
        })

        try {
            const answer = await getCardAnswer(currentCard.id)
            setCardAnswer(currentCard.id, answer)
        } finally {
            setAnswerLoadingIds(prev => {
                const updated = new Set(prev)
                updated.delete(currentCard.id)
                return updated
            })
        }
    }, [currentCard, answerLoadingIds, setCardAnswer])

    // 加载中
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-[#94A3B8]">{t('review.loadingData')}</p>
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
                    <h2 className="text-xl font-bold text-[#0F172A] mb-2">{t('review.doneTitle')}</h2>
                    <p className="text-[#94A3B8] mb-6">
                        {t('review.doneDesc')}
                    </p>
                    <a
                        href="/library"
                        className="inline-flex items-center px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                    >
                        {t('review.goLibrary')}
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
                    onLoadAnswer={handleLoadAnswer}
                    isAnswerLoading={answerLoadingIds.has(currentCard.id)}
                />

                {/* 控制栏 */}
                <FlashcardControls
                    currentIndex={session.cursor}
                    totalCount={session.queueCardIds.length}
                    onPrevious={goToPrevious}
                    onNext={goToNext}
                />

                {/* 快捷键提示 */}
                <div className="mt-6 text-center text-sm text-[#94A3B8]">
                    <p>{t('review.shortcutsLine')}</p>
                </div>
            </div>
        </div>
    )
}
