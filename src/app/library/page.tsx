'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, PlayCircle, CheckSquare, Square } from 'lucide-react'
import { MasteryBadge } from '@/components/MasteryBadge'
import { db, getAllCardsWithOverrides, initializeDefaultData } from '@/lib/db'
import type { Card, Category } from '@/types'

export default function LibraryPage() {
    const router = useRouter()
    const [cards, setCards] = useState<Card[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())

    useEffect(() => {
        async function loadData() {
            await initializeDefaultData()

            const allCards = await getAllCardsWithOverrides()
            setCards(allCards)

            const cats = await db.categories.where('level').equals(3).toArray()
            setCategories(cats)

            setIsLoading(false)
        }
        loadData()
    }, [])

    // 过滤卡片
    const filteredCards = cards.filter(card => {
        const matchesSearch = searchQuery === '' ||
            card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.question.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesCategory = selectedCategory === '' ||
            card.categoryL3Id === selectedCategory

        return matchesSearch && matchesCategory
    })

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
        if (selectedCards.size === filteredCards.length) {
            setSelectedCards(new Set())
        } else {
            setSelectedCards(new Set(filteredCards.map(c => c.id)))
        }
    }

    // 开始学习选中的题目
    const startStudySelected = async () => {
        if (selectedCards.size === 0) return

        // 创建临时列表保存选中的卡片
        const listId = `temp-${Date.now()}`
        await db.lists.put({
            id: listId,
            name: `临时学习 (${selectedCards.size}题)`,
            cardIds: Array.from(selectedCards),
            createdAt: new Date(),
            updatedAt: new Date()
        })

        // 跳转到复习页面
        router.push(`/review/qa?scope=list:${listId}`)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    const isAllSelected = filteredCards.length > 0 && selectedCards.size === filteredCards.length

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                {/* 标题和操作 */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">题库</h1>
                        <p className="text-gray-500 mt-1">{cards.length} 道面试题</p>
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
                            href="/review/qa"
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <PlayCircle size={18} />
                            开始复习
                        </Link>
                    </div>
                </div>

                {/* 搜索和筛选 */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="搜索题目..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">所有分类</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* 分类快速入口 */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {categories.slice(0, 10).map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
                            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${cat.id === selectedCategory
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* 全选按钮 */}
                {filteredCards.length > 0 && (
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

                {/* 卡片列表 */}
                {filteredCards.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">暂无题目</p>
                        <p className="text-sm text-gray-400 mt-2">请运行同步脚本导入题库</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredCards.map(card => {
                            const isSelected = selectedCards.has(card.id)
                            return (
                                <div
                                    key={card.id}
                                    className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* 复选框 - 只有点击这里才选择 */}
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
                                            <p className="text-gray-600 text-sm line-clamp-2">
                                                {card.question.replace(/[#*`]/g, '').slice(0, 100)}...
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
