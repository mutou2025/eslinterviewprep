'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpDown, CheckCircle2, ChevronDown, ChevronRight, Circle, Funnel, PlayCircle, Search } from 'lucide-react'
import { getCardSummariesPageCached, getCategories, getSolvedCardIdsCached, initializeDefaultData } from '@/lib/data-service'
import { useI18n } from '@/i18n/provider'
import { getLocalizedCardContent } from '@/i18n/content'
import { TECHNICAL_TRACKS, getTrackCategoryIds, isTechnicalTrackId } from '@/lib/library-tracks'
import { buildTechnicalKnowledgeCategories, classifyCardToKnowledgePoint } from '@/lib/technical-taxonomy'
import type { Card, Category } from '@/types'

const PAGE_SIZE = 40

function parseCsvParam(value: string | null): string[] {
    if (!value) return []
    return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
}

function uniqueByOrder<T extends string>(items: T[]): T[] {
    const seen = new Set<string>()
    const result: T[] = []
    for (const item of items) {
        if (seen.has(item)) continue
        seen.add(item)
        result.push(item)
    }
    return result
}

function compareCardId(a: Card, b: Card): number {
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
}

function getDifficultyLabelKey(difficulty: Card['difficulty']): 'difficulty.easy' | 'difficulty.mustKnow' | 'difficulty.hard' | 'difficulty.handWrite' {
    if (difficulty === 'easy') return 'difficulty.easy'
    if (difficulty === 'must-know') return 'difficulty.mustKnow'
    if (difficulty === 'hard') return 'difficulty.hard'
    return 'difficulty.handWrite'
}

function getDifficultyClasses(difficulty: Card['difficulty']): string {
    if (difficulty === 'easy') return 'text-[#0D9488]'
    if (difficulty === 'must-know') return 'text-[#F59E0B]'
    if (difficulty === 'hard') return 'text-[#EF4444]'
    return 'text-[#2563EB]'
}

function getFrequencyLabelKey(frequency: Card['frequency']): 'frequency.high' | 'frequency.mid' | 'frequency.low' {
    if (frequency === 'high') return 'frequency.high'
    if (frequency === 'mid') return 'frequency.mid'
    return 'frequency.low'
}

function getFrequencyClasses(frequency: Card['frequency']): string {
    if (frequency === 'high') return 'text-[#EA580C] bg-[#FFF7ED] border-[#FDBA74]'
    if (frequency === 'mid') return 'text-[#CA8A04] bg-[#FEFCE8] border-[#FDE047]'
    return 'text-[#2563EB] bg-[#EFF6FF] border-[#BFDBFE]'
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
    return head.length > 52 ? `${head.slice(0, 52)}...` : head
}

export default function LibraryPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { t, contentLanguage } = useI18n()

    const initialSearchQuery = searchParams.get('q') || ''
    const initialCategory = searchParams.get('category') || ''
    const initialKnowledgePoint = searchParams.get('point') || ''
    const initialFrequencyFiltersFromQuery = parseCsvParam(searchParams.get('freq'))
    const initialKnowledgePointFiltersFromQuery = parseCsvParam(searchParams.get('points'))
    const initialKnowledgePointFilters = uniqueByOrder([
        ...initialKnowledgePointFiltersFromQuery,
        ...(initialKnowledgePoint ? [initialKnowledgePoint] : []),
    ])

    const [categories, setCategories] = useState<Category[]>([])
    const [cards, setCards] = useState<Card[]>([])
    const [solvedCardIds, setSolvedCardIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState(initialSearchQuery)
    const [selectedCategory, setSelectedCategory] = useState(initialCategory)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
    const [hasTouchedExpansion, setHasTouchedExpansion] = useState(false)
    const [sortMode, setSortMode] = useState<'default' | 'id-desc'>('default')
    const [frequencyFilters, setFrequencyFilters] = useState<Card['frequency'][]>(
        uniqueByOrder(initialFrequencyFiltersFromQuery.filter(
            item => item === 'high' || item === 'mid' || item === 'low'
        ) as Card['frequency'][])
    )
    const [knowledgePointFilters, setKnowledgePointFilters] = useState<string[]>(initialKnowledgePointFilters)
    const [draftFrequencyFilters, setDraftFrequencyFilters] = useState<Card['frequency'][]>([])
    const [draftKnowledgePointFilters, setDraftKnowledgePointFilters] = useState<string[]>([])
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [openFilterDropdown, setOpenFilterDropdown] = useState<'frequency' | 'knowledgePoint' | null>(null)
    const [page, setPage] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const filterPanelRef = useRef<HTMLDivElement | null>(null)

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
        if (!selectedCategory) return ''
        return knowledgeCategories.some(category => category.id === selectedCategory) ? selectedCategory : ''
    }, [knowledgeCategories, selectedCategory])

    const defaultExpandedCategoryId = useMemo(() => {
        if (selectedCategory && knowledgeCategories.some(category => category.id === selectedCategory)) {
            return selectedCategory
        }
        return knowledgeCategories[0]?.id || ''
    }, [knowledgeCategories, selectedCategory])

    const selectedKnowledgeCategory = useMemo(() => {
        return knowledgeCategories.find(category => category.id === effectiveSelectedCategory) || null
    }, [knowledgeCategories, effectiveSelectedCategory])

    const allKnowledgePoints = useMemo(() => {
        const seen = new Set<string>()
        const points: Array<{ id: string; name: string; nameEn: string }> = []
        for (const category of knowledgeCategories) {
            for (const point of category.points) {
                if (seen.has(point.id)) continue
                seen.add(point.id)
                points.push(point)
            }
        }
        return points
    }, [knowledgeCategories])

    const activeKnowledgePoints = useMemo(() => {
        return selectedKnowledgeCategory?.points ?? allKnowledgePoints
    }, [selectedKnowledgeCategory, allKnowledgePoints])

    const knowledgePointsByCategory = useMemo(() => {
        return new Map(knowledgeCategories.map(category => [category.id, category.points]))
    }, [knowledgeCategories])

    const effectiveKnowledgePointFilters = useMemo(() => {
        const validPointIds = new Set(activeKnowledgePoints.map(point => point.id))
        return knowledgePointFilters.filter(id => validPointIds.has(id))
    }, [knowledgePointFilters, activeKnowledgePoints])

    const effectiveDraftKnowledgePointFilters = useMemo(() => {
        const validPointIds = new Set(activeKnowledgePoints.map(point => point.id))
        return draftKnowledgePointFilters.filter(id => validPointIds.has(id))
    }, [draftKnowledgePointFilters, activeKnowledgePoints])

    const cardsWithKnowledge = useMemo(() => {
        return cards.map(card => ({
            card,
            knowledgePointId: classifyCardToKnowledgePoint(
                card,
                knowledgePointsByCategory.get(card.categoryL3Id) ?? activeKnowledgePoints
            ),
        }))
    }, [cards, knowledgePointsByCategory, activeKnowledgePoints])

    const knowledgePointCounts = useMemo(() => {
        const counts = new Map<string, number>()
        for (const item of cardsWithKnowledge) {
            counts.set(item.knowledgePointId, (counts.get(item.knowledgePointId) || 0) + 1)
        }
        return counts
    }, [cardsWithKnowledge])

    const filteredCards = useMemo(() => {
        let list = cardsWithKnowledge

        if (effectiveKnowledgePointFilters.length > 0) {
            const selectedPoints = new Set(effectiveKnowledgePointFilters)
            list = list.filter(item => selectedPoints.has(item.knowledgePointId))
        }

        if (frequencyFilters.length > 0) {
            const selectedFrequencies = new Set(frequencyFilters)
            list = list.filter(item => selectedFrequencies.has(item.card.frequency))
        }

        const sorted = list
            .map(item => item.card)
            .sort((a, b) => (sortMode === 'id-desc' ? compareCardId(b, a) : compareCardId(a, b)))

        return sorted
    }, [cardsWithKnowledge, effectiveKnowledgePointFilters, frequencyFilters, sortMode])

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
            if (!trackCategoryIds || trackCategoryIds.length === 0) {
                setCards([])
                return
            }

            setIsLoading(true)
            const queryOptions: {
                page: number
                pageSize: number
                search: string
                categoryL3Id?: string
                categoryL3Ids?: string[]
            } = {
                page: 1,
                pageSize: 5000,
                search: searchQuery,
            }
            if (effectiveSelectedCategory) {
                queryOptions.categoryL3Id = effectiveSelectedCategory
            } else {
                queryOptions.categoryL3Ids = trackCategoryIds
            }
            const [result, solvedSet] = await Promise.all([
                getCardSummariesPageCached(queryOptions),
                getSolvedCardIdsCached(),
            ])

            setCards(result.cards)
            setSolvedCardIds(solvedSet)
            setIsLoading(false)
        }

        loadCards()
    }, [effectiveSelectedCategory, searchQuery, selectedTrack, trackCategoryIds])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!isFilterOpen) return
            const target = event.target as Node
            if (filterPanelRef.current && !filterPanelRef.current.contains(target)) {
                setDraftFrequencyFilters(frequencyFilters)
                setDraftKnowledgePointFilters(effectiveKnowledgePointFilters)
                setIsFilterOpen(false)
                setOpenFilterDropdown(null)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isFilterOpen, frequencyFilters, effectiveKnowledgePointFilters])

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())

        if (frequencyFilters.length > 0) {
            params.set('freq', frequencyFilters.join(','))
        } else {
            params.delete('freq')
        }

        if (effectiveKnowledgePointFilters.length > 0) {
            params.set('points', effectiveKnowledgePointFilters.join(','))
        } else {
            params.delete('points')
        }

        if (effectiveKnowledgePointFilters.length === 1) {
            params.set('point', effectiveKnowledgePointFilters[0])
        } else {
            params.delete('point')
        }

        const nextQuery = params.toString()
        const currentQuery = searchParams.toString()
        if (nextQuery !== currentQuery) {
            router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
        }
    }, [frequencyFilters, effectiveKnowledgePointFilters, pathname, router, searchParams])

    const solvedRate = total > 0 ? Math.round((solvedCount / total) * 100) : 0

    const draftFrequencyOptionCounts = useMemo(() => {
        const counts: Record<Card['frequency'], number> = { high: 0, mid: 0, low: 0 }
        let list = cardsWithKnowledge
        if (effectiveDraftKnowledgePointFilters.length > 0) {
            const selectedPoints = new Set(effectiveDraftKnowledgePointFilters)
            list = list.filter(item => selectedPoints.has(item.knowledgePointId))
        }
        for (const item of list) {
            counts[item.card.frequency] += 1
        }
        return counts
    }, [cardsWithKnowledge, effectiveDraftKnowledgePointFilters])

    const frequencyCounts = useMemo(() => {
        const counts: Record<Card['frequency'], number> = { high: 0, mid: 0, low: 0 }
        for (const card of filteredCards) {
            counts[card.frequency] += 1
        }
        return counts
    }, [filteredCards])

    const topKnowledgePoints = useMemo(() => {
        return activeKnowledgePoints
            .map(point => ({
                id: point.id,
                name: contentLanguage === 'en-US' ? point.nameEn : point.name,
                count: knowledgePointCounts.get(point.id) || 0,
            }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
    }, [activeKnowledgePoints, contentLanguage, knowledgePointCounts])

    const selectedKnowledgePointChips = effectiveKnowledgePointFilters
        .map(pointId => {
            const point = activeKnowledgePoints.find(item => item.id === pointId)
            if (!point) return null
            return {
                id: point.id,
                name: contentLanguage === 'en-US' ? point.nameEn : point.name,
                count: knowledgePointCounts.get(point.id) || 0,
            }
        })
        .filter((item): item is { id: string, name: string, count: number } => item !== null)

    const selectedDraftKnowledgePointChips = effectiveDraftKnowledgePointFilters
        .map(pointId => {
            const point = activeKnowledgePoints.find(item => item.id === pointId)
            if (!point) return null
            return {
                id: point.id,
                name: contentLanguage === 'en-US' ? point.nameEn : point.name,
                count: knowledgePointCounts.get(point.id) || 0,
            }
        })
        .filter((item): item is { id: string, name: string, count: number } => item !== null)

    const activeFilterCount = frequencyFilters.length + effectiveKnowledgePointFilters.length

    const toggleFrequencyFilter = (frequency: Card['frequency']) => {
        setFrequencyFilters(prev => {
            if (prev.includes(frequency)) return prev.filter(item => item !== frequency)
            return [...prev, frequency]
        })
        setPage(1)
    }

    const applyKnowledgePointFilters = (nextFilters: string[]) => {
        setKnowledgePointFilters(nextFilters)
        setPage(1)
    }

    const toggleKnowledgePointFilter = (pointId: string) => {
        applyKnowledgePointFilters(
            effectiveKnowledgePointFilters.includes(pointId)
                ? effectiveKnowledgePointFilters.filter(item => item !== pointId)
                : [...effectiveKnowledgePointFilters, pointId]
        )
    }

    const toggleDraftFrequencyFilter = (frequency: Card['frequency']) => {
        setDraftFrequencyFilters(prev => {
            if (prev.includes(frequency)) return prev.filter(item => item !== frequency)
            return [...prev, frequency]
        })
    }

    const toggleDraftKnowledgePointFilter = (pointId: string) => {
        setDraftKnowledgePointFilters(prev => {
            if (prev.includes(pointId)) return prev.filter(item => item !== pointId)
            return [...prev, pointId]
        })
    }

    const openFilterPanel = () => {
        setDraftFrequencyFilters(frequencyFilters)
        setDraftKnowledgePointFilters(effectiveKnowledgePointFilters)
        setOpenFilterDropdown(null)
        setIsFilterOpen(true)
    }

    const closeFilterPanel = () => {
        setIsFilterOpen(false)
        setOpenFilterDropdown(null)
    }

    const cancelFilterChanges = () => {
        setDraftFrequencyFilters(frequencyFilters)
        setDraftKnowledgePointFilters(effectiveKnowledgePointFilters)
        closeFilterPanel()
    }

    const applyFilterChanges = () => {
        setFrequencyFilters(uniqueByOrder(draftFrequencyFilters))
        applyKnowledgePointFilters(uniqueByOrder(effectiveDraftKnowledgePointFilters))
        closeFilterPanel()
    }

    const resetAllFilters = () => {
        setFrequencyFilters([])
        applyKnowledgePointFilters([])
    }

    const resetDraftFilters = () => {
        setDraftFrequencyFilters([])
        setDraftKnowledgePointFilters([])
    }

    if (isLoading && categories.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="min-h-[calc(100vh-76px)] bg-[radial-gradient(circle_at_top_left,#EAF2FF_0%,#F8FAFC_45%,#F8FAFC_100%)]">
            <div className="px-3 py-4 md:px-4 lg:px-6 lg:py-6">
                <div className="mx-auto max-w-[1400px] overflow-hidden rounded-3xl border border-[#D6E4FF] bg-white/85 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] lg:divide-x lg:divide-[#E2E8F0]">
                    <aside className="bg-gradient-to-b from-[#F4F8FF] to-[#FFFFFF] p-3 lg:min-h-[calc(100vh-124px)]">
                        <div className="mb-2 px-2 py-2">
                            <h2 className="text-sm font-semibold text-[#334155]">
                                {t('library.trackCategoryPanelTitle', { track: selectedTrackLabel })}
                            </h2>
                        </div>
                        {knowledgeCategories.length === 0 ? (
                            <div className="px-2 py-6 text-sm text-[#94A3B8]">{t('library.empty')}</div>
                        ) : (
                            <div className="space-y-1.5">
                                {knowledgeCategories.map(category => {
                                    const isExpanded = expandedCategories.has(category.id) || (!hasTouchedExpansion && category.id === defaultExpandedCategoryId)
                                    const isCategorySelected = effectiveSelectedCategory === category.id
                                    const categoryName = contentLanguage === 'en-US' ? category.nameEn : category.name

                                    return (
                                        <div key={category.id} className="rounded-xl border border-transparent bg-white/70 p-1">
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentlyExpanded = expandedCategories.has(category.id) || (!hasTouchedExpansion && category.id === defaultExpandedCategoryId)
                                                        const next = new Set(expandedCategories)
                                                        if (currentlyExpanded) {
                                                            next.delete(category.id)
                                                        } else {
                                                            next.add(category.id)
                                                        }
                                                        setHasTouchedExpansion(true)
                                                        setExpandedCategories(next)
                                                        if (next.size === 0) {
                                                            setSelectedCategory('')
                                                            applyKnowledgePointFilters([])
                                                        }
                                                    }}
                                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#EAF2FF]"
                                                    aria-label={isExpanded ? 'collapse' : 'expand'}
                                                >
                                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCategory(category.id)
                                                        applyKnowledgePointFilters([])
                                                        setHasTouchedExpansion(true)
                                                        setExpandedCategories(prev => {
                                                            const next = new Set(prev)
                                                            next.add(category.id)
                                                            return next
                                                        })
                                                    }}
                                                    className={`flex-1 rounded-lg px-2.5 py-1.5 text-left text-[15px] transition-colors ${isCategorySelected
                                                        ? 'text-[#0F172A] font-semibold bg-[#EAF2FF]'
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
                                                            applyKnowledgePointFilters([])
                                                        }}
                                                        className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${effectiveSelectedCategory === category.id && effectiveKnowledgePointFilters.length === 0
                                                            ? 'bg-[#DBEAFE] text-[#2563EB]'
                                                            : 'text-[#475569] hover:bg-[#F8FAFC]'
                                                            }`}
                                                    >
                                                        {t('library.allInCategory', { category: categoryName })}
                                                    </button>

                                                    {category.points.map(point => {
                                                        const pointName = contentLanguage === 'en-US' ? point.nameEn : point.name
                                                        const isSelected = effectiveSelectedCategory === category.id && effectiveKnowledgePointFilters.includes(point.id)
                                                        const count = category.id === effectiveSelectedCategory ? (knowledgePointCounts.get(point.id) || 0) : null

                                                        return (
                                                            <button
                                                                key={point.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedCategory(category.id)
                                                                    applyKnowledgePointFilters([point.id])
                                                                }}
                                                                className={`w-full rounded-md px-2 py-1.5 text-left text-sm flex items-center justify-between gap-2 transition-colors ${isSelected
                                                                    ? 'bg-[#DBEAFE] text-[#2563EB]'
                                                                    : 'text-[#475569] hover:bg-[#F8FAFC]'
                                                                    }`}
                                                            >
                                                                <span className="truncate">{pointName}</span>
                                                                {count !== null && (
                                                                    <span className="inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-white/80 text-[11px] opacity-90">{count}</span>
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

                    <section className="min-w-0 bg-[#FCFDFF] px-4 py-4 lg:px-6 lg:py-5">
                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-4">
                            <div className="min-w-0">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                                    <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                                        <div className="relative w-full max-w-[320px]">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} strokeWidth={2} />
                                            <input
                                                type="text"
                                                placeholder={t('library.searchPlaceholder')}
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value)
                                                    setPage(1)
                                                }}
                                                className="w-full h-10 pl-10 pr-3 text-sm border border-[#CBD5E1] bg-[#F8FAFC] rounded-[999px] focus:outline-none focus:ring-2 focus:ring-[#93C5FD66] focus:border-[#2563EB] placeholder:text-[#94A3B8]"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSortMode(prev => (prev === 'default' ? 'id-desc' : 'default'))
                                                setPage(1)
                                            }}
                                            className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${sortMode === 'default'
                                                ? 'text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0]'
                                                : 'text-[#2563EB] bg-[#DBEAFE]'
                                                }`}
                                            title={sortMode === 'default' ? t('library.sortDefault') : t('library.sortIdDesc')}
                                            aria-label={sortMode === 'default' ? t('library.sortDefault') : t('library.sortIdDesc')}
                                        >
                                            <ArrowUpDown size={15} strokeWidth={2} />
                                        </button>
                                        <div ref={filterPanelRef} className="relative">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isFilterOpen) {
                                                        cancelFilterChanges()
                                                    } else {
                                                        openFilterPanel()
                                                    }
                                                }}
                                                className={`relative h-10 w-10 rounded-full flex items-center justify-center transition-colors ${isFilterOpen || activeFilterCount > 0
                                                    ? 'text-[#2563EB] bg-[#DBEAFE]'
                                                    : 'text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0]'
                                                    }`}
                                                aria-label={t('library.filterTitle')}
                                                title={t('library.filterTitle')}
                                            >
                                                <Funnel size={16} strokeWidth={2} />
                                                {activeFilterCount > 0 && (
                                                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
                                                )}
                                            </button>

                                            {isFilterOpen && (
                                                <div className="absolute left-0 top-12 z-30 w-[460px] rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <p className="text-base font-semibold text-[#334155]">{t('library.filterConditions')}</p>
                                                        <button
                                                            type="button"
                                                            onClick={resetDraftFilters}
                                                            className="text-xs text-[#64748B] hover:text-[#334155]"
                                                        >
                                                            {t('library.filterReset')}
                                                        </button>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3">
                                                            <p className="pt-2 text-sm font-medium text-[#475569]">{t('library.filterFrequency')}</p>
                                                            <div className="space-y-2">
                                                                <div className="relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOpenFilterDropdown(prev => (prev === 'frequency' ? null : 'frequency'))}
                                                                        className="flex h-10 w-full items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm text-[#334155] hover:border-[#93C5FD]"
                                                                    >
                                                                        <span>{draftFrequencyFilters.length > 0 ? t('library.filterSelectedCount', { count: draftFrequencyFilters.length }) : t('library.filterFrequencyPlaceholder')}</span>
                                                                        <ChevronDown size={16} className="text-[#94A3B8]" />
                                                                    </button>
                                                                    {openFilterDropdown === 'frequency' && (
                                                                        <div className="absolute left-0 top-11 z-10 w-full rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-[0_8px_20px_rgba(15,23,42,0.12)]">
                                                                            <div className="space-y-1">
                                                                                {(['high', 'mid', 'low'] as const).map(item => {
                                                                                    const isActive = draftFrequencyFilters.includes(item)
                                                                                    return (
                                                                                        <button
                                                                                            key={item}
                                                                                            type="button"
                                                                                            onClick={() => toggleDraftFrequencyFilter(item)}
                                                                                            className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors ${isActive
                                                                                                ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                                                                                                : 'text-[#475569] hover:bg-[#F8FAFC]'
                                                                                                }`}
                                                                                        >
                                                                                            <span>{t(getFrequencyLabelKey(item))}</span>
                                                                                            <span className="text-xs opacity-75">{draftFrequencyOptionCounts[item]}</span>
                                                                                        </button>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {draftFrequencyFilters.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {draftFrequencyFilters.map(item => (
                                                                            <button
                                                                                key={`dropdown-frequency-${item}`}
                                                                                type="button"
                                                                                onClick={() => toggleDraftFrequencyFilter(item)}
                                                                                className="inline-flex items-center gap-1 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1 text-xs text-[#1D4ED8]"
                                                                            >
                                                                                <span>{t(getFrequencyLabelKey(item))}</span>
                                                                                <span className="opacity-70">×</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3">
                                                            <p className="pt-2 text-sm font-medium text-[#475569]">{t('library.filterKnowledgePoint')}</p>
                                                            <div className="space-y-2">
                                                                <div className="relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOpenFilterDropdown(prev => (prev === 'knowledgePoint' ? null : 'knowledgePoint'))}
                                                                        className="flex h-10 w-full items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-3 text-sm text-[#334155] hover:border-[#93C5FD]"
                                                                    >
                                                                        <span>{effectiveDraftKnowledgePointFilters.length > 0 ? t('library.filterSelectedCount', { count: effectiveDraftKnowledgePointFilters.length }) : t('library.filterKnowledgePointPlaceholder')}</span>
                                                                        <ChevronDown size={16} className="text-[#94A3B8]" />
                                                                    </button>
                                                                    {openFilterDropdown === 'knowledgePoint' && (
                                                                        <div className="absolute left-0 top-11 z-10 w-full rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-[0_8px_20px_rgba(15,23,42,0.12)]">
                                                                            <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
                                                                                {activeKnowledgePoints.map(point => {
                                                                                    const pointName = contentLanguage === 'en-US' ? point.nameEn : point.name
                                                                                    const isActive = effectiveDraftKnowledgePointFilters.includes(point.id)
                                                                                    return (
                                                                                        <button
                                                                                            key={point.id}
                                                                                            type="button"
                                                                                            onClick={() => toggleDraftKnowledgePointFilter(point.id)}
                                                                                            className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors ${isActive
                                                                                                ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                                                                                                : 'text-[#475569] hover:bg-[#F8FAFC]'
                                                                                                }`}
                                                                                        >
                                                                                            <span className="max-w-[220px] truncate">{pointName}</span>
                                                                                            <span className="text-xs opacity-75">{knowledgePointCounts.get(point.id) || 0}</span>
                                                                                        </button>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {selectedDraftKnowledgePointChips.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {selectedDraftKnowledgePointChips.map(point => (
                                                                            <button
                                                                                key={`dropdown-point-${point.id}`}
                                                                                type="button"
                                                                                onClick={() => toggleDraftKnowledgePointFilter(point.id)}
                                                                                className="inline-flex items-center gap-1 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1 text-xs text-[#1D4ED8]"
                                                                            >
                                                                                <span className="max-w-[150px] truncate">{point.name}</span>
                                                                                <span className="opacity-70">×</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#E2E8F0] pt-3">
                                                        <button
                                                            type="button"
                                                            onClick={cancelFilterChanges}
                                                            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#475569] hover:bg-[#F8FAFC]"
                                                        >
                                                            {t('library.filterCancel')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={applyFilterChanges}
                                                            className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-sm text-white hover:bg-[#1D4ED8]"
                                                        >
                                                            {t('library.filterApply')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="shrink-0 ml-auto flex items-center gap-3 text-[#475569]">
                                        <div className="inline-flex items-center gap-2 rounded-full border border-[#D6E4FF] bg-[#EFF6FF] px-3 py-1.5">
                                            <Circle size={15} />
                                            <span className="text-[16px] font-semibold">
                                                {t('library.solvedProgress', { solved: solvedCount, total })}
                                            </span>
                                        </div>
                                        <Link
                                            href="/review/qa"
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] transition-colors shadow-sm"
                                        >
                                            <PlayCircle size={16} />
                                            {t('library.startReview')}
                                        </Link>
                                    </div>
                                </div>

                                {!isFilterOpen && activeFilterCount > 0 && (
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-medium text-[#64748B]">{t('library.selectedFiltersLabel')}</span>

                                        {frequencyFilters.map(item => (
                                            <button
                                                key={`frequency-${item}`}
                                                type="button"
                                                onClick={() => toggleFrequencyFilter(item)}
                                                className="inline-flex items-center gap-1 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1 text-sm text-[#1D4ED8]"
                                            >
                                                <span>{t(getFrequencyLabelKey(item))}</span>
                                                <span className="text-xs opacity-70">×</span>
                                            </button>
                                        ))}

                                        {selectedKnowledgePointChips.map(point => (
                                            <button
                                                key={`point-${point.id}`}
                                                type="button"
                                                onClick={() => toggleKnowledgePointFilter(point.id)}
                                                className="inline-flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1 text-sm text-[#1D4ED8]"
                                            >
                                                <span className="max-w-[180px] truncate">{point.name}</span>
                                                <span className="text-xs opacity-75">{point.count}</span>
                                                <span className="text-xs opacity-70">×</span>
                                            </button>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={resetAllFilters}
                                            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs text-[#64748B] hover:bg-[#F1F5F9]"
                                        >
                                            {t('library.filterReset')}
                                        </button>
                                    </div>
                                )}

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
                                    <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
                                        <div className="grid grid-cols-[minmax(0,1fr)_84px_84px_74px] items-center border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-xs font-semibold tracking-[0.04em] text-[#64748B]">
                                            <span>题目</span>
                                            <span className="text-center">频率</span>
                                            <span className="text-center">难度</span>
                                            <span className="text-center">状态</span>
                                        </div>
                                        <div>
                                            {visibleCards.map((card, index) => {
                                                const localized = getLocalizedCardContent(card, contentLanguage)
                                                const serial = (currentPage - 1) * PAGE_SIZE + index + 1
                                                const focusText = extractFocusText(localized.question, localized.title)
                                                const isSolved = solvedCardIds.has(card.id)
                                                const detailParams = new URLSearchParams()
                                                detailParams.set('track', selectedTrack)
                                                if (effectiveSelectedCategory) detailParams.set('category', effectiveSelectedCategory)
                                                if (effectiveKnowledgePointFilters.length === 1) detailParams.set('point', effectiveKnowledgePointFilters[0])
                                                if (searchQuery.trim()) detailParams.set('q', searchQuery.trim())
                                                const detailHref = `/library/cards/${card.id}${detailParams.toString() ? `?${detailParams.toString()}` : ''}`

                                                return (
                                                    <Link
                                                        key={card.id}
                                                        href={detailHref}
                                                        className={`group grid grid-cols-[minmax(0,1fr)_84px_84px_74px] items-center gap-3 border-b border-[#EEF2F7] px-4 py-2.5 transition-colors hover:bg-[#F3F7FF] ${index % 2 === 0 ? 'bg-white' : 'bg-[#FCFDFE]'}`}
                                                    >
                                                        <p className="min-w-0 truncate text-[14px] md:text-[15px] leading-6 font-medium text-[#0F172A]">
                                                            <span className="text-[#64748B] mr-1">{serial}.</span>
                                                            <span className="group-hover:text-[#1D4ED8] transition-colors">{focusText}</span>
                                                        </p>
                                                        <div className="flex justify-center">
                                                            <span className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium ${getFrequencyClasses(card.frequency)}`}>
                                                                {t(getFrequencyLabelKey(card.frequency))}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-center">
                                                            <span className={`text-sm font-semibold ${getDifficultyClasses(card.difficulty)}`}>
                                                                {t(getDifficultyLabelKey(card.difficulty))}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-center">
                                                            {isSolved ? (
                                                                <CheckCircle2 size={18} className="text-[#22C55E]" />
                                                            ) : (
                                                                <Circle size={18} className="text-[#CBD5E1]" />
                                                            )}
                                                        </div>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {totalPages > 1 && (
                                    <div className="mt-5 flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => setPage(prev => Math.max(1, Math.min(totalPages, prev) - 1))}
                                            disabled={currentPage <= 1}
                                            className="px-3 py-1.5 text-sm rounded-full text-[#475569] bg-[#F1F5F9] disabled:opacity-45 hover:bg-[#E2E8F0] transition-colors"
                                        >
                                            {t('library.prevPage')}
                                        </button>
                                        <span className="min-w-[96px] text-center text-sm text-[#64748B] font-medium">
                                            {t('library.page', { page: currentPage, total: totalPages })}
                                        </span>
                                        <button
                                            onClick={() => setPage(prev => Math.min(totalPages, Math.min(totalPages, prev) + 1))}
                                            disabled={currentPage >= totalPages}
                                            className="px-3 py-1.5 text-sm rounded-full text-[#475569] bg-[#F1F5F9] disabled:opacity-45 hover:bg-[#E2E8F0] transition-colors"
                                        >
                                            {t('library.nextPage')}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <aside className="space-y-3">
                                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                                    <p className="text-sm font-semibold text-[#334155]">{t('library.panelProgress')}</p>
                                    <div className="mt-3 text-2xl font-semibold text-[#0F172A]">{solvedCount}/{total}</div>
                                    <p className="mt-1 text-xs text-[#64748B]">{t('library.panelSolvedRate', { rate: solvedRate })}</p>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                                        <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.min(solvedRate, 100)}%` }} />
                                    </div>
                                    <Link
                                        href="/review/qa"
                                        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#2563EB] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
                                    >
                                        <PlayCircle size={16} />
                                        {t('library.startReview')}
                                    </Link>
                                </div>

                                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                                    <p className="text-sm font-semibold text-[#334155]">{t('library.panelFrequency')}</p>
                                    <div className="mt-3 space-y-2">
                                        {(['high', 'mid', 'low'] as const).map(level => (
                                            <div key={level} className="flex items-center justify-between text-sm">
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getFrequencyClasses(level)}`}>
                                                    {t(getFrequencyLabelKey(level))}
                                                </span>
                                                <span className="font-semibold text-[#334155]">{frequencyCounts[level]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                                    <p className="text-sm font-semibold text-[#334155]">{t('library.panelHotPoints')}</p>
                                    {topKnowledgePoints.length === 0 ? (
                                        <p className="mt-3 text-sm text-[#94A3B8]">{t('library.panelNoData')}</p>
                                    ) : (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {topKnowledgePoints.map(point => (
                                                <button
                                                    key={point.id}
                                                    type="button"
                                                    onClick={() => toggleKnowledgePointFilter(point.id)}
                                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${effectiveKnowledgePointFilters.includes(point.id)
                                                        ? 'border-[#93C5FD] bg-[#EFF6FF] text-[#1D4ED8]'
                                                        : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-[#EEF2FF]'
                                                        }`}
                                                >
                                                    <span className="max-w-[140px] truncate">{point.name}</span>
                                                    <span className="text-[#94A3B8]">{point.count}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </aside>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
