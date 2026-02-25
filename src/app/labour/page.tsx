'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Building2, ChevronRight, Plus, Loader2 } from 'lucide-react'
import { getLabourCompanies, isCurrentUserAdmin } from '@/lib/labour-service'
import type { LabourCompany } from '@/types'

// Company icons/emojis mapping
const companyIcons: Record<string, string> = {
    'canada-post': '📬',
    'lifelabs': '🔬',
    'purolator': '📦',
    'fedex': '📮',
}

export default function BehaviorInterviewPage() {
    const [companies, setCompanies] = useState<LabourCompany[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        async function load() {
            const [companiesData, adminStatus] = await Promise.all([
                getLabourCompanies(),
                isCurrentUserAdmin(),
            ])
            setCompanies(companiesData)
            setIsAdmin(adminStatus)
            setLoading(false)
        }
        load()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto pt-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#0B1F3B] to-[#2563EB] rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A]">行为面试</h1>
                        <p className="text-sm text-[#94A3B8]">Behavior Questions</p>
                    </div>
                </div>
                <p className="text-[#475569] mt-4">
                    收集 Canada Post、LifeLabs、Purolator、FedEx 等北美工作的 Behavior Interview 面试题目。
                </p>
            </div>

            {/* Admin: Buttons */}
            {isAdmin && (
                <div className="mb-6 flex gap-3">
                    <Link
                        href="/behavior-interview/submit"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] transition-colors font-medium"
                    >
                        <Plus size={18} />
                        提交新面试题
                    </Link>
                    <Link
                        href="/behavior-interview/manage"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] text-[#475569] rounded-xl hover:bg-[#E2E8F0] transition-colors font-medium"
                    >
                        管理公司
                    </Link>
                </div>
            )}

            {/* Company Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {companies.map(company => (
                    <Link
                        key={company.id}
                        href={`/behavior-interview/${company.id}`}
                        className="group bg-white border border-[#E2E8F0] rounded-2xl p-6 hover:border-blue-300 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-start justify-between">
                            <div className="text-4xl mb-4">
                                {companyIcons[company.id] || '🏢'}
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#2563EB] transition-colors" />
                        </div>
                        <h3 className="font-semibold text-[#0F172A] text-lg mb-1">
                            {company.name}
                        </h3>
                        <p className="text-sm text-[#94A3B8]">
                            {company.questionCount ?? 0} 道题目
                        </p>
                    </Link>
                ))}
            </div>

            {/* Empty State */}
            {companies.length === 0 && (
                <div className="text-center py-16">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-[#94A3B8]">暂无公司数据</p>
                    <p className="text-sm text-[#94A3B8] mt-1">请先在数据库中执行行为面试题库 schema</p>
                </div>
            )}
        </div>
    )
}
