'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckSquare, MessageCircle, MessageSquare, MoreHorizontal, PlayCircle, Share2, Star, ThumbsUp, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { MasteryBadge } from '@/components/MasteryBadge'
import { getCardAnswer, getCardSummary, getCardsByCategory, getDefaultList, updateList } from '@/lib/data-service'
import { useI18n } from '@/i18n/provider'
import { getLocalizedCardContent } from '@/i18n/content'
import type { Card } from '@/types'
import 'highlight.js/styles/github-dark.css'

const ENCOUNTERED_STORAGE_KEY = 'eslinterviewprep.cardEncounteredIds'
const LIKED_STORAGE_KEY = 'eslinterviewprep.cardLikedIds'
const FEEDBACK_STORAGE_KEY = 'eslinterviewprep.cardFeedbacks'
const COMMENT_STORAGE_PREFIX = 'eslinterviewprep.cardComments:'
const COMMENT_MAX_LENGTH = 1000

interface CommentReply {
    id: string
    author: string
    content: string
    createdAt: string
    likeCount: number
}

interface CardComment {
    id: string
    author: string
    role?: string
    content: string
    createdAt: string
    likeCount: number
    replyCount: number
    isHot?: boolean
    replies?: CommentReply[]
}

interface RelatedRecommendation {
    id: string
    title: string
    frequency: Card['frequency']
    favoriteCount: number
}

function getCommentStorageKey(cardId: string): string {
    return `${COMMENT_STORAGE_PREFIX}${cardId}`
}

function createDefaultComments(): CardComment[] {
    const now = Date.now()
    const day = 24 * 60 * 60 * 1000
    return [
        {
            id: 'seed-1',
            author: '哇哇哇哇',
            role: '前端',
            content: '之前用这个思路确实容易踩坑，建议先讲问题边界，再讲方案。',
            createdAt: new Date(now - day * 60).toISOString(),
            likeCount: 24,
            replyCount: 3,
            isHot: true,
            replies: [
                {
                    id: 'seed-1-reply-1',
                    author: '鸡蛋卷',
                    content: '现在不是了，面试官更看重 trade-off 的表达。',
                    createdAt: new Date(now - day * 58).toISOString(),
                    likeCount: 5
                },
                {
                    id: 'seed-1-reply-2',
                    author: '鸡蛋卷',
                    content: '我觉得先给结论再展开细节，会更稳一点。',
                    createdAt: new Date(now - day * 56).toISOString(),
                    likeCount: 13
                }
            ]
        },
        {
            id: 'seed-2',
            author: '魔法少女妞妞',
            role: '打工战士',
            content: '国外面试更关注你如何验证方案，不只是背概念。可以补一段监控和回滚策略。',
            createdAt: new Date(now - day * 20).toISOString(),
            likeCount: 17,
            replyCount: 1,
            isHot: true
        },
        {
            id: 'seed-3',
            author: '匿名用户',
            content: '这个题我会先画数据流，再讲瓶颈和优化优先级，成功率明显高很多。',
            createdAt: new Date(now - day * 4).toISOString(),
            likeCount: 8,
            replyCount: 0
        }
    ]
}

function formatRelativeTime(iso: string, uiLanguage: 'zh-CN' | 'en-US'): string {
    const createdAt = new Date(iso).getTime()
    if (Number.isNaN(createdAt)) return uiLanguage === 'zh-CN' ? '刚刚' : 'just now'

    const diffMs = Date.now() - createdAt
    const minute = 60 * 1000
    const hour = 60 * minute
    const day = 24 * hour
    const month = 30 * day

    if (diffMs < minute) return uiLanguage === 'zh-CN' ? '刚刚' : 'just now'
    if (diffMs < hour) {
        const mins = Math.max(1, Math.floor(diffMs / minute))
        return uiLanguage === 'zh-CN' ? `${mins} 分钟前` : `${mins}m ago`
    }
    if (diffMs < day) {
        const hours = Math.max(1, Math.floor(diffMs / hour))
        return uiLanguage === 'zh-CN' ? `${hours} 小时前` : `${hours}h ago`
    }
    if (diffMs < month) {
        const days = Math.max(1, Math.floor(diffMs / day))
        return uiLanguage === 'zh-CN' ? `${days} 天前` : `${days}d ago`
    }

    const months = Math.max(1, Math.floor(diffMs / month))
    return uiLanguage === 'zh-CN' ? `${months} 个月前` : `${months}mo ago`
}

function buildMetricFromId(id: string, min: number, max: number): number {
    let hash = 0
    for (let i = 0; i < id.length; i += 1) {
        hash = (hash * 31 + id.charCodeAt(i)) % 1000003
    }
    const ratio = hash / 1000003
    return Math.floor(min + (max - min) * ratio)
}

function loadCardSet(storageKey: string): Set<string> {
    if (typeof window === 'undefined') return new Set()
    try {
        const raw = window.localStorage.getItem(storageKey)
        if (!raw) return new Set()
        const ids = JSON.parse(raw)
        return Array.isArray(ids) ? new Set(ids as string[]) : new Set()
    } catch {
        return new Set()
    }
}

function saveCardSet(storageKey: string, ids: Set<string>) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(Array.from(ids)))
}

export default function CardDetailPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { t, contentLanguage, uiLanguage } = useI18n()
    const cardId = params.id as string
    const backTrack = searchParams.get('track')
    const backCategory = searchParams.get('category')
    const backKnowledgePoint = searchParams.get('point')
    const backSearchQuery = searchParams.get('q')
    const backParams = new URLSearchParams()
    if (backTrack) backParams.set('track', backTrack)
    if (backCategory) backParams.set('category', backCategory)
    if (backKnowledgePoint) backParams.set('point', backKnowledgePoint)
    if (backSearchQuery) backParams.set('q', backSearchQuery)
    const backToLibraryHref = `/library${backParams.toString() ? `?${backParams.toString()}` : ''}`
    const buildCardDetailHref = (targetCardId: string) => `/library/cards/${targetCardId}${backParams.toString() ? `?${backParams.toString()}` : ''}`

    const [card, setCard] = useState<Card | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isFavorite, setIsFavorite] = useState(false)
    const [isEncountered, setIsEncountered] = useState(false)
    const [isLiked, setIsLiked] = useState(false)
    const [feedbackOpen, setFeedbackOpen] = useState(false)
    const [feedbackType, setFeedbackType] = useState('content')
    const [feedbackText, setFeedbackText] = useState('')
    const [comments, setComments] = useState<CardComment[]>([])
    const [relatedRecommendations, setRelatedRecommendations] = useState<RelatedRecommendation[]>([])
    const [commentInput, setCommentInput] = useState('')
    const [showAllComments, setShowAllComments] = useState(false)
    const [actionHint, setActionHint] = useState('')
    const [isAnswerLoading, setIsAnswerLoading] = useState(false)
    const [showAnswer, setShowAnswer] = useState(false)

    useEffect(() => {
        async function loadCard() {
            const c = await getCardSummary(cardId)
            setCard(c || null)

            // 检查是否在收藏列表
            const favList = await getDefaultList()
            if (favList) setIsFavorite(favList.cardIds.includes(cardId))

            setIsLoading(false)
        }
        loadCard()
    }, [cardId])

    useEffect(() => {
        const encounteredSet = loadCardSet(ENCOUNTERED_STORAGE_KEY)
        const likedSet = loadCardSet(LIKED_STORAGE_KEY)
        setIsEncountered(encounteredSet.has(cardId))
        setIsLiked(likedSet.has(cardId))
    }, [cardId])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const storageKey = getCommentStorageKey(cardId)
        try {
            const raw = window.localStorage.getItem(storageKey)
            if (raw) {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed)) {
                    setComments(parsed as CardComment[])
                    return
                }
            }
        } catch {
            // ignore parse failures and fall back to defaults
        }

        const defaults = createDefaultComments()
        setComments(defaults)
        window.localStorage.setItem(storageKey, JSON.stringify(defaults))
    }, [cardId])

    useEffect(() => {
        if (!card) return
        const categoryL3Id = card.categoryL3Id
        let cancelled = false

        async function loadRelatedRecommendations() {
            const categoryCards = await getCardsByCategory(categoryL3Id)
            const items = categoryCards
                .filter(item => item.id !== cardId)
                .slice(0, 5)
                .map(item => ({
                    id: item.id,
                    title: item.title || item.question,
                    frequency: item.frequency,
                    favoriteCount: buildMetricFromId(`${item.id}:favorite`, 18, 260)
                }))

            if (!cancelled) {
                setRelatedRecommendations(items)
            }
        }

        loadRelatedRecommendations()
        return () => {
            cancelled = true
        }
    }, [card, cardId])

    useEffect(() => {
        if (!actionHint) return
        const timer = window.setTimeout(() => setActionHint(''), 2200)
        return () => window.clearTimeout(timer)
    }, [actionHint])

    // 所有回调函数在 early return 之前定义
    const localized = card ? getLocalizedCardContent(card, contentLanguage) : null

    const visibleComments = showAllComments ? comments : comments.slice(0, 3)

    const loadAnswer = useCallback(async () => {
        if (!card || card.answer) {
            setShowAnswer(true)
            return
        }
        setIsAnswerLoading(true)
        try {
            const answer = await getCardAnswer(card.id)
            setCard(prev => prev ? { ...prev, answer: answer || undefined } : null)
            setShowAnswer(true)
        } finally {
            setIsAnswerLoading(false)
        }
    }, [card])

    const toggleFavorite = useCallback(async () => {
        const favList = await getDefaultList()
        if (!favList) return

        const newCardIds = isFavorite
            ? favList.cardIds.filter(id => id !== cardId)
            : [...favList.cardIds, cardId]

        await updateList(favList.id, { cardIds: newCardIds })
        setIsFavorite(!isFavorite)
    }, [cardId, isFavorite])

    const toggleEncountered = useCallback(() => {
        setIsEncountered(prev => {
            const next = !prev
            const encounteredSet = loadCardSet(ENCOUNTERED_STORAGE_KEY)
            if (next) {
                encounteredSet.add(cardId)
            } else {
                encounteredSet.delete(cardId)
            }
            saveCardSet(ENCOUNTERED_STORAGE_KEY, encounteredSet)
            setActionHint(next ? t('card.encounteredMarked') : t('card.encounteredUnmarked'))
            return next
        })
    }, [cardId, t])

    const toggleLike = useCallback(() => {
        setIsLiked(prev => {
            const next = !prev
            const likedSet = loadCardSet(LIKED_STORAGE_KEY)
            if (next) {
                likedSet.add(cardId)
            } else {
                likedSet.delete(cardId)
            }
            saveCardSet(LIKED_STORAGE_KEY, likedSet)
            setActionHint(next ? t('card.liked') : t('card.unliked'))
            return next
        })
    }, [cardId, t])

    const shareCard = useCallback(async () => {
        if (typeof window === 'undefined' || !card) return
        const shareUrl = window.location.href

        if (navigator.share) {
            try {
                await navigator.share({
                    title: card.title,
                    text: localized?.question || card.question,
                    url: shareUrl
                })
                setActionHint(t('card.shareSuccess'))
                return
            } catch {
                // 用户取消分享或系统分享失败时，尝试复制链接
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl)
            setActionHint(t('card.shareSuccess'))
        } catch {
            setActionHint(t('card.shareFailed'))
        }
    }, [card, localized?.question, t])

    const submitFeedback = useCallback((e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const content = feedbackText.trim()
        if (!content || !card) {
            setActionHint(t('card.feedbackEmpty'))
            return
        }

        if (typeof window === 'undefined') return

        try {
            const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY)
            const history = raw ? JSON.parse(raw) : []
            const nextHistory = Array.isArray(history) ? history : []
            nextHistory.push({
                id: `${cardId}-${Date.now()}`,
                cardId,
                cardTitle: card.title,
                feedbackType,
                content,
                pageUrl: window.location.href,
                createdAt: new Date().toISOString()
            })
            window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(nextHistory))
            setFeedbackOpen(false)
            setFeedbackText('')
            setFeedbackType('content')
            setActionHint(t('card.feedbackSaved'))
        } catch {
            setActionHint(t('card.feedbackFailed'))
        }
    }, [card, cardId, feedbackText, feedbackType, t])

    const submitComment = useCallback(() => {
        const content = commentInput.trim()
        if (!content) {
            setActionHint(t('card.commentEmpty'))
            return
        }
        if (content.length > COMMENT_MAX_LENGTH) {
            setActionHint(t('card.commentTooLong', { count: COMMENT_MAX_LENGTH }))
            return
        }
        if (typeof window === 'undefined') return

        const newComment: CardComment = {
            id: `comment-${cardId}-${Date.now()}`,
            author: t('card.commentMe'),
            role: t('card.commentRole'),
            content,
            createdAt: new Date().toISOString(),
            likeCount: 0,
            replyCount: 0
        }

        const nextComments = [newComment, ...comments]
        setComments(nextComments)
        setShowAllComments(false)
        setCommentInput('')
        window.localStorage.setItem(getCommentStorageKey(cardId), JSON.stringify(nextComments))
        setActionHint(t('card.commentSent'))
    }, [cardId, commentInput, comments, t])

    // 加载中状态
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        )
    }

    // 卡片不存在
    if (!card) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[#94A3B8] mb-4">{t('card.notFound')}</p>
                    <Link href="/library" className="text-[#2563EB] hover:underline">
                        {t('card.backLibrary')}
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
                    <div className="min-w-0">
                        {/* 顶部导航 */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => router.push(backToLibraryHref)}
                                className="flex items-center gap-2 text-[#475569] hover:text-[#0F172A] transition-colors"
                            >
                                <ArrowLeft size={20} />
                                {t('card.back')}
                            </button>
                            <Link
                                href={`/review/qa?cardId=${cardId}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                            >
                                <PlayCircle size={18} />
                                {t('card.quickReview')}
                            </Link>
                        </div>
                        {actionHint && (
                            <p className="mb-4 text-sm text-[#475569]">{actionHint}</p>
                        )}

                {/* 题目信息 */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* 头部 */}
                    <div className="p-6 border-b border-[#E2E8F0]">
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="px-3 py-1 text-sm bg-[#DBEAFE] text-[#1D4ED8] rounded-full">
                                    {card.categoryL3Id}
                                </span>
                                {card.upstreamSource && (
                                    <span className="text-xs text-[#94A3B8]">
                                        {t('card.source')}: {card.upstreamSource}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <MasteryBadge mastery={card.mastery} size="sm" />
                                <button
                                    onClick={toggleFavorite}
                                    className={`p-1.5 rounded-lg transition-colors ${isFavorite
                                        ? 'bg-yellow-100 text-yellow-600'
                                        : 'bg-[#F1F5F9] text-[#94A3B8] hover:bg-[#E2E8F0]'
                                        }`}
                                    title={isFavorite ? t('card.removeFavorite') : t('card.addFavorite')}
                                >
                                    <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                    onClick={toggleEncountered}
                                    className={`p-1.5 rounded-lg transition-colors ${isEncountered
                                        ? 'bg-[#DBEAFE] text-[#2563EB]'
                                        : 'bg-[#F1F5F9] text-[#94A3B8] hover:bg-[#E2E8F0]'
                                        }`}
                                    title={isEncountered ? t('card.unmarkEncountered') : t('card.markEncountered')}
                                >
                                    <CheckSquare size={15} />
                                </button>
                            </div>
                        </div>
                        <h1 className="text-xl font-bold text-[#0F172A]">
                            {localized?.question || card.question}
                        </h1>
                    </div>

                    {/* 答案内容 */}
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
                            <span className="w-1 h-5 bg-[#2563EB] rounded-full"></span>
                            {t('card.referenceAnswer')}
                        </h2>
                        {!showAnswer && (
                            <button
                                onClick={loadAnswer}
                                className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                            >
                                {isAnswerLoading ? t('common.loading') : t('card.showAnswer')}
                            </button>
                        )}
                        <div className="prose prose-blue max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-[#2563EB] prose-code:bg-[#EFF6FF] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                            >
                                {showAnswer ? (localized?.answer || t('flashcard.noAnswer')) : ''}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* 底部信息 */}
                    <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0]">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#94A3B8]">
                            <div className="flex items-center gap-4">
                                <span>{t('card.reviewCount')}: {card.reviewCount}</span>
                                <span>{t('card.difficulty')}: {card.difficulty}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span>
                                    {t('card.lastReviewed')}: {card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : t('card.never')}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={toggleLike}
                                        className={`p-1.5 rounded-md transition-colors ${isLiked
                                            ? 'bg-red-100 text-red-500'
                                            : 'bg-[#E2E8F0]/70 text-[#94A3B8] hover:bg-[#E2E8F0]'
                                            }`}
                                        title={isLiked ? t('card.unlike') : t('card.like')}
                                    >
                                        <ThumbsUp size={14} fill={isLiked ? 'currentColor' : 'none'} />
                                    </button>
                                    <button
                                        onClick={shareCard}
                                        className="p-1.5 rounded-md bg-[#E2E8F0]/70 text-[#94A3B8] hover:bg-[#E2E8F0] transition-colors"
                                        title={t('card.share')}
                                    >
                                        <Share2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => setFeedbackOpen(true)}
                                        className="p-1.5 rounded-md bg-[#E2E8F0]/70 text-[#94A3B8] hover:bg-[#E2E8F0] transition-colors"
                                        title={t('card.feedback')}
                                    >
                                        <MessageSquare size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#E2E8F0]">
                        <h2 className="text-lg font-semibold text-[#0F172A]">
                            {t('card.commentsTitle', { count: comments.length })}
                        </h2>

                        <div className="mt-5 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center font-semibold shrink-0">
                                {t('card.commentMe')}
                            </div>
                            <div className="flex-1">
                                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[#E2E8F0]">
                                    <textarea
                                        rows={2}
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        maxLength={COMMENT_MAX_LENGTH}
                                        placeholder={t('card.commentPlaceholder')}
                                        className="w-full resize-none bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                                    />
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-xs text-[#94A3B8]">
                                            {commentInput.length}/{COMMENT_MAX_LENGTH}
                                        </span>
                                        <button
                                            onClick={submitComment}
                                            className="px-3 py-1.5 text-sm rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!commentInput.trim()}
                                        >
                                            {t('card.commentSend')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 pb-6 pt-4">
                        {visibleComments.length === 0 ? (
                            <p className="text-[#94A3B8] text-sm">{t('card.commentEmptyList')}</p>
                        ) : (
                            <div className="space-y-6">
                                {visibleComments.map(comment => (
                                    <div key={comment.id} className="border-b border-[#E2E8F0] last:border-b-0 pb-6 last:pb-0">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center text-sm font-medium shrink-0">
                                                {comment.author.slice(0, 1)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm text-[#0F172A] font-semibold">{comment.author}</span>
                                                        {comment.role && (
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#94A3B8]">
                                                                {comment.role}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {comment.isHot && (
                                                        <span className="text-orange-500 text-xs font-semibold">{t('card.commentHot')}</span>
                                                    )}
                                                </div>

                                                <p className="mt-2 text-sm text-[#0F172A] leading-6 whitespace-pre-wrap">{comment.content}</p>

                                                <div className="mt-3 flex items-center gap-5 text-xs text-[#94A3B8]">
                                                    <span>{formatRelativeTime(comment.createdAt, uiLanguage)}</span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <ThumbsUp size={16} />
                                                        {comment.likeCount}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <MessageCircle size={16} />
                                                        {comment.replyCount}
                                                    </span>
                                                    <button className="inline-flex items-center" title={t('card.commentMore')}>
                                                        <MoreHorizontal size={16} />
                                                    </button>
                                                </div>

                                                {comment.replies && comment.replies.length > 0 && (
                                                    <div className="mt-4 pl-4 border-l-2 border-[#E2E8F0] space-y-3">
                                                        {comment.replies.slice(0, 2).map(reply => (
                                                            <div key={reply.id}>
                                                                <p className="text-[#0F172A] text-xs leading-5">
                                                                    <span className="font-medium text-[#0F172A]">{reply.author}</span>
                                                                    {' : '}
                                                                    {reply.content}
                                                                </p>
                                                                <div className="mt-1 text-xs text-[#94A3B8] inline-flex items-center gap-3">
                                                                    <span>{formatRelativeTime(reply.createdAt, uiLanguage)}</span>
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <ThumbsUp size={14} />
                                                                        {reply.likeCount}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {comment.replies.length > 2 && (
                                                            <button className="text-sm text-[#94A3B8] hover:text-[#475569] transition-colors">
                                                                {t('card.commentViewAllReplies', { count: comment.replies.length })}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {comments.length > 3 && !showAllComments && (
                            <button
                                onClick={() => setShowAllComments(true)}
                                className="w-full mt-6 py-4 rounded-lg bg-[#F1F5F9] text-[#475569] text-base font-semibold hover:bg-[#E2E8F0] transition-colors"
                            >
                                {t('card.commentViewAllComments', { count: comments.length })}
                            </button>
                        )}
                    </div>
                </div>

                    </div>
                    <aside className="mt-6 lg:mt-0 lg:fixed lg:right-6 lg:bottom-6 lg:w-80 lg:z-30">
                        <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-5 lg:max-h-[70vh] lg:overflow-y-auto">
                            <h2 className="text-xl leading-none font-bold text-[#0F172A]">{t('card.relatedTitle')}</h2>
                            <div className="mt-4 border-t border-[#E2E8F0] pt-3">
                                {relatedRecommendations.length === 0 ? (
                                    <p className="text-sm text-[#94A3B8] py-3">{t('card.relatedEmpty')}</p>
                                ) : (
                                    <div className="space-y-3">
                                        {relatedRecommendations.map((item) => (
                                            <Link
                                                key={item.id}
                                                href={buildCardDetailHref(item.id)}
                                                className="block pb-3 border-b border-[#E2E8F0] last:border-b-0 last:pb-0 hover:opacity-80 transition-opacity"
                                            >
                                                <p className="text-sm leading-tight font-semibold text-[#0F172A] truncate">
                                                    {item.title}
                                                </p>
                                                <p className="mt-1 text-xs leading-none text-[#94A3B8]">
                                                    {t('card.relatedFrequency', {
                                                        level: item.frequency === 'high'
                                                            ? t('frequency.high')
                                                            : item.frequency === 'mid'
                                                                ? t('frequency.mid')
                                                                : t('frequency.low')
                                                    })}
                                                    {' · '}
                                                    {t('card.relatedFavorites', { count: item.favoriteCount })}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {feedbackOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
                    onClick={() => setFeedbackOpen(false)}
                >
                    <div
                        className="w-full max-w-xl bg-white rounded-2xl shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[#0F172A]">{t('card.feedbackTitle')}</h2>
                            <button
                                onClick={() => setFeedbackOpen(false)}
                                className="p-1 text-[#94A3B8] hover:text-[#475569] transition-colors"
                                title={t('card.feedbackClose')}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={submitFeedback} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-[#475569] mb-2">{t('card.feedbackType')}</label>
                                <select
                                    value={feedbackType}
                                    onChange={(e) => setFeedbackType(e.target.value)}
                                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                                >
                                    <option value="content">{t('card.feedbackTypeContent')}</option>
                                    <option value="bug">{t('card.feedbackTypeBug')}</option>
                                    <option value="suggestion">{t('card.feedbackTypeSuggestion')}</option>
                                    <option value="other">{t('card.feedbackTypeOther')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-[#475569] mb-2">{t('card.feedbackContent')}</label>
                                <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    rows={5}
                                    placeholder={t('card.feedbackPlaceholder')}
                                    className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setFeedbackOpen(false)}
                                    className="px-4 py-2 rounded-lg text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
                                >
                                    {t('card.feedbackCancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors"
                                >
                                    {t('card.feedbackSubmit')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
