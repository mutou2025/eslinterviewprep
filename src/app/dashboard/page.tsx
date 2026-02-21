'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlayCircle, TrendingUp, Clock, Target, Flame } from 'lucide-react'
import { MasteryProgress } from '@/components/MasteryBadge'
import { getCategories, getMasteryStats, getDomainStats, initializeDefaultData, getDueCount } from '@/lib/data-service'
import { useI18n } from '@/i18n/provider'
import { getLocalizedCategoryName } from '@/i18n/content'
import type { MasteryStatus, Category } from '@/types'

export default function DashboardPage() {
    const { contentLanguage } = useI18n()
    const [masteryStats, setMasteryStats] = useState<Record<MasteryStatus, number>>({
        new: 0, fuzzy: 0, 'can-explain': 0, solid: 0
    })
    const [domainStats, setDomainStats] = useState<Map<string, { total: number; solid: number }>>(new Map())
    const [categories, setCategories] = useState<Category[]>([])
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

            // 获取分类
            const cats = await getCategories(3)
            setCategories(cats)

            // 获取到期数
            const due = await getDueCount(new Date())
            setDueCount(due)
        }
        loadData()
    }, [])

    const solidRate = totalCards > 0
        ? Math.round((masteryStats.solid / totalCards) * 100)
        : 0

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                {/* 标题 */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-[#1f2328]">
                        North America Interview Questions
                    </h1>
                    <p className="text-[#57606a] mt-1">
                        For Chinese & ESL Job Seekers | 你的学习进度概览
                    </p>
                </div>

                {/* KPI 卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <KPICard
                        icon={<Target className="text-blue-500" />}
                        label="Total Questions"
                        value={totalCards}
                        subtext="道面试题"
                    />
                    <KPICard
                        icon={<TrendingUp className="text-green-500" />}
                        label="Mastery Rate"
                        value={`${solidRate}%`}
                        subtext="已熟练掌握"
                    />
                    <KPICard
                        icon={<Clock className="text-orange-500" />}
                        label="Due Today"
                        value={dueCount}
                        subtext="道需要复习"
                    />
                    <KPICard
                        icon={<Flame className="text-red-500" />}
                        label="Study Streak"
                        value={streak}
                        subtext="天"
                    />
                </div>

                {/* 开始复习按钮 */}
                <div className="bg-gradient-to-r from-slate-900 to-blue-700 rounded-2xl p-6 mb-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-2">Ready to Practice?</h2>
                            <p className="text-blue-100">
                                {dueCount > 0
                                    ? `You have ${dueCount} questions to review today`
                                    : 'All caught up! Explore new topics or review your favorites'
                                }
                            </p>
                        </div>
                        <Link
                            href="/review/qa"
                            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors"
                        >
                            <PlayCircle size={20} />
                            Start Review
                        </Link>
                    </div>
                </div>

                {/* 掌握度分布 */}
                <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-[#d0d7de]">
                    <h3 className="text-lg font-semibold text-[#1f2328] mb-4">掌握度分布</h3>
                    <MasteryProgress stats={masteryStats} showLabels={true} />
                </div>

                {/* 领域覆盖度 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#d0d7de]">
                    <h3 className="text-lg font-semibold text-[#1f2328] mb-4">领域覆盖度</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {categories.map(cat => {
                            const stats = domainStats.get(cat.id) || { total: 0, solid: 0 }
                            const rate = stats.total > 0 ? Math.round((stats.solid / stats.total) * 100) : 0

                            return (
                                <Link
                                    key={cat.id}
                                    href={`/library/categories/${cat.id}`}
                                    className="p-4 border border-[#d8dee4] rounded-xl hover:border-[#b6e3ff] hover:bg-[#f6f8fa] transition-colors"
                                >
                                    <div className="font-medium text-[#1f2328]">{getLocalizedCategoryName(cat, contentLanguage)}</div>
                                    <div className="text-sm text-[#57606a] mt-1">
                                        {stats.solid} / {stats.total} 已掌握
                                    </div>
                                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full transition-all"
                                            style={{ width: `${rate}%` }}
                                        />
                                    </div>
                                </Link>
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
    icon: React.ReactNode
    label: string
    value: number | string
    subtext: string
}) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#d0d7de]">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#f6f8fa] border border-[#d8dee4] rounded-xl flex items-center justify-center">
                    {icon}
                </div>
                <span className="text-sm text-[#57606a]">{label}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#1f2328]">{value}</span>
                <span className="text-sm text-[#6e7781]">{subtext}</span>
            </div>
        </div>
    )
}
