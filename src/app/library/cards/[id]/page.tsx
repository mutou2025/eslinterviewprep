'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PlayCircle, Star } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { MasteryBadge } from '@/components/MasteryBadge'
import { getCardAnswer, getCardSummary, getDefaultList, updateList } from '@/lib/data-service'
import { useI18n } from '@/i18n/provider'
import { getLocalizedCardContent } from '@/i18n/content'
import type { Card } from '@/types'
import 'highlight.js/styles/github-dark.css'

export default function CardDetailPage() {
    const params = useParams()
    const router = useRouter()
    const { t, contentLanguage } = useI18n()
    const cardId = params.id as string

    const [card, setCard] = useState<Card | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isFavorite, setIsFavorite] = useState(false)
    const [isAnswerLoading, setIsAnswerLoading] = useState(false)
    const [showAnswer, setShowAnswer] = useState(false)

    useEffect(() => {
        async function loadCard() {
            const c = await getCardSummary(cardId)
            setCard(c || null)

            // 检查是否在收藏列表
            const favList = await getDefaultList()
            if (favList) setIsFavorite(favList.cardIds.includes(cardId))

            setIsLoading(false)
        }
        loadCard()
    }, [cardId])

    // 所有回调函数在 early return 之前定义
    const localized = card ? getLocalizedCardContent(card, contentLanguage) : null

    const loadAnswer = useCallback(async () => {
        if (!card || card.answer) {
            setShowAnswer(true)
            return
        }
        setIsAnswerLoading(true)
        try {
            const answer = await getCardAnswer(card.id)
            setCard(prev => prev ? { ...prev, answer: answer || undefined } : null)
            setShowAnswer(true)
        } finally {
            setIsAnswerLoading(false)
        }
    }, [card])

    const toggleFavorite = useCallback(async () => {
        const favList = await getDefaultList()
        if (!favList) return

        const newCardIds = isFavorite
            ? favList.cardIds.filter(id => id !== cardId)
            : [...favList.cardIds, cardId]

        await updateList(favList.id, { cardIds: newCardIds })
        setIsFavorite(!isFavorite)
    }, [cardId, isFavorite])

    // 加载中状态
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    // 卡片不存在
    if (!card) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">{t('card.notFound')}</p>
                    <Link href="/library" className="text-blue-600 hover:underline">
                        {t('card.backLibrary')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* 顶部导航 */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        {t('card.back')}
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleFavorite}
                            className={`p-2 rounded-lg transition-colors ${isFavorite
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                            title={isFavorite ? t('card.removeFavorite') : t('card.addFavorite')}
                        >
                            <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                        </button>
                        <Link
                            href={`/review/qa?cardId=${cardId}`}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <PlayCircle size={18} />
                            {t('card.quickReview')}
                        </Link>
                    </div>
                </div>

                {/* 题目信息 */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* 头部 */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
                                {card.categoryL3Id}
                            </span>
                            <MasteryBadge mastery={card.mastery} size="sm" />
                            {card.upstreamSource && (
                                <span className="text-xs text-gray-400">
                                    {t('card.source')}: {card.upstreamSource}
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {localized?.question || card.question}
                        </h1>
                    </div>

                    {/* 答案内容 */}
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                            {t('card.referenceAnswer')}
                        </h2>
                        {!showAnswer && (
                            <button
                                onClick={loadAnswer}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                {isAnswerLoading ? t('common.loading') : t('card.showAnswer')}
                            </button>
                        )}
                        <div className="prose prose-blue max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                            >
                                {showAnswer ? (localized?.answer || t('flashcard.noAnswer')) : ''}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* 底部信息 */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center gap-4">
                                <span>{t('card.reviewCount')}: {card.reviewCount}</span>
                                <span>{t('card.difficulty')}: {card.difficulty}</span>
                            </div>
                            <span>
                                {t('card.lastReviewed')}: {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : t('card.never')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
