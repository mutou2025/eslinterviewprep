'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PlayCircle, CheckSquare, Square } from 'lucide-react'
import { MasteryBadge } from '@/components/MasteryBadge'
import { db, getCardsByCategory } from '@/lib/db'
import type { Card, Category } from '@/types'

export default function CategoryPage() {
    const params = useParams()
    const router = useRouter()
    const categoryId = params.id as string

    const [cards, setCards] = useState<Card[]>([])
    const [category, setCategory] = useState<Category | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())

    useEffect(() => {
        async function loadData() {
            const cat = await db.categories.get(categoryId)
            setCategory(cat || null)

            const categoryCards = await getCardsByCategory(categoryId)
            setCards(categoryCards)

            setIsLoading(false)
        }
        loadData()
    }, [categoryId])

    // 切换单个卡片选择
    const toggleCard = (e: React.MouseEvent, cardId: string) => {
        e.stopPropagation()
        const newSelected = new Set(selectedCards)
        if (newSelected.has(cardId)) {
            newSelected.delete(cardId)
        } else {
            newSelected.add(cardId)
        }
        setSelectedCards(newSelected)
    }

    // 全选/取消全选
    const toggleSelectAll = () => {
        if (selectedCards.size === cards.length) {
            setSelectedCards(new Set())
        } else {
            setSelectedCards(new Set(cards.map(c => c.id)))
        }
    }

    // 开始学习选中的题目
    const startStudySelected = async () => {
        if (selectedCards.size === 0) return

        const listId = `temp-${Date.now()}`
        await db.lists.put({
            id: listId,
            name: `临时学习 (${selectedCards.size}题)`,
            cardIds: Array.from(selectedCards),
            createdAt: new Date(),
            updatedAt: new Date()
        })

        router.push(`/review/qa?scope=list:${listId}`)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    const isAllSelected = cards.length > 0 && selectedCards.size === cards.length

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* 返回和标题 */}
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        href="/library"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {category?.name || categoryId}
                        </h1>
                        <p className="text-gray-500">{cards.length} 道题目</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedCards.size > 0 && (
                            <button
                                onClick={startStudySelected}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <PlayCircle size={18} />
                                学习选中 ({selectedCards.size})
                            </button>
                        )}
                        <Link
                            href={`/review/qa?scope=category:${categoryId}`}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <PlayCircle size={18} />
                            复习本分类
                        </Link>
                    </div>
                </div>

                {/* 全选按钮 */}
                {cards.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
                        >
                            {isAllSelected ? (
                                <CheckSquare size={18} className="text-indigo-600" />
                            ) : (
                                <Square size={18} />
                            )}
                            {isAllSelected ? '取消全选' : '全选'}
                        </button>
                        {selectedCards.size > 0 && (
                            <span className="text-sm text-gray-500">
                                已选择 {selectedCards.size} 题
                            </span>
                        )}
                    </div>
                )}

                {/* 题目列表 */}
                {cards.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p>该分类暂无题目</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cards.map(card => {
                            const isSelected = selectedCards.has(card.id)
                            return (
                                <div
                                    key={card.id}
                                    className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* 复选框 */}
                                        <button
                                            onClick={(e) => toggleCard(e, card.id)}
                                            className="pt-1 hover:opacity-70 transition-opacity"
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={20} className="text-indigo-600" />
                                            ) : (
                                                <Square size={20} className="text-gray-300 hover:text-gray-400" />
                                            )}
                                        </button>

                                        {/* 内容 - 点击进入详情页 */}
                                        <Link
                                            href={`/library/cards/${card.id}`}
                                            className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                                        >
                                            <p className="font-medium text-gray-900 mb-1">
                                                {card.question}
                                            </p>
                                            <p className="text-gray-500 text-sm line-clamp-2">
                                                {card.answer.replace(/[#*`\n]/g, ' ').slice(0, 120)}...
                                            </p>
                                        </Link>

                                        {/* 掌握度 */}
                                        <MasteryBadge mastery={card.mastery} size="sm" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
