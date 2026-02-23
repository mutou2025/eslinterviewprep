'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowUpDown, ChevronDown, ChevronRight, Circle, Funnel, PlayCircle, Search } from 'lucide-react'
import { getCardSummariesPageCached, getCategories, getSolvedCardIdsCached, initializeDefaultData } from '@/lib/data-service'
import { useI18n } from '@/i18n/provider'
import { getLocalizedCardContent } from '@/i18n/content'
import { TECHNICAL_TRACKS, getTrackCategoryIds, isTechnicalTrackId } from '@/lib/library-tracks'
import { buildTechnicalKnowledgeCategories, classifyCardToKnowledgePoint } from '@/lib/technical-taxonomy'
import type { Card, Category } from '@/types'

const PAGE_SIZE = 18

function compareCardId(a: Card, b: Card): number {
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
}

function getFrequencyClasses(frequency: Card['frequency']): string {
    if (frequency === 'high') return 'bg-red-100 text-red-600'
    if (frequency === 'mid') return 'bg-amber-100 text-amber-600'
    return 'bg-cyan-100 text-cyan-700'
}

function getFrequencyLabelKey(frequency: Card['frequency']): 'frequency.high' | 'frequency.mid' | 'frequency.low' {
    if (frequency === 'high') return 'frequency.high'
    if (frequency === 'mid') return 'frequency.mid'
    return 'frequency.low'
}

function extractFocusText(question: string, title: string): string {
    const normalized = (question || title)
        .replace(/^面试官[:：]\s*/i, '')
        .replace(/^说说(你对)?/i, '')
        .replace(/^你是怎么理解/i, '')
        .replace(/^如何理解/i, '')
        .replace(/^什么是/i, '')
        .trim()

    const head = normalized.split(/[？?。!！；;,，]/)[0]?.trim() || title
    return head.length > 34 ? `${head.slice(0, 34)}...` : head
}

export default function LibraryPage() {
    const searchParams = useSearchParams()
    const { t, contentLanguage } = useI18n()

    const initialSearchQuery = searchParams.get('q') || ''
    const initialCategory = searchParams.get('category') || ''
    const initialKnowledgePoint = searchParams.get('point') || ''

    const [categories, setCategories] = useState<Category[]>([])
    const [cards, setCards] = useState<Card[]>([])
    const [solvedCardIds, setSolvedCardIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
    const [selectedCategory, setSelectedCategory] = useState(initialCategory)
    const [selectedKnowledgePoint, setSelectedKnowledgePoint] = useState(initialKnowledgePoint)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [sortMode, setSortMode] = useState<'default' | 'id-desc'>('default')
    const [difficultyFilter, setDifficultyFilter] = useState<'all' | Card['difficulty']>('all')
    const [page, setPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)

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

    const knowledgeCategories = useMemo(() => {
        return buildTechnicalKnowledgeCategories(filteredCategories, {
            includeFrontendProjectCategory: selectedTrack === 'frontend-fullstack'
        })
    }, [filteredCategories, selectedTrack])

    const effectiveSelectedCategory = useMemo(() => {
        if (knowledgeCategories.length === 0) return ''
        if (knowledgeCategories.some(category => category.id === selectedCategory)) return selectedCategory
        return knowledgeCategories[0].id
    }, [knowledgeCategories, selectedCategory])

    const selectedKnowledgeCategory = useMemo(() => {
        return knowledgeCategories.find(category => category.id === effectiveSelectedCategory) || null
    }, [knowledgeCategories, effectiveSelectedCategory])

    const selectedKnowledgePoints = useMemo(() => {
        return selectedKnowledgeCategory?.points ?? []
    }, [selectedKnowledgeCategory])

    const effectiveSelectedKnowledgePoint = useMemo(() => {
        if (!selectedKnowledgePoint) return ''
        return selectedKnowledgePoints.some(point => point.id === selectedKnowledgePoint) ? selectedKnowledgePoint : ''
    }, [selectedKnowledgePoint, selectedKnowledgePoints])

    const cardsWithKnowledge = useMemo(() => {
        return cards.map(card => ({
            card,
            knowledgePointId: classifyCardToKnowledgePoint(card, selectedKnowledgePoints),
        }))
    }, [cards, selectedKnowledgePoints])

    const knowledgePointCounts = useMemo(() => {
        const counts = new Map<string, number>()
        for (const item of cardsWithKnowledge) {
            counts.set(item.knowledgePointId, (counts.get(item.knowledgePointId) || 0) + 1)
        }
        return counts
    }, [cardsWithKnowledge])

    const filteredCards = useMemo(() => {
        let list = cardsWithKnowledge

        if (effectiveSelectedKnowledgePoint) {
            list = list.filter(item => item.knowledgePointId === effectiveSelectedKnowledgePoint)
        }

        if (difficultyFilter !== 'all') {
            list = list.filter(item => item.card.difficulty === difficultyFilter)
        }

        const sorted = list
            .map(item => item.card)
            .sort((a, b) => (sortMode === 'id-desc' ? compareCardId(b, a) : compareCardId(a, b)))

        return sorted
    }, [cardsWithKnowledge, effectiveSelectedKnowledgePoint, difficultyFilter, sortMode])

    const solvedCount = useMemo(() => {
        let count = 0
        for (const card of filteredCards) {
            if (solvedCardIds.has(card.id)) count += 1
        }
        return count
    }, [filteredCards, solvedCardIds])

    const total = filteredCards.length
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const visibleCards = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return filteredCards.slice(start, start + PAGE_SIZE)
    }, [filteredCards, currentPage])

    useEffect(() => {
        async function loadData() {
            await initializeDefaultData()
            const level3Categories = await getCategories(3)
            setCategories(level3Categories)
            setIsLoading(false)
        }
        loadData()
    }, [])

    useEffect(() => {
        async function loadCards() {
            if (!effectiveSelectedCategory) {
                setCards([])
                return
            }

            setIsLoading(true)
            const [result, solvedSet] = await Promise.all([
                getCardSummariesPageCached({
                    page: 1,
                    pageSize: 5000,
                    search: searchQuery,
                    categoryL3Id: effectiveSelectedCategory,
                }),
                getSolvedCardIdsCached(),
            ])

            setCards(result.cards)
            setSolvedCardIds(solvedSet)
            setIsLoading(false)
        }

        loadCards()
    }, [effectiveSelectedCategory, searchQuery, selectedTrack])

    const currentCategoryName = selectedKnowledgeCategory
        ? (contentLanguage === 'en-US' ? selectedKnowledgeCategory.nameEn : selectedKnowledgeCategory.name)
        : selectedTrackLabel

    const currentKnowledgePointName = effectiveSelectedKnowledgePoint
        ? selectedKnowledgePoints.find(point => point.id === effectiveSelectedKnowledgePoint)
        : null

    if (isLoading && categories.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="bg-[#F8FAFC]">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] lg:divide-x lg:divide-[#E2E8F0]">
                <aside className="bg-[#F9FBFF] p-3 lg:min-h-[calc(100vh-76px)]">
                    <div className="px-2 pt-1 pb-2">
                        <h2 className="text-sm font-semibold text-[#475569]">
                            {t('library.trackCategoryPanelTitle', { track: selectedTrackLabel })}
                        </h2>
                    </div>

                    {knowledgeCategories.length === 0 ? (
                        <div className="px-2 py-6 text-sm text-[#94A3B8]">{t('library.empty')}</div>
                    ) : (
                        <div className="space-y-1">
                            {knowledgeCategories.map(category => {
                                const isExpanded = expandedCategories.has(category.id) || (expandedCategories.size === 0 && category.id === effectiveSelectedCategory)
                                const isCategorySelected = effectiveSelectedCategory === category.id
                                const categoryName = contentLanguage === 'en-US' ? category.nameEn : category.name

                                return (
                                    <div key={category.id} className="rounded-xl">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setExpandedCategories(prev => {
                                                        const next = new Set(prev)
                                                        if (next.has(category.id)) {
                                                            next.delete(category.id)
                                                        } else {
                                                            next.add(category.id)
                                                        }
                                                        return next
                                                    })
                                                }}
                                                className="h-8 w-8 rounded-md flex items-center justify-center text-[#475569] hover:bg-[#F1F5F9]"
                                                aria-label={isExpanded ? 'collapse' : 'expand'}
                                            >
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedCategory(category.id)
                                                    setSelectedKnowledgePoint('')
                                                    setPage(1)
                                                    setExpandedCategories(prev => new Set(prev).add(category.id))
                                                }}
                                                className={`flex-1 rounded-lg px-2 py-1.5 text-left text-[15px] transition-colors ${isCategorySelected
                                                    ? 'text-[#0F172A] font-semibold bg-[#F8FAFC]'
                                                    : 'text-[#475569] hover:bg-[#F8FAFC]'
                                                    }`}
                                            >
                                                {categoryName}
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-1 ml-9 space-y-1">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCategory(category.id)
                                                        setSelectedKnowledgePoint('')
                                                        setPage(1)
                                                    }}
                                                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${effectiveSelectedCategory === category.id && effectiveSelectedKnowledgePoint === ''
                                                        ? 'bg-[#DBEAFE] text-[#2563EB]'
                                                        : 'text-[#475569] hover:bg-[#F8FAFC]'
                                                        }`}
                                                >
                                                    {t('library.allInCategory', { category: categoryName })}
                                                </button>

                                                {category.points.map(point => {
                                                    const pointName = contentLanguage === 'en-US' ? point.nameEn : point.name
                                                    const isSelected = effectiveSelectedCategory === category.id && effectiveSelectedKnowledgePoint === point.id
                                                    const count = category.id === effectiveSelectedCategory ? (knowledgePointCounts.get(point.id) || 0) : null

                                                    return (
                                                        <button
                                                            key={point.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCategory(category.id)
                                                                setSelectedKnowledgePoint(point.id)
                                                                setPage(1)
                                                            }}
                                                            className={`w-full rounded-md px-2 py-1.5 text-left text-sm flex items-center justify-between gap-2 transition-colors ${isSelected
                                                                ? 'bg-[#DBEAFE] text-[#2563EB]'
                                                                : 'text-[#475569] hover:bg-[#F8FAFC]'
                                                                }`}
                                                        >
                                                            <span className="truncate">{pointName}</span>
                                                            {count !== null && (
                                                                <span className="text-xs opacity-70">{count}</span>
                                                            )}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </aside>

                <section className="min-w-0 bg-white px-6 py-5 lg:px-8 lg:py-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-1.5 flex-1 min-w-[260px]">
                            <div className="relative w-full max-w-[280px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} strokeWidth={2} />
                                <input
                                    type="text"
                                    placeholder={t('library.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value)
                                        setPage(1)
                                    }}
                                    className="w-full h-[30px] pl-9 pr-3 text-[12px] border border-[#CBD5E1] bg-[#F1F5F9] rounded-[999px] focus:outline-none focus:ring-2 focus:ring-[#93C5FD66] focus:border-[#2563EB] placeholder:text-[#94A3B8]"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSortMode(prev => (prev === 'default' ? 'id-desc' : 'default'))
                                    setPage(1)
                                }}
                                className={`h-[30px] w-[30px] rounded-full flex items-center justify-center transition-colors ${sortMode === 'default'
                                    ? 'text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0]'
                                    : 'text-[#2563EB] bg-[#DBEAFE]'
                                    }`}
                                title={sortMode === 'default' ? t('library.sortDefault') : t('library.sortIdDesc')}
                                aria-label={sortMode === 'default' ? t('library.sortDefault') : t('library.sortIdDesc')}
                            >
                                <ArrowUpDown size={13} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const order: Array<'all' | Card['difficulty']> = ['all', 'easy', 'must-know', 'hard', 'hand-write']
                                    const idx = order.indexOf(difficultyFilter)
                                    setDifficultyFilter(order[(idx + 1) % order.length])
                                    setPage(1)
                                }}
                                className={`relative h-[30px] w-[30px] rounded-full flex items-center justify-center transition-colors ${difficultyFilter === 'all'
                                    ? 'text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0]'
                                    : 'text-[#2563EB] bg-[#DBEAFE]'
                                    }`}
                                title={difficultyFilter === 'all' ? t('library.filterAllDifficulty') : `筛选：${difficultyFilter}`}
                                aria-label={difficultyFilter === 'all' ? t('library.filterAllDifficulty') : `筛选：${difficultyFilter}`}
                            >
                                <Funnel size={13} strokeWidth={2} />
                                {difficultyFilter !== 'all' && (
                                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                                )}
                            </button>
                        </div>

                        <div className="shrink-0 ml-auto flex items-center gap-3 text-[#475569]">
                            <div className="flex items-center gap-2">
                                <Circle size={15} />
                                <span className="text-[16px] font-semibold">
                                    {t('library.solvedProgress', { solved: solvedCount, total })}
                                </span>
                            </div>
                            <Link
                                href="/review/qa"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                            >
                                <PlayCircle size={15} />
                                {t('library.startReview')}
                            </Link>
                        </div>
                    </div>

                    <div className="mb-4 px-1 text-sm text-[#94A3B8]">
                        {currentKnowledgePointName
                            ? `${currentCategoryName} / ${contentLanguage === 'en-US' ? currentKnowledgePointName.nameEn : currentKnowledgePointName.name}`
                            : t('library.allInCategory', { category: currentCategoryName })}
                    </div>

                    {isLoading ? (
                        <div className="py-14 flex justify-center">
                            <div className="animate-spin w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full" />
                        </div>
                    ) : visibleCards.length === 0 ? (
                        <div className="text-center py-14">
                            <p className="text-[#475569]">{t('library.empty')}</p>
                            <p className="text-sm text-[#94A3B8] mt-2">{t('library.emptyHint')}</p>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {visibleCards.map((card, index) => {
                                const localized = getLocalizedCardContent(card, contentLanguage)
                                const serial = (currentPage - 1) * PAGE_SIZE + index + 1
                                const focusText = extractFocusText(localized.question, localized.title)
                                const rowBgClass = index % 2 === 0
                                    ? 'bg-[#F8FAFC] hover:bg-[#EFF6FF]'
                                    : 'bg-transparent hover:bg-[#F8FAFC]'
                                const detailParams = new URLSearchParams()
                                detailParams.set('track', selectedTrack)
                                if (effectiveSelectedCategory) detailParams.set('category', effectiveSelectedCategory)
                                if (effectiveSelectedKnowledgePoint) detailParams.set('point', effectiveSelectedKnowledgePoint)
                                if (searchQuery.trim()) detailParams.set('q', searchQuery.trim())
                                const detailHref = `/library/cards/${card.id}${detailParams.toString() ? `?${detailParams.toString()}` : ''}`

                                return (
                                    <Link
                                        key={card.id}
                                        href={detailHref}
                                        className={`block rounded-lg px-4 py-2 transition-colors ${rowBgClass}`}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="text-[13px] md:text-[14px] leading-5 font-normal text-[#0F172A]">
                                                    <span>{serial}. </span>
                                                    <span>{focusText}</span>
                                                </p>
                                            </div>
                                            <div className="shrink-0">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getFrequencyClasses(card.frequency)}`}>
                                                    {t(getFrequencyLabelKey(card.frequency))}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <button
                                onClick={() => setPage(prev => Math.max(1, Math.min(totalPages, prev) - 1))}
                                disabled={currentPage <= 1}
                                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] disabled:opacity-50"
                            >
                                {t('library.prevPage')}
                            </button>
                            <span className="text-sm text-[#94A3B8]">{t('library.page', { page: currentPage, total: totalPages })}</span>
                            <button
                                onClick={() => setPage(prev => Math.min(totalPages, Math.min(totalPages, prev) + 1))}
                                disabled={currentPage >= totalPages}
                                className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] disabled:opacity-50"
                            >
                                {t('library.nextPage')}
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
