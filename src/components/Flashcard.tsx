'use client'

import { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Card, MasteryStatus } from '@/types'
import 'highlight.js/styles/github-dark.css'

interface FlashcardProps {
    card: Card
    isFlipped: boolean
    onFlip: () => void
    onMarkMastery: (mastery: MasteryStatus) => void
    showTags?: boolean
}

const masteryConfig: Record<MasteryStatus, { label: string; color: string; bg: string }> = {
    'new': { label: '未学', color: 'text-gray-600', bg: 'bg-gray-100 hover:bg-gray-200' },
    'fuzzy': { label: '模糊', color: 'text-orange-600', bg: 'bg-orange-100 hover:bg-orange-200' },
    'can-explain': { label: '会讲', color: 'text-blue-600', bg: 'bg-blue-100 hover:bg-blue-200' },
    'solid': { label: '熟练', color: 'text-green-600', bg: 'bg-green-100 hover:bg-green-200' }
}

const difficultyConfig: Record<string, { label: string; color: string }> = {
    'easy': { label: '简单', color: 'bg-green-100 text-green-700' },
    'must-know': { label: '必考', color: 'bg-red-100 text-red-700' },
    'hard': { label: '困难', color: 'bg-purple-100 text-purple-700' },
    'hand-write': { label: '手写', color: 'bg-yellow-100 text-yellow-700' }
}

const frequencyConfig: Record<string, { label: string; color: string }> = {
    'high': { label: '高频', color: 'bg-red-50 text-red-600' },
    'mid': { label: '中频', color: 'bg-yellow-50 text-yellow-600' },
    'low': { label: '低频', color: 'bg-gray-50 text-gray-600' }
}

export function Flashcard({ card, isFlipped, onFlip, onMarkMastery, showTags = true }: FlashcardProps) {
    const cardContainerRef = useRef<HTMLDivElement>(null)
    const answerContentRef = useRef<HTMLDivElement>(null)

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

    return (
        <div ref={cardContainerRef} className="w-full max-w-3xl mx-auto">
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
                                <div className="flex flex-wrap gap-2 p-4 border-b border-gray-100">
                                    {/* 分类 */}
                                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                                        {card.categoryL3Id}
                                    </span>
                                    {/* 题型 */}
                                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                        {card.questionType}
                                    </span>
                                    {/* 频率 */}
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${frequencyConfig[card.frequency]?.color || 'bg-gray-100'}`}>
                                        {frequencyConfig[card.frequency]?.label || card.frequency}
                                    </span>
                                    {/* 难度 */}
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${difficultyConfig[card.difficulty]?.color || 'bg-gray-100'}`}>
                                        {difficultyConfig[card.difficulty]?.label || card.difficulty}
                                    </span>
                                </div>
                            )}

                            {/* 题目内容 */}
                            <div className="flex-1 flex flex-col items-center justify-center p-8">
                                <h2 className="text-lg font-semibold text-gray-500 mb-4">
                                    「{card.title}」
                                </h2>
                                <div className="text-xl text-gray-800 text-center prose prose-lg max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                        {card.question}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            {/* 底部提示条 */}
                            <div className="bg-[#303545] text-white text-center py-3 rounded-b-3xl flex items-center justify-center gap-2">
                                <span className="text-sm">单击卡片可翻转</span>
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
                            <div className="p-4 border-b border-gray-100 flex-shrink-0">
                                <h3 className="text-sm font-medium text-gray-500">答案</h3>
                            </div>

                            {/* 答案内容 - 可滚动 */}
                            <div
                                ref={answerContentRef}
                                className="flex-1 overflow-auto p-6"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="prose prose-sm max-w-none prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:overflow-x-auto prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg prose-img:shadow-md">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                        {card.answer || '暂无答案'}
                                    </ReactMarkdown>
                                </div>
                            </div>

                            {/* 掌握度按钮 */}
                            <div className="p-4 border-t border-gray-100 flex-shrink-0">
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
                                            {config.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 text-center mt-2">
                                    快捷键：1=未学 2=模糊 3=会讲 4=熟练
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

