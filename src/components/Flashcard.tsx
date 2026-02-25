'use client'

import { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Star } from 'lucide-react'
import type { Card, MasteryStatus } from '@/types'
import { useI18n } from '@/i18n/provider'
import { getLocalizedCardContent } from '@/i18n/content'
import 'highlight.js/styles/github-dark.css'

interface FlashcardProps {
    card: Card
    isFlipped: boolean
    onFlip: () => void
    onMarkMastery: (mastery: MasteryStatus) => void
    showTags?: boolean
    onLoadAnswer?: () => void
    isAnswerLoading?: boolean
    scopeLabel?: string
    isFavorite?: boolean
    onToggleFavorite?: () => void
    isFavoritePending?: boolean
}

const masteryConfig: Record<MasteryStatus, { labelKey: 'mastery.new' | 'mastery.fuzzy' | 'mastery.canExplain' | 'mastery.solid'; color: string; bg: string }> = {
    'new': { labelKey: 'mastery.new', color: 'text-[#EF4444]', bg: 'bg-[#FEE2E2] hover:bg-[#FECACA]' },
    'fuzzy': { labelKey: 'mastery.fuzzy', color: 'text-[#F59E0B]', bg: 'bg-[#FEF3C7] hover:bg-[#FDE68A]' },
    'can-explain': { labelKey: 'mastery.canExplain', color: 'text-[#2563EB]', bg: 'bg-[#DBEAFE] hover:bg-[#BFDBFE]' },
    'solid': { labelKey: 'mastery.solid', color: 'text-[#10B981]', bg: 'bg-[#D1FAE5] hover:bg-[#A7F3D0]' }
}

const frequencyConfig: Record<string, { labelKey: 'frequency.high' | 'frequency.mid' | 'frequency.low'; color: string }> = {
    'high': { labelKey: 'frequency.high', color: 'bg-red-50 text-red-600' },
    'mid': { labelKey: 'frequency.mid', color: 'bg-yellow-50 text-yellow-600' },
    'low': { labelKey: 'frequency.low', color: 'bg-[#F8FAFC] text-[#475569]' }
}

export function Flashcard({
    card,
    isFlipped,
    onFlip,
    onMarkMastery,
    showTags = true,
    onLoadAnswer,
    isAnswerLoading = false,
    scopeLabel = '',
    isFavorite = false,
    onToggleFavorite,
    isFavoritePending = false
}: FlashcardProps) {
    const { t, contentLanguage, uiLanguage } = useI18n()
    const cardContainerRef = useRef<HTMLDivElement>(null)
    const answerContentRef = useRef<HTMLDivElement>(null)
    const localized = getLocalizedCardContent(card, contentLanguage)
    const frequencyLabel = frequencyConfig[card.frequency] ? t(frequencyConfig[card.frequency].labelKey) : card.frequency
    const masteryLabel = t(masteryConfig[card.mastery].labelKey)
    const masteryBadgeClass: Record<MasteryStatus, string> = {
        new: 'bg-[#FEE2E2] text-[#B91C1C]',
        fuzzy: 'bg-[#FEF3C7] text-[#B45309]',
        'can-explain': 'bg-[#DBEAFE] text-[#1D4ED8]',
        solid: 'bg-[#D1FAE5] text-[#047857]'
    }

    // 翻转时自动滚动到顶部
    useEffect(() => {
        if (!isFlipped && cardContainerRef.current) {
            // 翻回正面时，滚动到卡片顶部
            cardContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
        if (isFlipped && answerContentRef.current) {
            // 翻到背面时，答案区域滚动到顶部
            answerContentRef.current.scrollTop = 0
        }
    }, [isFlipped])

    useEffect(() => {
        if (isFlipped && !card.answer && onLoadAnswer) {
            onLoadAnswer()
        }
    }, [isFlipped, card.answer, card.id, onLoadAnswer])

    return (
        <div ref={cardContainerRef} className="w-full max-w-4xl mx-auto">
            {/* 卡片容器 - 3D 翻转 */}
            <div
                className="relative w-full min-h-[400px] cursor-pointer perspective-1000"
                onClick={onFlip}
                style={{ perspective: '1000px' }}
            >
                <div
                    className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''
                        }`}
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                >
                    {/* 正面 - 题目 */}
                    <div
                        className="absolute inset-0 w-full backface-hidden"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <div className="bg-white rounded-3xl shadow-lg min-h-[400px] flex flex-col">
                            {/* 标签区域 */}
                            {showTags && (
                                <div className="flex items-start justify-between gap-3 p-4 border-b border-[#E2E8F0]">
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-[#94A3B8]">
                                            {uiLanguage === 'en-US' ? 'Review Scope' : '刷题范围'}
                                        </p>
                                        <p className="mt-1 truncate text-sm font-semibold text-[#1E293B]">
                                            {scopeLabel || (uiLanguage === 'en-US' ? 'All Questions' : '全部面试题')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${frequencyConfig[card.frequency]?.color || 'bg-[#F1F5F9] text-[#475569]'}`}>
                                            {frequencyLabel}
                                        </span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${masteryBadgeClass[card.mastery]}`}>
                                            {masteryLabel}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onToggleFavorite?.()
                                            }}
                                            disabled={!onToggleFavorite || isFavoritePending}
                                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${isFavorite
                                                ? 'border-[#F59E0B] bg-[#FEF3C7] text-[#B45309]'
                                                : 'border-[#CBD5E1] bg-white text-[#64748B] hover:border-[#94A3B8] hover:text-[#334155]'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            title={isFavorite
                                                ? (uiLanguage === 'en-US' ? 'Remove from favorites' : '取消收藏')
                                                : (uiLanguage === 'en-US' ? 'Add to favorites' : '加入收藏')}
                                        >
                                            <Star size={15} className={isFavorite ? 'fill-current' : ''} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* 题目内容 */}
                            <div className="flex-1 flex flex-col items-center justify-center p-8">
                                <h2 className="text-lg font-semibold text-[#94A3B8] mb-4">
                                    「{localized.title}」
                                </h2>
                                <div className="text-xl text-[#0F172A] text-center prose prose-lg max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-[#2563EB] prose-code:bg-[#EFF6FF] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                        {localized.question}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            {/* 底部提示条 */}
                            <div className="bg-[#0B1F3B] text-white text-center py-3 rounded-b-3xl flex items-center justify-center gap-2">
                                <span className="text-sm">{t('flashcard.clickToFlip')}</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* 背面 - 答案 */}
                    <div
                        className="absolute inset-0 w-full backface-hidden"
                        style={{
                            backfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)'
                        }}
                    >
                        <div className="bg-white rounded-3xl shadow-lg min-h-[400px] max-h-[80vh] flex flex-col">
                            {/* 答案标题 */}
                            <div className="p-4 border-b border-[#E2E8F0] flex-shrink-0">
                                <h3 className="text-sm font-medium text-[#94A3B8]">{t('flashcard.answer')}</h3>
                            </div>

                            {/* 答案内容 - 可滚动 */}
                            <div
                                ref={answerContentRef}
                                className="flex-1 overflow-auto p-6"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="prose prose-sm max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:overflow-x-auto prose-code:text-[#2563EB] prose-code:bg-[#EFF6FF] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg prose-img:shadow-md">
                                    {isAnswerLoading ? (
                                        <p className="text-sm text-[#94A3B8]">{t('flashcard.answerLoading')}</p>
                                    ) : (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                            {localized.answer || t('flashcard.noAnswer')}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            </div>

                            {/* 掌握度按钮 */}
                            <div className="p-4 border-t border-[#E2E8F0] flex-shrink-0">
                                <div className="flex gap-2 justify-center">
                                    {(Object.entries(masteryConfig) as [MasteryStatus, typeof masteryConfig[MasteryStatus]][]).map(([key, config]) => (
                                        <button
                                            key={key}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onMarkMastery(key)
                                            }}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${config.bg} ${config.color}`}
                                        >
                                            {t(config.labelKey)}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-[#94A3B8] text-center mt-2">
                                    {t('flashcard.shortcuts')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
