'use client'

import { ChevronLeft, ChevronRight, Play, Shuffle, Maximize2, Pause } from 'lucide-react'
import { useI18n } from '@/i18n/provider'

interface FlashcardControlsProps {
    currentIndex: number
    totalCount: number
    isPlaying?: boolean
    onPrevious: () => void
    onNext: () => void
    onShuffle?: () => void
    onPlay?: () => void
    onFullscreen?: () => void
}

export function FlashcardControls({
    currentIndex,
    totalCount,
    isPlaying = false,
    onPrevious,
    onNext,
    onShuffle,
    onPlay,
    onFullscreen
}: FlashcardControlsProps) {
    const { t } = useI18n()

    return (
        <div className="flex items-center justify-center gap-4 py-4">
            {/* 播放按钮 */}
            {onPlay && (
                <button
                    onClick={onPlay}
                    className="p-2 text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                    title={isPlaying ? t('controls.pause') : t('controls.autoplay')}
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
            )}

            {/* 随机按钮 */}
            {onShuffle && (
                <button
                    onClick={onShuffle}
                    className="p-2 text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                    title={t('controls.shuffle')}
                >
                    <Shuffle size={20} />
                </button>
            )}

            {/* 上一题 */}
            <button
                onClick={onPrevious}
                className="p-2 text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors disabled:opacity-50"
                disabled={totalCount === 0}
            >
                <ChevronLeft size={24} />
            </button>

            {/* 进度 */}
            <span className="text-[#475569] font-medium min-w-[80px] text-center">
                {totalCount > 0 ? `${currentIndex + 1} / ${totalCount}` : '0 / 0'}
            </span>

            {/* 下一题 */}
            <button
                onClick={onNext}
                className="p-2 text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors disabled:opacity-50"
                disabled={totalCount === 0}
            >
                <ChevronRight size={24} />
            </button>

            {/* 全屏按钮 */}
            {onFullscreen && (
                <button
                    onClick={onFullscreen}
                    className="p-2 text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                    title={t('controls.fullscreen')}
                >
                    <Maximize2 size={20} />
                </button>
            )}
        </div>
    )
}
