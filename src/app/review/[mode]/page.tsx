'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flashcard } from '@/components/Flashcard'
import { FlashcardControls } from '@/components/FlashcardControls'
import { MasteryProgress } from '@/components/MasteryBadge'
import { useReviewStore } from '@/store/review-store'
import { getLocalizedCategoryName } from '@/i18n/content'
import { useI18n } from '@/i18n/provider'
import { buildTechnicalKnowledgeCategories } from '@/lib/technical-taxonomy'
import { getReviewCards, getMasteryStats, getCardAnswer, getCategories, getDefaultList, getDueCount } from '@/lib/data-service'
import { restoreSession, createSession, getDefaultFilters } from '@/lib/session-service'
import type { CardList, Category, MasteryStatus } from '@/types'

type ReviewMode = 'qa' | 'code' | 'mix'

interface ReviewPageProps {
    params: Promise<{ mode: string }>
}

export default function ReviewPage({ params }: ReviewPageProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const scopeParam = searchParams.get('scope')?.trim() || ''
    const cardIdParam = searchParams.get('cardId')?.trim() || ''
    const scope = scopeParam || (cardIdParam ? `card:${cardIdParam}` : '')
    const activeScope = scope || 'all'
    const { t, contentLanguage, uiLanguage } = useI18n()

    const [isLoading, setIsLoading] = useState(true)
    const [mode, setMode] = useState<ReviewMode>('qa')
    const [selectedScope, setSelectedScope] = useState(activeScope)
    const [answerLoadingIds, setAnswerLoadingIds] = useState<Set<string>>(new Set())
    const [scopeOptionsLoading, setScopeOptionsLoading] = useState(false)
    const [scopeCategories, setScopeCategories] = useState<Category[]>([])
    const [favoriteList, setFavoriteList] = useState<CardList | null>(null)
    const [dueCount, setDueCount] = useState(0)
    const [masteryStats, setMasteryStats] = useState<Record<MasteryStatus, number>>({
        new: 0, fuzzy: 0, 'can-explain': 0, solid: 0
    })

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
        setSelectedScope(activeScope)
    }, [activeScope])

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
        router.push(`/review/${mode}?scope=${encodeURIComponent(nextScope)}`)
    }, [mode, router])

    const favoriteCount = favoriteList?.cardIds.length || 0
    const quickScopeOptions = useMemo(() => ([
        { value: 'all', label: uiLanguage === 'en-US' ? 'All Questions' : '全部面试题' },
        { value: 'due', label: uiLanguage === 'en-US' ? 'Due Now' : '到期待复习' },
        { value: 'favorites', label: uiLanguage === 'en-US' ? `My Favorites (${favoriteCount})` : `我的收藏 (${favoriteCount})` },
        { value: 'mastery:new', label: uiLanguage === 'en-US' ? 'My New Cards' : '我的未学题' },
        { value: 'mastery:fuzzy', label: uiLanguage === 'en-US' ? 'My Fuzzy Cards' : '我的模糊题' },
        { value: 'mastery:can-explain', label: uiLanguage === 'en-US' ? 'My Can-Explain Cards' : '我的会讲题' },
    ]), [favoriteCount, uiLanguage])

    const categoryScopeOptions = useMemo(() => (
        scopeCategories.map(category => ({
            value: `category:${category.id}`,
            label: getLocalizedCategoryName(category, contentLanguage)
        }))
    ), [scopeCategories, contentLanguage])

    const pointScopeOptions = useMemo(() => (
        knowledgeCategories.flatMap(category => category.points.map(point => ({
            value: `point:${category.id}:${point.id}`,
            label: `${contentLanguage === 'en-US' ? category.nameEn : category.name} / ${contentLanguage === 'en-US' ? point.nameEn : point.name}`
        })))
    ), [knowledgeCategories, contentLanguage])

    const hasSelectedScopeInOptions = useMemo(() => {
        const allValues = new Set<string>()
        quickScopeOptions.forEach(item => allValues.add(item.value))
        categoryScopeOptions.forEach(item => allValues.add(item.value))
        pointScopeOptions.forEach(item => allValues.add(item.value))
        return allValues.has(selectedScope)
    }, [quickScopeOptions, categoryScopeOptions, pointScopeOptions, selectedScope])

    const allScopeOptions = useMemo(
        () => [...quickScopeOptions, ...categoryScopeOptions, ...pointScopeOptions],
        [quickScopeOptions, categoryScopeOptions, pointScopeOptions]
    )

    const currentScopeLabel = useMemo(() => {
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
            return currentScopeLabel.split(' / ')
        }

        return [currentScopeLabel]
    }, [activeScope, currentScopeLabel, uiLanguage])

    const totalQueueCount = session?.queueCardIds.length || 0
    const reviewedCount = totalQueueCount > 0 ? session.cursor + 1 : 0
    const remainingCount = Math.max(0, totalQueueCount - reviewedCount)
    const progressPercent = totalQueueCount > 0 ? Math.min(100, Math.round((reviewedCount / totalQueueCount) * 100)) : 0
    const estimatedMinutes = Math.ceil((remainingCount * 75) / 60)

    // 加载数据
    const loadData = useCallback(async (continueSession: boolean = true) => {
        setIsLoading(true)

        try {
            // 获取卡片
            const cards = await getReviewCards(activeScope, 500)

            // 设置卡片到 store
            setCards(cards)

            // 尝试恢复会话
            if (continueSession) {
                const existingSession = await restoreSession(activeScope, mode)
                if (existingSession && existingSession.queueCardIds.length > 0) {
                    setSession(existingSession)
                    setIsLoading(false)
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
            setSession(newSession)

            // 获取统计
            const [stats, due] = await Promise.all([
                getMasteryStats(),
                getDueCount(new Date())
            ])
            setMasteryStats(stats)
            setDueCount(due)

        } catch (error) {
            console.error('Failed to load review data:', error)
        } finally {
            setIsLoading(false)
        }
    }, [activeScope, mode, setCards, setSession])

    useEffect(() => {
        loadData()
        return () => reset()
    }, [activeScope, loadData, reset])

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
                        <label htmlFor="review-scope-empty" className="text-sm text-[#64748B]">
                            {uiLanguage === 'en-US' ? 'Scope' : '刷题范围'}
                        </label>
                        <select
                            id="review-scope-empty"
                            value={selectedScope}
                            onChange={(e) => setSelectedScope(e.target.value)}
                            className="h-8 min-w-[220px] rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#93C5FD66] focus:border-[#2563EB]"
                        >
                            {!hasSelectedScopeInOptions && (
                                <option value={selectedScope}>
                                    {selectedScope.startsWith('card:')
                                        ? (uiLanguage === 'en-US' ? 'Single Card' : '单题速记')
                                        : selectedScope}
                                </option>
                            )}
                            <optgroup label={uiLanguage === 'en-US' ? 'Quick' : '快捷'}>
                                {quickScopeOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </optgroup>
                            {categoryScopeOptions.length > 0 && (
                                <optgroup label={uiLanguage === 'en-US' ? 'Domain' : '领域'}>
                                    {categoryScopeOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </optgroup>
                            )}
                            {pointScopeOptions.length > 0 && (
                                <optgroup label={uiLanguage === 'en-US' ? 'Knowledge Point' : '知识点'}>
                                    {pointScopeOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                        <button
                            type="button"
                            onClick={() => startReviewWithScope(selectedScope)}
                            disabled={selectedScope === activeScope || (selectedScope === 'favorites' && favoriteCount === 0)}
                            className="h-8 rounded-md bg-[#2563EB] px-3 text-sm text-white hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {scopeOptionsLoading ? t('common.loading') : (uiLanguage === 'en-US' ? 'Switch' : '切换')}
                        </button>
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
        <div className="relative min-h-screen py-4 px-4 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-[#BFDBFE]/35 blur-3xl" />
                <div className="absolute top-1/3 -right-24 h-72 w-72 rounded-full bg-[#C7D2FE]/30 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#DBEAFE]/35 blur-3xl" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-[#F8FAFC]/75 to-[#F1F5F9]/75" />
            </div>
            <div className="max-w-[1400px] mx-auto">
                <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_260px] gap-4 xl:gap-6 items-start">
                    <aside className="order-2 xl:order-1 space-y-3 xl:sticky xl:top-4">
                        <div className={infoCardClass}>
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r from-[#DBEAFE]/55 via-white/10 to-[#E2E8F0]/40" />
                            <p className="text-xs text-[#94A3B8] mb-1">
                                {uiLanguage === 'en-US' ? 'Current Scope' : '当前范围'}
                            </p>
                            <p className="text-sm font-medium text-[#0F172A] break-words">{currentScopeLabel}</p>

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

                            <div className="mt-3 space-y-2">
                                <select
                                    id="review-scope"
                                    value={selectedScope}
                                    onChange={(e) => setSelectedScope(e.target.value)}
                                    className="h-8 w-full rounded-md border border-[#CBD5E1] bg-white px-3 text-sm text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#93C5FD66] focus:border-[#2563EB]"
                                >
                                    {!hasSelectedScopeInOptions && (
                                        <option value={selectedScope}>
                                            {selectedScope.startsWith('card:')
                                                ? (uiLanguage === 'en-US' ? 'Single Card' : '单题速记')
                                                : selectedScope}
                                        </option>
                                    )}
                                    <optgroup label={uiLanguage === 'en-US' ? 'Quick' : '快捷'}>
                                        {quickScopeOptions.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </optgroup>
                                    {categoryScopeOptions.length > 0 && (
                                        <optgroup label={uiLanguage === 'en-US' ? 'Domain' : '领域'}>
                                            {categoryScopeOptions.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {pointScopeOptions.length > 0 && (
                                        <optgroup label={uiLanguage === 'en-US' ? 'Knowledge Point' : '知识点'}>
                                            {pointScopeOptions.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => startReviewWithScope(selectedScope)}
                                    disabled={selectedScope === activeScope || (selectedScope === 'favorites' && favoriteCount === 0)}
                                    className="h-8 w-full rounded-md bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-3 text-xs font-medium text-white hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {scopeOptionsLoading ? t('common.loading') : (uiLanguage === 'en-US' ? 'Apply Scope' : '应用范围')}
                                </button>
                            </div>
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
                    </aside>

                    <main className="order-1 xl:order-2 min-w-0">
                        <div className="mx-auto max-w-4xl">
                            <Flashcard
                                card={currentCard}
                                isFlipped={isFlipped}
                                onFlip={flipCard}
                                onMarkMastery={markMastery}
                                onLoadAnswer={handleLoadAnswer}
                                isAnswerLoading={answerLoadingIds.has(currentCard.id)}
                            />

                            <div className="mt-4 rounded-xl border border-white/65 bg-white/65 backdrop-blur-sm shadow-[0_4px_18px_rgba(15,23,42,0.06)]">
                                <FlashcardControls
                                    currentIndex={session.cursor}
                                    totalCount={session.queueCardIds.length}
                                    onPrevious={goToPrevious}
                                    onNext={goToNext}
                                />
                            </div>
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
                                {uiLanguage === 'en-US' ? 'Mastery Distribution' : '熟练度分布'}
                            </p>
                            <MasteryProgress stats={masteryStats} showLabels={false} />
                        </div>

                        <div className={infoCardClass}>
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r from-[#DBEAFE]/45 via-white/10 to-[#E2E8F0]/35" />
                            <p className="text-xs text-[#94A3B8] mb-2">
                                {uiLanguage === 'en-US' ? 'Shortcuts' : '快捷键'}
                            </p>
                            <div className="space-y-1.5 text-xs text-[#475569]">
                                <div><span className="font-mono bg-white/75 px-1.5 py-0.5 rounded border border-white/70">Space</span> {uiLanguage === 'en-US' ? 'Flip card' : '翻面'}</div>
                                <div><span className="font-mono bg-white/75 px-1.5 py-0.5 rounded border border-white/70">1-4</span> {uiLanguage === 'en-US' ? 'Mark mastery' : '标记掌握度'}</div>
                                <div><span className="font-mono bg-white/75 px-1.5 py-0.5 rounded border border-white/70">← →</span> {uiLanguage === 'en-US' ? 'Prev/Next' : '上一题/下一题'}</div>
                            </div>
                            <p className="text-xs text-[#64748B] mt-3">
                                {uiLanguage === 'en-US'
                                    ? (dueCount > 0 ? `${dueCount} cards are due now` : 'No due card at this moment')
                                    : (dueCount > 0 ? `当前有 ${dueCount} 道题到期` : '当前暂无到期题目')}
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}
