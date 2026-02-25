'use client'

import type { MasteryStatus } from '@/types'
import { useI18n } from '@/i18n/provider'

interface MasteryBadgeProps {
    mastery: MasteryStatus
    size?: 'sm' | 'md' | 'lg'
}

const masteryConfig: Record<MasteryStatus, { labelKey: 'mastery.new' | 'mastery.fuzzy' | 'mastery.canExplain' | 'mastery.solid'; color: string; bg: string; icon: string }> = {
    'new': {
        labelKey: 'mastery.new',
        color: 'text-[#475569]',
        bg: 'bg-[#F1F5F9]',
        icon: '○'
    },
    'fuzzy': {
        labelKey: 'mastery.fuzzy',
        color: 'text-[#F59E0B]',
        bg: 'bg-[#FEF3C7]',
        icon: '◐'
    },
    'can-explain': {
        labelKey: 'mastery.canExplain',
        color: 'text-[#2563EB]',
        bg: 'bg-[#DBEAFE]',
        icon: '◕'
    },
    'solid': {
        labelKey: 'mastery.solid',
        color: 'text-[#10B981]',
        bg: 'bg-[#D1FAE5]',
        icon: '●'
    }
}

const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
}

export function MasteryBadge({ mastery, size = 'md' }: MasteryBadgeProps) {
    const { t } = useI18n()
    const config = masteryConfig[mastery]

    return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full ${config.bg} ${config.color} ${sizeClasses[size]}`}>
            <span>{config.icon}</span>
            <span>{t(config.labelKey)}</span>
        </span>
    )
}

interface MasteryProgressProps {
    stats: Record<MasteryStatus, number>
    showLabels?: boolean
}

export function MasteryProgress({ stats, showLabels = true }: MasteryProgressProps) {
    const { t } = useI18n()
    const total = Object.values(stats).reduce((a, b) => a + b, 0)
    if (total === 0) return null

    const items: { key: MasteryStatus; width: number; color: string }[] = [
        { key: 'solid', width: (stats.solid / total) * 100, color: 'bg-[#10B981]' },
        { key: 'can-explain', width: (stats['can-explain'] / total) * 100, color: 'bg-[#2563EB]' },
        { key: 'fuzzy', width: (stats.fuzzy / total) * 100, color: 'bg-[#60A5FA]' },
        { key: 'new', width: (stats.new / total) * 100, color: 'bg-[#CBD5E1]' },
    ]

    return (
        <div className="space-y-2">
            {/* 进度条 */}
            <div className="h-3 bg-[#E2E8F0] rounded-full overflow-hidden flex">
                {items.map(item => (
                    item.width > 0 && (
                        <div
                            key={item.key}
                            className={`${item.color} transition-all duration-300`}
                            style={{ width: `${item.width}%` }}
                        />
                    )
                ))}
            </div>

            {/* 图例 */}
            {showLabels && (
                <div className="flex flex-wrap gap-4 text-sm">
                    {(Object.entries(masteryConfig) as [MasteryStatus, typeof masteryConfig[MasteryStatus]][]).map(([key, config]) => (
                        <div key={key} className="flex items-center gap-1">
                            <span className={`w-3 h-3 rounded-full ${config.bg}`} />
                            <span className="text-[#475569]">{t(config.labelKey)}</span>
                            <span className="text-[#94A3B8]">({stats[key] || 0})</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
