'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PlayCircle, CheckSquare, Square } from 'lucide-react'
import { MasteryBadge } from '@/components/MasteryBadge'
import { createList, getCardsByCategory, getCategories } from '@/lib/data-service'
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
            const cats = await getCategories()
            const cat = cats.find(c => c.id === categoryId) || null
            setCategory(cat)

            const categoryCards = await getCardsByCategory(categoryId)
            setCards(categoryCards)

            setIsLoading(false)
        }
        loadData()
    }, [categoryId])

    // 所有回调函数在 early return 之前定义
    const toggleCard = useCallback((e: React.MouseEvent, cardId: string) => {
        e.stopPropagation()
        setSelectedCards(prev => {
            const newSelected = new Set(prev)
            if (newSelected.has(cardId)) {
                newSelected.delete(cardId)
            } else {
                newSelected.add(cardId)
            }
            return newSelected
        })
    }, [])

    const toggleSelectAll = useCallback(() => {
        setSelectedCards(prev => {
            if (prev.size === cards.length) {
                return new Set()
            } else {
                return new Set(cards.map(c => c.id))
            }
        })
    }, [cards])

    const startStudySelected = useCallback(async () => {
        if (selectedCards.size === 0) return

        const list = await createList(`临时学习 (${selectedCards.size}题)`, Array.from(selectedCards))
        if (!list) return

        router.push(`/review/qa?scope=list:${list.id}`)
    }, [selectedCards, router])

    // 计算派生状态
    const isAllSelected = cards.length > 0 && selectedCards.size === cards.length

    // 加载中状态
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
        )
    }

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
                                                {card.title}
                                            </p>
                                            <p className="text-gray-500 text-sm">点击查看详情</p>
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
