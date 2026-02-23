'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpDown, Circle, Funnel, Search, PlayCircle, CheckSquare, Square } from 'lucide-react'
import { MasteryBadge } from '@/components/MasteryBadge'
import { createList, getCardSolvedProgressCached, getCardSummariesPageCached, getCategories, initializeDefaultData } from '@/lib/data-service'
import { useI18n } from '@/i18n/provider'
import { getLocalizedCardContent, getLocalizedCategoryName } from '@/i18n/content'
import { TECHNICAL_TRACKS, getTrackCategoryIds, isTechnicalTrackId } from '@/lib/library-tracks'
import type { Card, Category } from '@/types'

export default function LibraryPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { t, contentLanguage } = useI18n()
    const [cards, setCards] = useState<Card[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [solvedCount, setSolvedCount] = useState(0)
    const [sortMode, setSortMode] = useState<'default' | 'id-desc'>('default')
    const [difficultyFilter, setDifficultyFilter] = useState<'all' | Card['difficulty']>('all')
    const pageSize = 40
    const trackParam = searchParams.get('track')
    const selectedTrack = isTechnicalTrackId(trackParam) ? trackParam : 'frontend-fullstack'

    const selectedTrackConfig = useMemo(() => {
        return TECHNICAL_TRACKS.find(track => track.id === selectedTrack) ?? null
    }, [selectedTrack])
    const selectedTrackLabel = selectedTrackConfig ? t(selectedTrackConfig.labelKey) : t('library.title')

    const trackCategoryIds = useMemo(() => {
        return getTrackCategoryIds(categories, selectedTrack)
    }, [categories, selectedTrack])

    const filteredCategories = useMemo(() => {
        if (!trackCategoryIds) return categories
        const scoped = new Set(trackCategoryIds)
        return categories.filter(category => scoped.has(category.id))
    }, [categories, trackCategoryIds])
    const effectiveSelectedCategory = useMemo(() => {
        if (!selectedCategory) return ''
        return filteredCategories.some(category => category.id === selectedCategory) ? selectedCategory : ''
    }, [filteredCategories, selectedCategory])
    const visibleCards = useMemo(() => {
        let list = cards
        if (difficultyFilter !== 'all') {
            list = list.filter(card => card.difficulty === difficultyFilter)
        }

        if (sortMode === 'id-desc') {
            return [...list].sort((a, b) => b.id.localeCompare(a.id))
        }
        return list
    }, [cards, difficultyFilter, sortMode])

    useEffect(() => {
        async function loadData() {
            await initializeDefaultData()

            const cats = await getCategories(3)
            setCategories(cats)

            setIsLoading(false)
        }
        loadData()
    }, [])

    useEffect(() => {
        async function loadCards() {
            setIsLoading(true)
            const trackScopedCategoryIds = !effectiveSelectedCategory ? (trackCategoryIds ?? []) : undefined
            const queryOptions = {
                page,
                pageSize,
                search: searchQuery,
                categoryL3Id: effectiveSelectedCategory || undefined,
                categoryL3Ids: trackScopedCategoryIds
            }
            const [result, progress] = await Promise.all([
                getCardSummariesPageCached(queryOptions),
                getCardSolvedProgressCached({
                    search: searchQuery,
                    categoryL3Id: effectiveSelectedCategory || undefined,
                    categoryL3Ids: trackScopedCategoryIds
                })
            ])
            setCards(result.cards)
            setTotal(progress.total)
            setSolvedCount(progress.solved)
            setIsLoading(false)
        }
        loadCards()
    }, [page, pageSize, searchQuery, effectiveSelectedCategory, selectedTrack, trackCategoryIds])

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
        const visibleIds = visibleCards.map(card => card.id)
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedCards.has(id))

        setSelectedCards(prev => {
            const next = new Set(prev)
            if (allVisibleSelected) {
                visibleIds.forEach(id => next.delete(id))
                return next
            }
            visibleIds.forEach(id => next.add(id))
            return next
        })
    }, [selectedCards, visibleCards])

    const startStudySelected = useCallback(async () => {
        if (selectedCards.size === 0) return

        // 创建临时列表保存选中的卡片
        const list = await createList(t('library.tempListName', { count: selectedCards.size }), Array.from(selectedCards))
        if (!list) return

        // 跳转到复习页面
        router.push(`/review/qa?scope=list:${list.id}`)
    }, [selectedCards, router, t])

    // 计算派生状态
    const isAllSelected = visibleCards.length > 0 && visibleCards.every(card => selectedCards.has(card.id))
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    // 加载中状态
    if (isLoading && cards.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                {/* 顶部操作 */}
                {selectedCards.size > 0 && (
                    <div className="flex justify-end mb-5">
                        <button
                            onClick={startStudySelected}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <PlayCircle size={18} />
                            {t('library.studySelected', { count: selectedCards.size })}
                        </button>
                    </div>
                )}

                {/* 分类快速入口 */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => {
                            setSelectedCategory('')
                            setPage(1)
                        }}
                        className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${effectiveSelectedCategory === ''
                            ? 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff66]'
                            : 'bg-[#f6f8fa] text-[#57606a] border-transparent hover:bg-[#eef2f7]'
                            }`}
                    >
                        {t('library.allTrackQuestions', { track: selectedTrackLabel })}
                    </button>
                    {filteredCategories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => {
                                setSelectedCategory(cat.id === effectiveSelectedCategory ? '' : cat.id)
                                setPage(1)
                            }}
                            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${cat.id === effectiveSelectedCategory
                                ? 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff66]'
                                : 'bg-[#f6f8fa] text-[#57606a] border-transparent hover:bg-[#eef2f7]'
                                }`}
                        >
                            {getLocalizedCategoryName(cat, contentLanguage)}
                        </button>
                    ))}
                </div>

                {/* 搜索和总数 */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                        <div className="relative w-full max-w-[520px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e7781]" size={20} strokeWidth={1.9} />
                            <input
                                type="text"
                                placeholder={t('library.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setPage(1)
                                }}
                                className="w-full h-12 pl-12 pr-4 text-[16px] border-0 bg-[#f1f3f5] rounded-[999px] focus:outline-none focus:ring-2 focus:ring-[#54aeff66] placeholder:text-[#6e7781]"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setSortMode(prev => prev === 'default' ? 'id-desc' : 'default')}
                            className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors ${sortMode === 'default'
                                ? 'text-[#57606a] bg-[#f1f3f5] hover:bg-[#e7ebef]'
                                : 'text-[#0969da] bg-[#ddf4ff]'
                                }`}
                            title={sortMode === 'default' ? '排序：默认' : '排序：编号降序'}
                            aria-label={sortMode === 'default' ? '排序：默认' : '排序：编号降序'}
                        >
                            <ArrowUpDown size={18} strokeWidth={1.9} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const order: Array<'all' | Card['difficulty']> = ['all', 'easy', 'must-know', 'hard', 'hand-write']
                                const idx = order.indexOf(difficultyFilter)
                                setDifficultyFilter(order[(idx + 1) % order.length])
                            }}
                            className={`relative h-11 w-11 rounded-full flex items-center justify-center transition-colors ${difficultyFilter === 'all'
                                ? 'text-[#57606a] bg-[#f1f3f5] hover:bg-[#e7ebef]'
                                : 'text-[#0969da] bg-[#ddf4ff]'
                                }`}
                            title={difficultyFilter === 'all' ? '筛选：全部难度' : `筛选：${difficultyFilter}`}
                            aria-label={difficultyFilter === 'all' ? '筛选：全部难度' : `筛选：${difficultyFilter}`}
                        >
                            <Funnel size={18} strokeWidth={1.9} />
                            {difficultyFilter !== 'all' && (
                                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500" />
                            )}
                        </button>
                    </div>
                    <div className="shrink-0 ml-auto flex items-center gap-3 text-gray-500">
                        <div className="flex items-center gap-2">
                            <Circle size={15} />
                            <span className="text-[16px] font-semibold text-[#57606a]">
                                {t('library.solvedProgress', { solved: solvedCount, total })}
                            </span>
                        </div>
                        <Link
                            href="/review/qa"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#0969da] text-white rounded-lg hover:bg-[#0860ca] transition-colors"
                        >
                            <PlayCircle size={15} />
                            {t('library.startReview')}
                        </Link>
                    </div>
                </div>

                {/* 全选按钮 */}
                {visibleCards.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                        >
                            {isAllSelected ? (
                                <CheckSquare size={18} className="text-blue-600" />
                            ) : (
                                <Square size={18} />
                            )}
                            {isAllSelected ? t('library.deselectAll') : t('library.selectAll')}
                        </button>
                        {selectedCards.size > 0 && (
                            <span className="text-sm text-gray-500">
                                {t('library.selectedCount', { count: selectedCards.size })}
                            </span>
                        )}
                    </div>
                )}

                {/* 卡片列表 */}
                {visibleCards.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">{t('library.empty')}</p>
                        <p className="text-sm text-gray-400 mt-2">{t('library.emptyHint')}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {visibleCards.map(card => {
                            const isSelected = selectedCards.has(card.id)
                            return (
                                <div
                                    key={card.id}
                                    className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* 复选框 - 只有点击这里才选择 */}
                                        <button
                                            onClick={(e) => toggleCard(e, card.id)}
                                            className="pt-1 hover:opacity-70 transition-opacity"
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={20} className="text-blue-600" />
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
                                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                                    {card.categoryL3Id}
                                                </span>
                                                <span className="text-sm font-medium text-gray-700">
                                                    {getLocalizedCardContent(card, contentLanguage).title}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-sm">{t('library.viewDetails')}</p>
                                        </Link>

                                        {/* 掌握度 */}
                                        <MasteryBadge mastery={card.mastery} size="sm" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* 分页 */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-50"
                        >
                            {t('library.prevPage')}
                        </button>
                        <span className="text-sm text-gray-500">
                            {t('library.page', { page, total: totalPages })}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-50"
                        >
                            {t('library.nextPage')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
