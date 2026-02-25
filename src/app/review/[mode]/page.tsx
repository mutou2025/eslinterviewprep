'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flashcard } from '@/components/Flashcard'
import { FlashcardControls } from '@/components/FlashcardControls'
import { MasteryProgress } from '@/components/MasteryBadge'
import { useReviewStore } from '@/store/review-store'
import { useI18n } from '@/i18n/provider'
import { buildTechnicalKnowledgeCategories } from '@/lib/technical-taxonomy'
import { createList, getReviewCards, getMasteryStats, getCardAnswer, getCategories, getDefaultList, getDueCount, updateList } from '@/lib/data-service'
import { restoreSession, createSession, getDefaultFilters } from '@/lib/session-service'
import type { CardList, Category, MasteryStatus } from '@/types'

type ReviewMode = 'qa' | 'code' | 'mix'

interface ReviewPageProps {
    params: Promise<{ mode: string }>
}

const BEHAVIORAL_INTERVIEW_SCOPE = 'link:behavior-interview'

type MultiFilterDraft = {
    domainIds: string[]
    pointKeys: string[]
}

function uniqueStringList(items: string[]): string[] {
    return Array.from(new Set(items.map(item => item.trim()).filter(Boolean)))
}

function parsePointKey(pointKey: string): { categoryId: string; pointId: string } | null {
    const idx = pointKey.indexOf(':')
    if (idx <= 0 || idx >= pointKey.length - 1) return null
    return {
        categoryId: pointKey.slice(0, idx),
        pointId: pointKey.slice(idx + 1)
    }
}

function parseMultiFilterScope(scope: string): MultiFilterDraft {
    const normalized = (scope || '').trim()

    if (normalized.startsWith('category:')) {
        const categoryId = normalized.replace('category:', '').trim()
        return { domainIds: categoryId ? [categoryId] : [], pointKeys: [] }
    }

    if (normalized.startsWith('point:')) {
        const match = /^point:([^:]+):(.+)$/.exec(normalized)
        if (!match) return { domainIds: [], pointKeys: [] }
        const [, categoryId, pointId] = match
        return {
            domainIds: [categoryId],
            pointKeys: [`${categoryId}:${pointId}`]
        }
    }

    if (!normalized.startsWith('filter:')) {
        return { domainIds: [], pointKeys: [] }
    }

    const payload = normalized.replace('filter:', '')
    const [domainPart = '', pointPart = ''] = payload.split('|')
    const domainIds = uniqueStringList(domainPart.split(','))
    const pointKeys = uniqueStringList(
        pointPart
            .split(',')
            .map(item => {
                const [categoryId = '', pointId = ''] = item.split('~')
                if (!categoryId || !pointId) return ''
                return `${categoryId}:${pointId}`
            })
    )

    return { domainIds, pointKeys }
}

function buildMultiFilterScope(draft: MultiFilterDraft): string {
    const domainIds = uniqueStringList(draft.domainIds)
    const pointKeys = uniqueStringList(draft.pointKeys)
    const pointPairs = pointKeys
        .map(parsePointKey)
        .filter((item): item is { categoryId: string; pointId: string } => item !== null)

    const domainSet = new Set<string>(domainIds)
    pointPairs.forEach(pair => domainSet.add(pair.categoryId))

    const mergedDomainIds = Array.from(domainSet)
    if (mergedDomainIds.length === 0 && pointPairs.length === 0) {
        return 'all'
    }

    const domainPart = mergedDomainIds.join(',')
    const pointPart = pointPairs.map(pair => `${pair.categoryId}~${pair.pointId}`).join(',')
    return `filter:${domainPart}|${pointPart}`
}

export default function ReviewPage({ params }: ReviewPageProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const scopeParam = searchParams.get('scope')?.trim() || ''
    const cardIdParam = searchParams.get('cardId')?.trim() || ''
    const scopeFromUrl = scopeParam || (cardIdParam ? `card:${cardIdParam}` : '') || 'all'
    const { t, contentLanguage, uiLanguage } = useI18n()

    const [isLoading, setIsLoading] = useState(true)
    const [mode, setMode] = useState<ReviewMode>('qa')
    const [activeScope, setActiveScope] = useState(scopeFromUrl)
    const [selectedScope, setSelectedScope] = useState(scopeFromUrl)
    const [answerLoadingIds, setAnswerLoadingIds] = useState<Set<string>>(new Set())
    const [scopeOptionsLoading, setScopeOptionsLoading] = useState(false)
    const [scopeCategories, setScopeCategories] = useState<Category[]>([])
    const [favoriteList, setFavoriteList] = useState<CardList | null>(null)
    const [isScopePanelOpen, setIsScopePanelOpen] = useState(false)
    const [draftDomainIds, setDraftDomainIds] = useState<string[]>([])
    const [draftPointKeys, setDraftPointKeys] = useState<string[]>([])
    const [isScopeSwitching, setIsScopeSwitching] = useState(false)
    const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false)
    const [dueCount, setDueCount] = useState(0)
    const [masteryStats, setMasteryStats] = useState<Record<MasteryStatus, number>>({
        new: 0, fuzzy: 0, 'can-explain': 0, solid: 0
    })
    const scopePanelRef = useRef<HTMLDivElement | null>(null)
    const hasInitializedReviewRef = useRef(false)
    const loadSequenceRef = useRef(0)

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

    const knowledgeCategories = useMemo(
        () => buildTechnicalKnowledgeCategories(scopeCategories),
        [scopeCategories]
    )

    useEffect(() => {
        let cancelled = false

        async function resolveMode() {
            const resolvedParams = await params
            if (cancelled) return
            const nextMode = resolvedParams.mode
            if (nextMode === 'qa' || nextMode === 'code' || nextMode === 'mix') {
                setMode(nextMode)
            } else {
                setMode('qa')
            }
        }

        resolveMode()
        return () => {
            cancelled = true
        }
    }, [params])

    useEffect(() => {
        const parsed = parseMultiFilterScope(scopeFromUrl)
        setActiveScope(scopeFromUrl)
        setSelectedScope(scopeFromUrl)
        setDraftDomainIds(parsed.domainIds)
        setDraftPointKeys(parsed.pointKeys)
        setIsScopePanelOpen(false)
    }, [scopeFromUrl])

    useEffect(() => {
        if (!isScopePanelOpen) return

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            if (!scopePanelRef.current?.contains(target)) {
                const parsed = parseMultiFilterScope(selectedScope)
                setDraftDomainIds(parsed.domainIds)
                setDraftPointKeys(parsed.pointKeys)
                setIsScopePanelOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isScopePanelOpen, selectedScope])

    useEffect(() => {
        let cancelled = false

        async function loadScopeOptions() {
            setScopeOptionsLoading(true)
            try {
                const [categories, defaultList] = await Promise.all([
                    getCategories(3),
                    getDefaultList()
                ])
                if (cancelled) return
                setScopeCategories(categories)
                setFavoriteList(defaultList)
            } finally {
                if (!cancelled) {
                    setScopeOptionsLoading(false)
                }
            }
        }

        loadScopeOptions()
        return () => {
            cancelled = true
        }
    }, [])

    const startReviewWithScope = useCallback((nextScope: string) => {
        if (nextScope === activeScope) return
        if (nextScope === BEHAVIORAL_INTERVIEW_SCOPE) {
            router.push('/behavior-interview')
            return
        }
        setActiveScope(nextScope)
        setSelectedScope(nextScope)

        const nextQuery = new URLSearchParams(searchParams.toString())
        nextQuery.set('scope', nextScope)
        nextQuery.delete('cardId')
        const nextUrl = `/review/${mode}?${nextQuery.toString()}`
        window.history.replaceState(window.history.state, '', nextUrl)
    }, [activeScope, mode, router, searchParams])

    const favoriteCount = favoriteList?.cardIds.length || 0
    const quickScopeOptions = useMemo(() => ([
        { value: 'all', label: uiLanguage === 'en-US' ? 'All Questions' : '全部面试题' },
        { value: 'due', label: uiLanguage === 'en-US' ? 'Due Now' : '到期待复习' },
        { value: 'favorites', label: uiLanguage === 'en-US' ? `My Favorites (${favoriteCount})` : `我的收藏 (${favoriteCount})` },
        { value: 'mastery:new', label: uiLanguage === 'en-US' ? 'My New Cards' : '我的未学题' },
        { value: 'mastery:fuzzy', label: uiLanguage === 'en-US' ? 'My Fuzzy Cards' : '我的模糊题' },
        { value: 'mastery:can-explain', label: uiLanguage === 'en-US' ? 'My Can-Explain Cards' : '我的会讲题' },
    ]), [favoriteCount, uiLanguage])

    const featuredQuickScopeOptions = useMemo(
        () => quickScopeOptions.slice(0, 5),
        [quickScopeOptions]
    )
    const quickScopeButtonOptions = useMemo(() => {
        const preferredOrder = ['due', 'all', 'mastery:new', 'favorites', 'mastery:fuzzy']
        return preferredOrder
            .map(value => featuredQuickScopeOptions.find(option => option.value === value))
            .filter((option): option is { value: string; label: string } => Boolean(option))
    }, [featuredQuickScopeOptions])

    const technicalDomainScopeOptions = useMemo(() => (
        knowledgeCategories.map(category => ({
            value: category.id,
            label: contentLanguage === 'en-US' ? category.nameEn : category.name
        }))
    ), [knowledgeCategories, contentLanguage])

    const categoryScopeOptions = useMemo(() => ([
        ...technicalDomainScopeOptions.map(option => ({
            value: `category:${option.value}`,
            label: option.label
        })),
        {
            value: BEHAVIORAL_INTERVIEW_SCOPE,
            label: uiLanguage === 'en-US' ? 'Behavioral Interview' : '行为面试'
        }
    ]), [technicalDomainScopeOptions, uiLanguage])

    const allPointScopeOptions = useMemo(() => (
        knowledgeCategories.flatMap(category => category.points.map(point => ({
            value: `point:${category.id}:${point.id}`,
            label: contentLanguage === 'en-US' ? point.nameEn : point.name
        })))
    ), [knowledgeCategories, contentLanguage])

    const domainLabelMap = useMemo(() => {
        const map = new Map<string, string>()
        technicalDomainScopeOptions.forEach(option => {
            map.set(option.value, option.label)
        })
        return map
    }, [technicalDomainScopeOptions])

    const pointLabelMap = useMemo(() => {
        const map = new Map<string, string>()
        knowledgeCategories.forEach(category => {
            category.points.forEach(point => {
                map.set(
                    `${category.id}:${point.id}`,
                    contentLanguage === 'en-US' ? point.nameEn : point.name
                )
            })
        })
        return map
    }, [knowledgeCategories, contentLanguage])

    const allScopeOptions = useMemo(
        () => [...quickScopeOptions, ...categoryScopeOptions, ...allPointScopeOptions],
        [quickScopeOptions, categoryScopeOptions, allPointScopeOptions]
    )

    const availableDomainIdSet = useMemo(
        () => new Set(technicalDomainScopeOptions.map(option => option.value)),
        [technicalDomainScopeOptions]
    )

    const effectiveDraftDomainIds = useMemo(
        () => draftDomainIds.filter(id => availableDomainIdSet.has(id)),
        [draftDomainIds, availableDomainIdSet]
    )

    const draftPointScopeOptions = useMemo(() => {
        if (effectiveDraftDomainIds.length === 0) return []
        const selectedDomainSet = new Set(effectiveDraftDomainIds)

        return knowledgeCategories
            .filter(category => selectedDomainSet.has(category.id))
            .flatMap(category => category.points.map(point => ({
                value: `${category.id}:${point.id}`,
                label: effectiveDraftDomainIds.length > 1
                    ? `${contentLanguage === 'en-US' ? category.nameEn : category.name} / ${contentLanguage === 'en-US' ? point.nameEn : point.name}`
                    : (contentLanguage === 'en-US' ? point.nameEn : point.name)
            })))
    }, [knowledgeCategories, effectiveDraftDomainIds, contentLanguage])

    const availablePointKeySet = useMemo(
        () => new Set(draftPointScopeOptions.map(option => option.value)),
        [draftPointScopeOptions]
    )

    const effectiveDraftPointKeys = useMemo(
        () => draftPointKeys.filter(key => availablePointKeySet.has(key)),
        [draftPointKeys, availablePointKeySet]
    )

    const currentScopeLabel = useMemo(() => {
        if (activeScope.startsWith('filter:')) {
            const parsed = parseMultiFilterScope(activeScope)
            if (parsed.pointKeys.length > 0) {
                return uiLanguage === 'en-US'
                    ? `${parsed.domainIds.length} Domains / ${parsed.pointKeys.length} Topics`
                    : `${parsed.domainIds.length}个领域 / ${parsed.pointKeys.length}个知识点`
            }
            if (parsed.domainIds.length > 0) {
                return uiLanguage === 'en-US'
                    ? `${parsed.domainIds.length} Domains`
                    : `${parsed.domainIds.length}个领域`
            }
        }

        const found = allScopeOptions.find(option => option.value === activeScope)
        if (found) return found.label
        if (activeScope.startsWith('card:')) {
            return uiLanguage === 'en-US' ? 'Single Card' : '单题速记'
        }
        return activeScope
    }, [activeScope, allScopeOptions, uiLanguage])

    const scopeSummaryTags = useMemo(() => {
        if (activeScope === 'all') {
            return uiLanguage === 'en-US'
                ? ['All', 'Frontend & Fullstack']
                : ['全部', '前端&全栈开发']
        }

        if (activeScope === 'due') {
            return uiLanguage === 'en-US' ? ['Due', 'Spaced Review'] : ['到期', '间隔复习']
        }

        if (activeScope === 'favorites') {
            return uiLanguage === 'en-US' ? ['Favorites', 'Starred'] : ['收藏', '已标星']
        }

        if (activeScope.startsWith('mastery:')) {
            const level = activeScope.replace('mastery:', '')
            if (level === 'new') return uiLanguage === 'en-US' ? ['My New', 'Need Learning'] : ['我的未学', '待学习']
            if (level === 'fuzzy') return uiLanguage === 'en-US' ? ['My Fuzzy', 'Need Reinforce'] : ['我的模糊', '待巩固']
            if (level === 'can-explain') return uiLanguage === 'en-US' ? ['Can Explain', 'Stabilize'] : ['我的会讲', '待稳定']
            if (level === 'solid') return uiLanguage === 'en-US' ? ['Solid', 'Maintenance'] : ['已掌握', '巩固维护']
        }

        if (activeScope.startsWith('point:')) {
            const pointMatch = /^point:([^:]+):/.exec(activeScope)
            const domainLabel = pointMatch
                ? categoryScopeOptions.find(option => option.value === `category:${pointMatch[1]}`)?.label
                : ''
            return domainLabel ? [domainLabel, currentScopeLabel] : [currentScopeLabel]
        }

        if (activeScope.startsWith('filter:')) {
            const parsed = parseMultiFilterScope(activeScope)
            const tags: string[] = []
            if (parsed.domainIds.length > 0) {
                tags.push(uiLanguage === 'en-US' ? `${parsed.domainIds.length} Domains` : `${parsed.domainIds.length}个领域`)
            }
            if (parsed.pointKeys.length > 0) {
                tags.push(uiLanguage === 'en-US' ? `${parsed.pointKeys.length} Topics` : `${parsed.pointKeys.length}个知识点`)
            }
            return tags.length > 0 ? tags : [currentScopeLabel]
        }

        return [currentScopeLabel]
    }, [activeScope, categoryScopeOptions, currentScopeLabel, uiLanguage])

    const activeScopeSelection = useMemo(
        () => parseMultiFilterScope(activeScope),
        [activeScope]
    )

    const activeDomainTags = useMemo(() => {
        return activeScopeSelection.domainIds
            .map(domainId => ({
                id: domainId,
                label: domainLabelMap.get(domainId) || domainId
            }))
    }, [activeScopeSelection, domainLabelMap])

    const activePointTags = useMemo(() => {
        return activeScopeSelection.pointKeys
            .map(pointKey => ({
                key: pointKey,
                label: pointLabelMap.get(pointKey) || pointKey.split(':')[1] || pointKey
            }))
    }, [activeScopeSelection, pointLabelMap])

    const nextDraftScope = useMemo(
        () => buildMultiFilterScope({
            domainIds: effectiveDraftDomainIds,
            pointKeys: effectiveDraftPointKeys
        }),
        [effectiveDraftDomainIds, effectiveDraftPointKeys]
    )

    const draftScopeLabel = useMemo(() => {
        const parsed = parseMultiFilterScope(nextDraftScope)
        if (parsed.pointKeys.length > 0) {
            return uiLanguage === 'en-US'
                ? `${parsed.domainIds.length} Domains / ${parsed.pointKeys.length} Topics`
                : `${parsed.domainIds.length}个领域 / ${parsed.pointKeys.length}个知识点`
        }
        if (parsed.domainIds.length > 0) {
            return uiLanguage === 'en-US'
                ? `${parsed.domainIds.length} Domains`
                : `${parsed.domainIds.length}个领域`
        }

        const found = allScopeOptions.find(option => option.value === nextDraftScope)
        if (found) return found.label
        if (nextDraftScope.startsWith('card:')) {
            return uiLanguage === 'en-US' ? 'Single Card' : '单题速记'
        }
        return nextDraftScope
    }, [allScopeOptions, nextDraftScope, uiLanguage])

    const isDraftScopeApplyDisabled = nextDraftScope === activeScope

    const openScopePanel = () => {
        const parsed = parseMultiFilterScope(selectedScope)
        setDraftDomainIds(parsed.domainIds)
        setDraftPointKeys(parsed.pointKeys)
        setIsScopePanelOpen(true)
    }

    const closeScopePanel = () => {
        const parsed = parseMultiFilterScope(selectedScope)
        setDraftDomainIds(parsed.domainIds)
        setDraftPointKeys(parsed.pointKeys)
        setIsScopePanelOpen(false)
    }

    const applyDraftScope = () => {
        setSelectedScope(nextDraftScope)
        setIsScopePanelOpen(false)
        startReviewWithScope(nextDraftScope)
    }

    const removeDomainTag = useCallback((domainId: string) => {
        const parsed = parseMultiFilterScope(activeScope)
        const nextDomainIds = parsed.domainIds.filter(id => id !== domainId)
        const nextPointKeys = parsed.pointKeys.filter(pointKey => {
            const pair = parsePointKey(pointKey)
            return pair ? pair.categoryId !== domainId : false
        })
        const nextScope = buildMultiFilterScope({
            domainIds: nextDomainIds,
            pointKeys: nextPointKeys
        })
        setSelectedScope(nextScope)
        startReviewWithScope(nextScope)
    }, [activeScope, startReviewWithScope])

    const removePointTag = useCallback((pointKey: string) => {
        const parsed = parseMultiFilterScope(activeScope)
        const nextPointKeys = parsed.pointKeys.filter(key => key !== pointKey)
        const nextScope = buildMultiFilterScope({
            domainIds: parsed.domainIds,
            pointKeys: nextPointKeys
        })
        setSelectedScope(nextScope)
        startReviewWithScope(nextScope)
    }, [activeScope, startReviewWithScope])

    const renderScopeSelectorPanel = (align: 'left' | 'right' | 'auto') => (
        <div className="relative" ref={scopePanelRef}>
            <button
                type="button"
                onClick={() => (isScopePanelOpen ? closeScopePanel() : openScopePanel())}
                className="h-8 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-left text-sm text-[#334155] transition-colors hover:border-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#93C5FD66]"
            >
                {scopeOptionsLoading ? t('common.loading') : draftScopeLabel}
            </button>

            {isScopePanelOpen && (
                <div className={`absolute z-[600] mt-2 w-[min(220px,calc(100vw-1rem))] max-h-[70vh] overflow-auto rounded-xl border border-[#CBD5E1] bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.16)] ${align === 'right' ? 'right-0' : align === 'auto' ? 'left-0 xl:left-auto xl:right-0' : 'left-0'}`}>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-[#334155]">{uiLanguage === 'en-US' ? 'Scope Filter' : '范围筛选'}</h3>
                        <button
                            type="button"
                            onClick={() => {
                                setDraftDomainIds([])
                                setDraftPointKeys([])
                            }}
                            className="text-xs text-[#64748B] hover:text-[#334155] transition-colors"
                        >
                            {uiLanguage === 'en-US' ? 'Reset' : '重置'}
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-[40px_minmax(0,1fr)] md:items-center">
                            <label htmlFor="scope-domain" className="text-xs font-medium text-[#475569]">
                                {uiLanguage === 'en-US' ? 'Domain' : '领域'}
                            </label>
                            <select
                                id="scope-domain"
                                multiple
                                value={effectiveDraftDomainIds}
                                onChange={(e) => {
                                    const selectedIds = Array.from(e.currentTarget.selectedOptions).map(option => option.value)
                                    const nextDomainIds = uniqueStringList(selectedIds)
                                    const nextDomainSet = new Set(nextDomainIds)
                                    setDraftDomainIds(nextDomainIds)
                                    setDraftPointKeys(prev => prev.filter(key => {
                                        const parsed = parsePointKey(key)
                                        return parsed ? nextDomainSet.has(parsed.categoryId) : false
                                    }))
                                }}
                                className="h-24 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#93C5FD66] focus:border-[#2563EB]"
                            >
                                {technicalDomainScopeOptions.map(option => (
                                    <option key={`domain-${option.value}`} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-[40px_minmax(0,1fr)] md:items-center">
                            <label htmlFor="scope-point" className="text-xs font-medium text-[#475569]">
                                {uiLanguage === 'en-US' ? 'Knowledge Point' : '知识点'}
                            </label>
                            <select
                                id="scope-point"
                                multiple
                                value={effectiveDraftPointKeys}
                                disabled={draftPointScopeOptions.length === 0}
                                onChange={(e) => {
                                    const selectedKeys = Array.from(e.currentTarget.selectedOptions).map(option => option.value)
                                    setDraftPointKeys(uniqueStringList(selectedKeys))
                                }}
                                className="h-24 w-full rounded-xl border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#334155] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#93C5FD66] focus:border-[#2563EB]"
                            >
                                {draftPointScopeOptions.map(option => (
                                    <option key={`point-${option.value}`} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-[#E2E8F0] pt-2.5">
                        <button
                            type="button"
                            onClick={closeScopePanel}
                            className="h-8 rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                        >
                            {uiLanguage === 'en-US' ? 'Cancel' : '取消'}
                        </button>
                        <button
                            type="button"
                            onClick={applyDraftScope}
                            disabled={isDraftScopeApplyDisabled}
                            className="h-8 rounded-lg bg-[#2563EB] px-4 text-sm text-white hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {uiLanguage === 'en-US' ? 'Apply' : '应用'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )

    const totalQueueCount = session?.queueCardIds.length || 0
    const reviewedCount = session && totalQueueCount > 0 ? session.cursor + 1 : 0
    const remainingCount = Math.max(0, totalQueueCount - reviewedCount)
    const progressPercent = totalQueueCount > 0 ? Math.min(100, Math.round((reviewedCount / totalQueueCount) * 100)) : 0
    const estimatedMinutes = Math.ceil((remainingCount * 75) / 60)

    // 加载数据
    const loadData = useCallback(async (continueSession: boolean = true) => {
        const loadSeq = ++loadSequenceRef.current
        const shouldBlockPage = !hasInitializedReviewRef.current
        if (shouldBlockPage) {
            setIsLoading(true)
        } else {
            setIsScopeSwitching(true)
        }

        try {
            // 获取卡片
            const cards = await getReviewCards(activeScope, 500)
            if (loadSeq !== loadSequenceRef.current) return

            // 设置卡片到 store
            setCards(cards)

            // 尝试恢复会话
            if (continueSession) {
                const existingSession = await restoreSession(activeScope, mode)
                if (loadSeq !== loadSequenceRef.current) return
                if (existingSession && existingSession.queueCardIds.length > 0) {
                    setSession(existingSession)
                    return
                }
            }

            // 创建新会话
            const defaultFilters = getDefaultFilters()
            defaultFilters.onlyDue = activeScope === 'due'
            const newSession = await createSession(
                activeScope,
                mode,
                cards,
                defaultFilters
            )
            if (loadSeq !== loadSequenceRef.current) return
            setSession(newSession)

            // 仅首次加载时刷新侧边统计，避免切换范围导致整页多区块闪动
            if (shouldBlockPage) {
                const [stats, due] = await Promise.all([
                    getMasteryStats(),
                    getDueCount(new Date())
                ])
                if (loadSeq !== loadSequenceRef.current) return
                setMasteryStats(stats)
                setDueCount(due)
            }

        } catch (error) {
            console.error('Failed to load review data:', error)
        } finally {
            if (loadSeq === loadSequenceRef.current) {
                if (shouldBlockPage) {
                    setIsLoading(false)
                } else {
                    setIsScopeSwitching(false)
                }
                hasInitializedReviewRef.current = true
            }
        }
    }, [activeScope, mode, setCards, setSession])

    useEffect(() => {
        loadData()
    }, [activeScope, loadData])

    useEffect(() => {
        return () => reset()
    }, [reset])

    const isCurrentCardFavorite = useMemo(() => {
        if (!currentCard || !favoriteList) return false
        return favoriteList.cardIds.includes(currentCard.id)
    }, [currentCard, favoriteList])

    const toggleFavoriteForCurrentCard = useCallback(async () => {
        if (!currentCard || isFavoriteUpdating) return
        setIsFavoriteUpdating(true)

        try {
            let list = favoriteList
            if (!list) {
                const existing = await getDefaultList()
                list = existing || await createList(
                    uiLanguage === 'en-US' ? '⭐ Favorites' : '⭐ 最喜欢的',
                    [],
                    true
                )
            }

            if (!list) return

            const alreadyIncluded = list.cardIds.includes(currentCard.id)
            const nextCardIds = alreadyIncluded
                ? list.cardIds.filter(id => id !== currentCard.id)
                : [...list.cardIds, currentCard.id]

            await updateList(list.id, { cardIds: nextCardIds })
            setFavoriteList({
                ...list,
                cardIds: nextCardIds,
                updatedAt: new Date()
            })
        } catch (error) {
            console.error('Failed to update favorites:', error)
        } finally {
            setIsFavoriteUpdating(false)
        }
    }, [currentCard, favoriteList, isFavoriteUpdating, uiLanguage])

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
            const localizedAnswer = await getCardAnswer(currentCard.id, contentLanguage)
            setCardAnswer(currentCard.id, localizedAnswer)
        } finally {
            setAnswerLoadingIds(prev => {
                const updated = new Set(prev)
                updated.delete(currentCard.id)
                return updated
            })
        }
    }, [currentCard, answerLoadingIds, setCardAnswer, contentLanguage])

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
                <div className="text-center max-w-xl w-full px-4">
                    <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                        <span className="text-sm text-[#64748B]">
                            {uiLanguage === 'en-US' ? 'Scope' : '刷题范围'}
                        </span>
                        <div className="min-w-[240px]">
                            {renderScopeSelectorPanel('left')}
                        </div>
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


    const infoCardClass = 'group relative overflow-hidden rounded-2xl border border-white/60 bg-white/72 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)]'
    const softPillClass = 'px-2 py-0.5 rounded-full text-xs border border-white/70 text-[#475569] bg-white/75 backdrop-blur-sm'

    return (
        <div className="relative min-h-screen py-4 px-4 overflow-visible">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-[#BFDBFE]/35 blur-3xl" />
                <div className="absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-[#C7D2FE]/30 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#DBEAFE]/35 blur-3xl" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-[#F8FAFC]/75 to-[#F1F5F9]/75" />
            </div>
            <div className="max-w-[1400px] mx-auto">
                <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_260px] gap-4 xl:gap-6 items-start">
                    <aside className="order-2 xl:order-1 relative z-40 space-y-3 xl:sticky xl:top-4">
                        <div className={`${infoCardClass} z-20 overflow-visible`}>
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r from-[#DBEAFE]/55 via-white/10 to-[#E2E8F0]/40" />
                            <p className="text-xs text-[#94A3B8] mb-1">
                                {uiLanguage === 'en-US' ? 'Current Review Scope' : '当前刷题范围'}
                            </p>

                            {activeDomainTags.length > 0 || activePointTags.length > 0 ? (
                                <div className="mt-2 space-y-2">
                                    {activeDomainTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {activeDomainTags.map(tag => (
                                                <button
                                                    key={`active-domain-${tag.id}`}
                                                    type="button"
                                                    onClick={() => removeDomainTag(tag.id)}
                                                    className={`${softPillClass} inline-flex items-center gap-1 hover:border-[#93C5FD] hover:text-[#1D4ED8] transition-colors`}
                                                >
                                                    <span>{tag.label}</span>
                                                    <span className="font-mono text-[11px]">x</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {activeDomainTags.length > 0 && activePointTags.length > 0 && (
                                        <div className="h-px bg-gradient-to-r from-transparent via-[#93C5FD] to-transparent" />
                                    )}

                                    {activePointTags.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {activePointTags.map(tag => (
                                                <button
                                                    key={`active-point-${tag.key}`}
                                                    type="button"
                                                    onClick={() => removePointTag(tag.key)}
                                                    className={`${softPillClass} inline-flex items-center gap-1 hover:border-[#93C5FD] hover:text-[#1D4ED8] transition-colors`}
                                                >
                                                    <span>{tag.label}</span>
                                                    <span className="font-mono text-[11px]">x</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {scopeSummaryTags.map(tag => (
                                        <span
                                            key={tag}
                                            className={softPillClass}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="mt-3 space-y-2">
                                {renderScopeSelectorPanel('right')}
                            </div>
                        </div>

                        <div className={infoCardClass}>
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r from-[#E0E7FF]/40 via-white/10 to-[#DBEAFE]/40" />
                            <p className="text-xs text-[#94A3B8] mb-2">
                                {uiLanguage === 'en-US' ? 'Quick Scope Selector' : '快捷刷题范围选择'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {quickScopeButtonOptions.map((option, index) => (
                                    <button
                                        key={`quick-scope-${option.value}`}
                                        type="button"
                                        onClick={() => startReviewWithScope(option.value)}
                                        disabled={option.value === 'favorites' && favoriteCount === 0}
                                        style={{
                                            flexBasis: [48, 44, 56, 42, 50][index] ? `${[48, 44, 56, 42, 50][index]}%` : '48%'
                                        }}
                                        className={`h-8 rounded-md border px-3 text-left text-xs transition-colors ${activeScope === option.value
                                            ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]'
                                            : 'border-white/70 bg-white/75 text-[#334155] hover:bg-white'
                                            } disabled:opacity-50 disabled:cursor-not-allowed truncate`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <main className="order-1 xl:order-2 min-w-0">
                        <div className="mx-auto max-w-4xl relative">
                            <div className={`transition-opacity duration-300 ${isScopeSwitching ? 'opacity-45' : 'opacity-100'}`}>
                                <Flashcard
                                    card={currentCard}
                                    isFlipped={isFlipped}
                                    onFlip={flipCard}
                                    onMarkMastery={markMastery}
                                    onLoadAnswer={handleLoadAnswer}
                                    isAnswerLoading={answerLoadingIds.has(currentCard.id)}
                                    scopeLabel={currentScopeLabel}
                                    isFavorite={isCurrentCardFavorite}
                                    onToggleFavorite={toggleFavoriteForCurrentCard}
                                    isFavoritePending={isFavoriteUpdating}
                                />

                                <div className="mt-2">
                                    <FlashcardControls
                                        currentIndex={session.cursor}
                                        totalCount={session.queueCardIds.length}
                                        onPrevious={goToPrevious}
                                        onNext={goToNext}
                                    />
                                </div>
                            </div>

                            {isScopeSwitching && (
                                <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/40 backdrop-blur-[1px]">
                                    <div className="relative h-20 w-20">
                                        <div className="absolute inset-0 rounded-full border-2 border-[#93C5FD] border-t-transparent animate-spin" />
                                        <div className="absolute inset-[14px] rounded-full border-2 border-[#3B82F6] border-b-transparent animate-spin [animation-duration:1.2s] [animation-direction:reverse]" />
                                        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2563EB] animate-pulse" />
                                    </div>
                                    <p className="rounded-full border border-white/70 bg-white/75 px-3 py-1 text-xs text-[#334155]">
                                        {uiLanguage === 'en-US' ? 'Switching scope...' : '切换刷题范围中...'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </main>

                    <aside className="order-3 space-y-3 xl:sticky xl:top-4">
                        <div className={infoCardClass}>
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r from-[#DBEAFE]/55 via-white/10 to-[#E2E8F0]/40" />
                            <p className="text-xs text-[#94A3B8] mb-1">
                                {uiLanguage === 'en-US' ? 'Today Progress' : '今日进度'}
                            </p>
                            <p className="text-2xl font-semibold text-[#0F172A]">{reviewedCount}/{totalQueueCount}</p>
                            <div className="mt-2 h-1.5 bg-white/70 rounded-full overflow-hidden border border-white/70">
                                <div className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                            </div>
                            <p className="text-xs text-[#64748B] mt-2">
                                {uiLanguage === 'en-US'
                                    ? `ETA ${estimatedMinutes} min`
                                    : `预计还需 ${estimatedMinutes} 分钟`}
                            </p>
                        </div>

                        <div className={infoCardClass}>
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r from-[#E0E7FF]/40 via-white/10 to-[#DBEAFE]/40" />
                            <p className="text-xs text-[#94A3B8] mb-2">
                                {uiLanguage === 'en-US' ? 'Queue' : '学习队列'}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg border border-white/70 bg-white/70 px-2 py-1.5 text-[#334155]">
                                    <span className="text-[#64748B]">{uiLanguage === 'en-US' ? 'Due' : '到期'}</span>
                                    <div className="text-sm font-semibold">{dueCount}</div>
                                </div>
                                <div className="rounded-lg border border-white/70 bg-white/70 px-2 py-1.5 text-[#334155]">
                                    <span className="text-[#64748B]">{uiLanguage === 'en-US' ? 'New' : '未学'}</span>
                                    <div className="text-sm font-semibold">{masteryStats.new}</div>
                                </div>
                                <div className="rounded-lg border border-white/70 bg-white/70 px-2 py-1.5 text-[#334155]">
                                    <span className="text-[#64748B]">{uiLanguage === 'en-US' ? 'Wrong' : '模糊'}</span>
                                    <div className="text-sm font-semibold">{masteryStats.fuzzy}</div>
                                </div>
                                <div className="rounded-lg border border-white/70 bg-white/70 px-2 py-1.5 text-[#334155]">
                                    <span className="text-[#64748B]">{uiLanguage === 'en-US' ? 'Star' : '收藏'}</span>
                                    <div className="text-sm font-semibold">{favoriteCount}</div>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => startReviewWithScope('mastery:fuzzy')}
                                    className="flex-1 h-8 rounded-md border border-white/70 bg-white/75 text-xs text-[#334155] hover:bg-white transition-colors"
                                >
                                    {uiLanguage === 'en-US' ? 'Wrong Set' : '错题本'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => startReviewWithScope('favorites')}
                                    disabled={favoriteCount === 0}
                                    className="flex-1 h-8 rounded-md border border-white/70 bg-white/75 text-xs text-[#334155] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uiLanguage === 'en-US' ? 'Favorites' : '收藏夹'}
                                </button>
                            </div>
                        </div>

                        <div className={infoCardClass}>
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r from-[#E0E7FF]/40 via-white/10 to-[#DBEAFE]/40" />
                            <p className="text-xs text-[#94A3B8] mb-2">
                                {uiLanguage === 'en-US' ? 'Mastery Distribution' : '熟练度分布'}
                            </p>
                            <MasteryProgress stats={masteryStats} showLabels={false} />
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}
