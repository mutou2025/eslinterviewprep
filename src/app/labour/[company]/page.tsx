'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Plus, Loader2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { getLabourCompanyById, getLabourQuestions, isCurrentUserAdmin } from '@/lib/labour-service'
import type { LabourCompany, LabourQuestion } from '@/types'

// Company icons/emojis mapping
const companyIcons: Record<string, string> = {
    'canada-post': '📬',
    'lifelabs': '🔬',
    'purolator': '📦',
    'fedex': '📮',
}

function QuestionCard({ question }: { question: LabourQuestion }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 hover:border-[#CBD5E1] transition-colors">
            {/* Question */}
            <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{question.question}</ReactMarkdown>
            </div>

            {/* Tags */}
            {question.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                    {question.tags.map(tag => (
                        <span
                            key={tag}
                            className="px-2 py-1 bg-[#F1F5F9] text-[#475569] text-xs rounded-full"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Answer Toggle */}
            {question.answer && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-2 text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {expanded ? '收起答案' : '查看参考答案'}
                    </button>
                    {expanded && (
                        <div className="mt-3 p-4 bg-[#EFF6FF] rounded-lg prose prose-sm max-w-none">
                            <ReactMarkdown>{question.answer}</ReactMarkdown>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default function CompanyQuestionsPage() {
    const params = useParams()
    const companyId = params.company as string

    const [company, setCompany] = useState<LabourCompany | null>(null)
    const [questions, setQuestions] = useState<LabourQuestion[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        async function load() {
            const [companyData, questionsData, adminStatus] = await Promise.all([
                getLabourCompanyById(companyId),
                getLabourQuestions(companyId),
                isCurrentUserAdmin(),
            ])
            setCompany(companyData)
            setQuestions(questionsData)
            setIsAdmin(adminStatus)
            setLoading(false)
        }
        load()
    }, [companyId])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
            </div>
        )
    }

    if (!company) {
        return (
            <div className="text-center py-16">
                <p className="text-[#94A3B8]">公司不存在</p>
                <Link href="/behavior-interview" className="text-[#2563EB] hover:underline mt-2 inline-block">
                    返回公司列表
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Back Link */}
            <Link
                href="/behavior-interview"
                className="inline-flex items-center gap-2 text-[#94A3B8] hover:text-[#475569] mb-6"
            >
                <ArrowLeft size={18} />
                返回公司列表
            </Link>

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <span className="text-4xl">{companyIcons[company.id] || '🏢'}</span>
                    <div>
                        <h1 className="text-2xl font-bold text-[#0F172A]">{company.name}</h1>
                        <p className="text-sm text-[#94A3B8]">{questions.length} 道面试题</p>
                    </div>
                </div>
            </div>

            {/* Admin: Submit Button */}
            {isAdmin && (
                <div className="mb-6">
                    <Link
                        href={`/behavior-interview/submit?company=${companyId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-xl hover:bg-[#1D4ED8] transition-colors font-medium"
                    >
                        <Plus size={18} />
                        添加面试题
                    </Link>
                </div>
            )}

            {/* Questions List */}
            <div className="space-y-4">
                {questions.map(q => (
                    <QuestionCard key={q.id} question={q} />
                ))}
            </div>

            {/* Empty State */}
            {questions.length === 0 && (
                <div className="text-center py-16 bg-[#F8FAFC] rounded-2xl">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-[#94A3B8]">暂无面试题</p>
                    {isAdmin && (
                        <Link
                            href={`/behavior-interview/submit?company=${companyId}`}
                            className="text-[#2563EB] hover:underline mt-2 inline-block"
                        >
                            添加第一道题目
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}
