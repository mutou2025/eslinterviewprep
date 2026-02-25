'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
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
    onPrevious,
    onNext,
}: FlashcardControlsProps) {
    const { t } = useI18n()

    return (
        <div className="py-2">
            <div className="flex items-center justify-center gap-5 md:gap-10">
                <button
                    onClick={onPrevious}
                    className="h-11 w-11 text-[#475569] hover:text-[#0F172A] transition-colors disabled:opacity-40"
                    disabled={totalCount === 0}
                >
                    <ChevronLeft size={20} strokeWidth={1.8} />
                </button>

                <span className="min-w-[40px] text-center text-[20px] font-medium leading-none text-[#334155] md:text-[20px]">
                    {totalCount > 0 ? `${currentIndex + 1} / ${totalCount}` : '0 / 0'}
                </span>

                <button
                    onClick={onNext}
                    className="h-11 w-11 text-[#475569] hover:text-[#0F172A] transition-colors disabled:opacity-40"
                    disabled={totalCount === 0}
                >
                    <ChevronRight size={20} strokeWidth={1.8} />
                </button>
            </div>

            <p className="mt-8 text-center text-sm text-[#94A3B8] md:text-[15px]">
                {t('review.shortcutsLine')}
            </p>
        </div>
    )
}
