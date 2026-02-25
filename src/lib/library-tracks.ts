import type { MessageKey } from '@/i18n/messages'
import type { Category } from '@/types'

export type TechnicalTrackId =
    | 'backend'
    | 'frontend-fullstack'
    | 'testing'
    | 'big-data'
    | 'embedded'

type TechnicalTrack = {
    id: TechnicalTrackId
    labelKey: MessageKey
    keywords: string[]
}

export const TECHNICAL_TRACKS: TechnicalTrack[] = [
    {
        id: 'frontend-fullstack',
        labelKey: 'track.frontendFullstack',
        keywords: [
            'frontend', 'front-end', 'fullstack', 'full-stack', 'web', 'javascript', 'typescript',
            'react', 'vue', 'html', 'css', 'browser', 'http', 'webpack', 'nodejs',
            '前端', '全栈', 'web前端'
        ]
    },
    {
        id: 'backend',
        labelKey: 'track.backend',
        keywords: [
            'backend', 'back-end', 'server', 'api', 'java', 'spring', 'golang', 'go', 'python',
            'node', 'database', 'sql', 'mysql', 'postgres', 'redis', '后端', '服务端', '数据库'
        ]
    },
    {
        id: 'testing',
        labelKey: 'track.testing',
        keywords: [
            'testing', 'test', 'qa', 'quality', 'automation', 'unit test', 'integration', 'e2e',
            'jest', 'cypress', '测试', '质量'
        ]
    },
    {
        id: 'big-data',
        labelKey: 'track.bigData',
        keywords: [
            'big data', 'big-data', 'data', 'hadoop', 'spark', 'flink', 'kafka', 'hive', 'etl',
            'warehouse', '大数据', '数据平台'
        ]
    },
    {
        id: 'embedded',
        labelKey: 'track.embedded',
        keywords: [
            'embedded', 'firmware', 'rtos', 'driver', 'mcu', 'stm32', 'arm', 'iot',
            '嵌入式', '固件', '单片机'
        ]
    }
]

const technicalTrackIds = new Set<TechnicalTrackId>(TECHNICAL_TRACKS.map(track => track.id))
const CURRENT_CONTENT_TRACK: TechnicalTrackId = 'frontend-fullstack'

export function isTechnicalTrackId(value: string | null): value is TechnicalTrackId {
    return value !== null && technicalTrackIds.has(value as TechnicalTrackId)
}

export function getTrackCategoryIds(categories: Category[], trackId: TechnicalTrackId): string[] {
    if (categories.length === 0) return []

    // Current data is frontend-centric; map all existing questions to this track for now.
    if (trackId === CURRENT_CONTENT_TRACK) {
        return categories.map(category => category.id)
    }

    const track = TECHNICAL_TRACKS.find(item => item.id === trackId)
    if (!track) return []

    const matched = categories
        .filter(category => {
            const haystack = `${category.id} ${category.name} ${category.nameEn || ''}`.toLowerCase()
            return track.keywords.some(keyword => haystack.includes(keyword.toLowerCase()))
        })
        .map(category => category.id)

    // If there is no dedicated dataset for this track yet, fall back to all categories
    // so the question bank is still usable.
    return matched.length > 0 ? matched : categories.map(category => category.id)
}
