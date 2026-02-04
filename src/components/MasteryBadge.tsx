import type { MasteryStatus } from '@/types'

interface MasteryBadgeProps {
    mastery: MasteryStatus
    size?: 'sm' | 'md' | 'lg'
}

const masteryConfig: Record<MasteryStatus, { label: string; color: string; bg: string; icon: string }> = {
    'new': {
        label: '未学',
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        icon: '○'
    },
    'fuzzy': {
        label: '模糊',
        color: 'text-orange-600',
        bg: 'bg-orange-100',
        icon: '◐'
    },
    'can-explain': {
        label: '会讲',
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        icon: '◕'
    },
    'solid': {
        label: '熟练',
        color: 'text-green-600',
        bg: 'bg-green-100',
        icon: '●'
    }
}

const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
}

export function MasteryBadge({ mastery, size = 'md' }: MasteryBadgeProps) {
    const config = masteryConfig[mastery]

    return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full ${config.bg} ${config.color} ${sizeClasses[size]}`}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </span>
    )
}

interface MasteryProgressProps {
    stats: Record<MasteryStatus, number>
    showLabels?: boolean
}

export function MasteryProgress({ stats, showLabels = true }: MasteryProgressProps) {
    const total = Object.values(stats).reduce((a, b) => a + b, 0)
    if (total === 0) return null

    const items: { key: MasteryStatus; width: number; color: string }[] = [
        { key: 'solid', width: (stats.solid / total) * 100, color: 'bg-green-500' },
        { key: 'can-explain', width: (stats['can-explain'] / total) * 100, color: 'bg-blue-500' },
        { key: 'fuzzy', width: (stats.fuzzy / total) * 100, color: 'bg-orange-500' },
        { key: 'new', width: (stats.new / total) * 100, color: 'bg-gray-300' },
    ]

    return (
        <div className="space-y-2">
            {/* 进度条 */}
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
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
                            <span className="text-gray-600">{config.label}</span>
                            <span className="text-gray-400">({stats[key] || 0})</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
