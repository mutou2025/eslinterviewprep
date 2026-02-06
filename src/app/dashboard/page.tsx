'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlayCircle, TrendingUp, Clock, Target, Flame } from 'lucide-react'
import { MasteryProgress } from '@/components/MasteryBadge'
import { getCategories, getMasteryStats, getDomainStats, initializeDefaultData, getDueCount } from '@/lib/data-service'
import type { MasteryStatus, Category } from '@/types'

export default function DashboardPage() {
    const [masteryStats, setMasteryStats] = useState<Record<MasteryStatus, number>>({
        new: 0, fuzzy: 0, 'can-explain': 0, solid: 0
    })
    const [domainStats, setDomainStats] = useState<Map<string, { total: number; solid: number }>>(new Map())
    const [categories, setCategories] = useState<Category[]>([])
    const [totalCards, setTotalCards] = useState(0)
    const [dueCount, setDueCount] = useState(0)
    const [streak, setStreak] = useState(0)

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
                    <h1 className="text-2xl font-bold text-gray-900">
                        North America Interview Questions
                    </h1>
                    <p className="text-gray-500 mt-1">
                        For Chinese & ESL Job Seekers | 你的学习进度概览
                    </p>
                </div>

                {/* KPI 卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <KPICard
                        icon={<Target className="text-indigo-500" />}
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
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-2">Ready to Practice?</h2>
                            <p className="text-indigo-100">
                                {dueCount > 0
                                    ? `You have ${dueCount} questions to review today`
                                    : 'All caught up! Explore new topics or review your favorites'
                                }
                            </p>
                        </div>
                        <Link
                            href="/review/qa"
                            className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-medium hover:bg-indigo-50 transition-colors"
                        >
                            <PlayCircle size={20} />
                            Start Review
                        </Link>
                    </div>
                </div>

                {/* 掌握度分布 */}
                <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">掌握度分布</h3>
                    <MasteryProgress stats={masteryStats} showLabels={true} />
                </div>

                {/* 领域覆盖度 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">领域覆盖度</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {categories.map(cat => {
                            const stats = domainStats.get(cat.id) || { total: 0, solid: 0 }
                            const rate = stats.total > 0 ? Math.round((stats.solid / stats.total) * 100) : 0

                            return (
                                <Link
                                    key={cat.id}
                                    href={`/library/categories/${cat.id}`}
                                    className="p-4 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
                                >
                                    <div className="font-medium text-gray-900">{cat.name}</div>
                                    <div className="text-sm text-gray-500 mt-1">
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
        <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                    {icon}
                </div>
                <span className="text-sm text-gray-500">{label}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{value}</span>
                <span className="text-sm text-gray-400">{subtext}</span>
            </div>
        </div>
    )
}
