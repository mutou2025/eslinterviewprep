'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PlayCircle, Edit, Star } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { MasteryBadge } from '@/components/MasteryBadge'
import { db, getCardWithOverride } from '@/lib/db'
import type { Card } from '@/types'
import 'highlight.js/styles/github-dark.css'

export default function CardDetailPage() {
    const params = useParams()
    const router = useRouter()
    const cardId = params.id as string

    const [card, setCard] = useState<Card | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isFavorite, setIsFavorite] = useState(false)

    useEffect(() => {
        async function loadCard() {
            const c = await getCardWithOverride(cardId)
            setCard(c || null)

            // 检查是否在收藏列表
            const favList = await db.lists.get('favorites')
            if (favList) {
                setIsFavorite(favList.cardIds.includes(cardId))
            }

            setIsLoading(false)
        }
        loadCard()
    }, [cardId])

    const toggleFavorite = async () => {
        const favList = await db.lists.get('favorites')
        if (!favList) return

        const newCardIds = isFavorite
            ? favList.cardIds.filter(id => id !== cardId)
            : [...favList.cardIds, cardId]

        await db.lists.update('favorites', { cardIds: newCardIds, updatedAt: new Date() })
        setIsFavorite(!isFavorite)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!card) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">题目不存在</p>
                    <Link href="/library" className="text-indigo-600 hover:underline">
                        返回题库
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
                        返回
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleFavorite}
                            className={`p-2 rounded-lg transition-colors ${isFavorite
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                            title={isFavorite ? '取消收藏' : '加入收藏'}
                        >
                            <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                        </button>
                        <Link
                            href={`/review/qa?cardId=${cardId}`}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <PlayCircle size={18} />
                            速记卡模式
                        </Link>
                    </div>
                </div>

                {/* 题目信息 */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* 头部 */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full">
                                {card.categoryL3Id}
                            </span>
                            <MasteryBadge mastery={card.mastery} size="sm" />
                            {card.upstreamSource && (
                                <span className="text-xs text-gray-400">
                                    来源: {card.upstreamSource}
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {card.question}
                        </h1>
                    </div>

                    {/* 答案内容 */}
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <span className="w-1 h-5 bg-indigo-600 rounded-full"></span>
                            参考答案
                        </h2>
                        <div className="prose prose-indigo max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                            >
                                {card.answer}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* 底部信息 */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center gap-4">
                                <span>复习次数: {card.reviewCount}</span>
                                <span>难度: {card.difficulty}</span>
                            </div>
                            <span>
                                上次复习: {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : '从未'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
