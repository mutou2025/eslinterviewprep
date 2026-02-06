'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PlayCircle, CheckSquare, Square, Trash2 } from 'lucide-react'
import { MasteryBadge } from '@/components/MasteryBadge'
import { createList, getCardsByList, getListById, updateList } from '@/lib/data-service'
import type { Card, CardList } from '@/types'

export default function ListDetailPage() {
    const params = useParams()
    const router = useRouter()
    const listId = params.id as string

    const [list, setList] = useState<CardList | null>(null)
    const [cards, setCards] = useState<Card[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())

    useEffect(() => {
        async function loadData() {
            const l = await getListById(listId)
            setList(l || null)

            if (l) {
                const loadedCards = await getCardsByList(listId)
                setCards(loadedCards)
            }

            setIsLoading(false)
        }
        loadData()
    }, [listId])

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

        const tempList = await createList(`临时学习 (${selectedCards.size}题)`, Array.from(selectedCards))
        if (!tempList) return

        router.push(`/review/qa?scope=list:${tempList.id}`)
    }, [selectedCards, router])

    const removeSelected = useCallback(async () => {
        if (selectedCards.size === 0 || !list) return
        if (!confirm(`确定要从列表移除 ${selectedCards.size} 道题吗？`)) return

        const newCardIds = list.cardIds.filter(id => !selectedCards.has(id))
        await updateList(listId, { cardIds: newCardIds })

        setList(prev => prev ? { ...prev, cardIds: newCardIds } : null)
        setCards(prev => prev.filter(c => !selectedCards.has(c.id)))
        setSelectedCards(new Set())
    }, [selectedCards, list, listId])

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

    // 列表不存在
    if (!list) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">列表不存在</p>
                    <Link href="/lists" className="text-indigo-600 hover:underline">
                        返回列表页
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* 返回和标题 */}
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        href="/lists"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-600" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900">
                            {list.isDefault && '⭐ '}{list.name}
                        </h1>
                        <p className="text-gray-500">{cards.length} 道题目</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedCards.size > 0 && (
                            <>
                                <button
                                    onClick={removeSelected}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                >
                                    <Trash2 size={18} />
                                    移除 ({selectedCards.size})
                                </button>
                                <button
                                    onClick={startStudySelected}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    <PlayCircle size={18} />
                                    学习选中 ({selectedCards.size})
                                </button>
                            </>
                        )}
                        <Link
                            href={`/review/qa?scope=list:${listId}`}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <PlayCircle size={18} />
                            复习全部
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
                        <p>列表为空</p>
                        <p className="text-sm text-gray-400 mt-2">在题库页面选择题目添加到列表</p>
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
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                                                    {card.categoryL3Id}
                                                </span>
                                                <span className="text-sm font-medium text-gray-700">
                                                    {card.title}
                                                </span>
                                            </div>
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
