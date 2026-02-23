'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { PlayCircle, TrendingUp, Clock, Target, Flame } from 'lucide-react'
import { MasteryProgress } from '@/components/MasteryBadge'
import { getCategories, getMasteryStats, getDomainStats, initializeDefaultData, getDueCount } from '@/lib/data-service'
import { useI18n } from '@/i18n/provider'
import { getLocalizedCategoryName } from '@/i18n/content'
import type { MasteryStatus, Category } from '@/types'

export default function DashboardPage() {
    const { contentLanguage, t } = useI18n()
    const [masteryStats, setMasteryStats] = useState<Record<MasteryStatus, number>>({
        new: 0, fuzzy: 0, 'can-explain': 0, solid: 0
    })
    const [domainStats, setDomainStats] = useState<Map<string, { total: number; solid: number }>>(new Map())
    const [domains, setDomains] = useState<Category[]>([])
    const [totalCards, setTotalCards] = useState(0)
    const [dueCount, setDueCount] = useState(0)
    const [streak] = useState(0)

    useEffect(() => {
        async function loadData() {
            // 初始化默认数据
            await initializeDefaultData()

            // 获取统计
            const stats = await getMasteryStats()
            setMasteryStats(stats)
            setTotalCards(Object.values(stats).reduce((a, b) => a + b, 0))

            // 获取领域统计
            const dStats = await getDomainStats()
            setDomainStats(dStats)

            // 获取领域（L2）
            const domainCategories = await getCategories(2)
            setDomains(domainCategories)

            // 获取到期数
            const due = await getDueCount(new Date())
            setDueCount(due)
        }
        loadData()
    }, [])

    const solidRate = totalCards > 0
        ? Math.round((masteryStats.solid / totalCards) * 100)
        : 0
    const visibleDomains = useMemo(() => {
        const withData = domains.filter(domain => (domainStats.get(domain.id)?.total || 0) > 0)
        return withData.length > 0 ? withData : domains
    }, [domains, domainStats])

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                {/* 标题 */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-[#0F172A]">
                        {t('dashboard.title')}
                    </h1>
                    <p className="text-[#475569] mt-1">
                        {t('dashboard.subtitle')}
                    </p>
                </div>

                {/* KPI 卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <KPICard
                        icon={<Target className="text-[#2563EB]" />}
                        label={t('dashboard.kpi.totalQuestions')}
                        value={totalCards}
                        subtext={t('dashboard.kpi.unit.questions')}
                    />
                    <KPICard
                        icon={<TrendingUp className="text-[#10B981]" />}
                        label={t('dashboard.kpi.masteryRate')}
                        value={`${solidRate}%`}
                        subtext={t('dashboard.kpi.unit.mastered')}
                    />
                    <KPICard
                        icon={<Clock className="text-[#F59E0B]" />}
                        label={t('dashboard.kpi.dueToday')}
                        value={dueCount}
                        subtext={t('dashboard.kpi.unit.due')}
                    />
                    <KPICard
                        icon={<Flame className="text-[#EF4444]" />}
                        label={t('dashboard.kpi.studyStreak')}
                        value={streak}
                        subtext={t('dashboard.kpi.unit.days')}
                    />
                </div>

                {/* 开始复习按钮 */}
                <div className="bg-gradient-to-r from-[#0B1F3B] to-[#2563EB] rounded-2xl p-6 mb-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-2">{t('dashboard.hero.title')}</h2>
                            <p className="text-[#DBEAFE]">
                                {dueCount > 0
                                    ? t('dashboard.hero.dueMessage', { count: dueCount })
                                    : t('dashboard.hero.caughtUp')
                                }
                            </p>
                        </div>
                        <Link
                            href="/review/qa"
                            className="flex items-center gap-2 px-6 py-3 bg-white text-[#2563EB] rounded-xl font-medium hover:bg-[#EFF6FF] transition-colors"
                        >
                            <PlayCircle size={20} />
                            {t('dashboard.hero.startReview')}
                        </Link>
                    </div>
                </div>

                {/* 掌握度分布 */}
                <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-[#CBD5E1]">
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-4">{t('dashboard.masteryTitle')}</h3>
                    <MasteryProgress stats={masteryStats} showLabels={true} />
                </div>

                {/* 领域覆盖度 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1]">
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-4">{t('dashboard.domainTitle')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {visibleDomains.map(domain => {
                            const stats = domainStats.get(domain.id) || { total: 0, solid: 0 }
                            const rate = stats.total > 0 ? Math.round((stats.solid / stats.total) * 100) : 0

                            return (
                                <div
                                    key={domain.id}
                                    className="p-4 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]"
                                >
                                    <div className="font-medium text-[#0F172A]">{getLocalizedCategoryName(domain, contentLanguage)}</div>
                                    <div className="text-sm text-[#475569] mt-1">
                                        {t('dashboard.domain.mastered', { solid: stats.solid, total: stats.total })}
                                    </div>
                                    <div className="mt-2 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#10B981] rounded-full transition-all"
                                            style={{ width: `${rate}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

function KPICard({
    icon,
    label,
    value,
    subtext
}: {
    icon: ReactNode
    label: string
    value: number | string
    subtext: string
}) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1]">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-center">
                    {icon}
                </div>
                <span className="text-sm text-[#475569]">{label}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#0F172A]">{value}</span>
                <span className="text-sm text-[#94A3B8]">{subtext}</span>
            </div>
        </div>
    )
}
