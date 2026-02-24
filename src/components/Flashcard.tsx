'use client'

import { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
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
}

const masteryConfig: Record<MasteryStatus, { labelKey: 'mastery.new' | 'mastery.fuzzy' | 'mastery.canExplain' | 'mastery.solid'; color: string; bg: string }> = {
    'new': { labelKey: 'mastery.new', color: 'text-[#EF4444]', bg: 'bg-[#FEE2E2] hover:bg-[#FECACA]' },
    'fuzzy': { labelKey: 'mastery.fuzzy', color: 'text-[#F59E0B]', bg: 'bg-[#FEF3C7] hover:bg-[#FDE68A]' },
    'can-explain': { labelKey: 'mastery.canExplain', color: 'text-[#2563EB]', bg: 'bg-[#DBEAFE] hover:bg-[#BFDBFE]' },
    'solid': { labelKey: 'mastery.solid', color: 'text-[#10B981]', bg: 'bg-[#D1FAE5] hover:bg-[#A7F3D0]' }
}


const difficultyConfig: Record<string, { labelKey: 'difficulty.easy' | 'difficulty.mustKnow' | 'difficulty.hard' | 'difficulty.handWrite'; color: string }> = {
    'easy': { labelKey: 'difficulty.easy', color: 'bg-green-100 text-green-700' },
    'must-know': { labelKey: 'difficulty.mustKnow', color: 'bg-red-100 text-red-700' },
    'hard': { labelKey: 'difficulty.hard', color: 'bg-[#DBEAFE] text-[#1D4ED8]' },
    'hand-write': { labelKey: 'difficulty.handWrite', color: 'bg-yellow-100 text-yellow-700' }

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
    isAnswerLoading = false
}: FlashcardProps) {
    const { t, contentLanguage } = useI18n()
    const cardContainerRef = useRef<HTMLDivElement>(null)
    const answerContentRef = useRef<HTMLDivElement>(null)
    const localized = getLocalizedCardContent(card, contentLanguage)

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
                                <div className="flex flex-wrap gap-2 p-4 border-b border-[#E2E8F0]">
                                    {/* 分类 */}
                                    <span className="px-2 py-1 text-xs font-medium bg-[#DBEAFE] text-[#1D4ED8] rounded-full">
                                        {card.categoryL3Id}
                                    </span>
                                    {/* 题型 */}
                                    <span className="px-2 py-1 text-xs font-medium bg-[#F1F5F9] text-[#475569] rounded-full">
                                        {card.questionType}
                                    </span>
                                    {/* 频率 */}
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${frequencyConfig[card.frequency]?.color || 'bg-[#F1F5F9]'}`}>
                                        {frequencyConfig[card.frequency] ? t(frequencyConfig[card.frequency].labelKey) : card.frequency}
                                    </span>
                                    {/* 难度 */}
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${difficultyConfig[card.difficulty]?.color || 'bg-[#F1F5F9]'}`}>
                                        {difficultyConfig[card.difficulty] ? t(difficultyConfig[card.difficulty].labelKey) : card.difficulty}
                                    </span>
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
