'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react'
import { getLabourCompanies, submitLabourQuestion, isCurrentUserAdmin } from '@/lib/labour-service'
import type { LabourCompany } from '@/types'

// Common tags for labour interviews
const COMMON_TAGS = [
    '团队合作',
    '体力要求',
    '时间管理',
    '客户服务',
    '安全意识',
    '问题解决',
    '压力应对',
    '工作经验',
]

function SubmitFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const preselectedCompany = searchParams.get('company')

    const [companies, setCompanies] = useState<LabourCompany[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [companyId, setCompanyId] = useState(preselectedCompany || '')
    const [question, setQuestion] = useState('')
    const [answer, setAnswer] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])

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

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!companyId) {
            setError('请选择公司')
            return
        }
        if (!question.trim()) {
            setError('请输入面试问题')
            return
        }

        setSubmitting(true)

        const result = await submitLabourQuestion({
            companyId,
            question: question.trim(),
            answer: answer.trim() || undefined,
            tags: selectedTags,
        })

        setSubmitting(false)

        if (result) {
            setSuccess(true)
            setTimeout(() => {
                router.push(`/labour/${companyId}`)
            }, 1500)
        } else {
            setError('提交失败，请检查权限或稍后重试')
        }
    }

    function toggleTag(tag: string) {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="max-w-2xl mx-auto text-center py-16">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">权限不足</h2>
                <p className="text-gray-500 mb-4">只有管理员可以提交面试题</p>
                <Link href="/labour" className="text-indigo-600 hover:underline">
                    返回公司列表
                </Link>
            </div>
        )
    }

    if (success) {
        return (
            <div className="max-w-2xl mx-auto text-center py-16">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">提交成功！</h2>
                <p className="text-gray-500">正在跳转...</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Back Link */}
            <Link
                href="/labour"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
            >
                <ArrowLeft size={18} />
                返回公司列表
            </Link>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">提交面试题</h1>
                <p className="text-gray-500 mt-1">添加新的 Labour 工作面试问题</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Select */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        公司 <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={companyId}
                        onChange={e => setCompanyId(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">选择公司...</option>
                        {companies.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Question */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        面试问题 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                        rows={4}
                        placeholder="输入面试问题，支持 Markdown 格式..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">支持 Markdown：**粗体**、*斜体*、列表等</p>
                </div>

                {/* Answer */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        参考答案 <span className="text-gray-400">(可选)</span>
                    </label>
                    <textarea
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        rows={6}
                        placeholder="输入参考答案，支持 Markdown 格式..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    />
                </div>

                {/* Tags */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        标签 <span className="text-gray-400">(可选)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {COMMON_TAGS.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedTags.includes(tag)
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            提交中...
                        </>
                    ) : (
                        '提交面试题'
                    )}
                </button>
            </form>
        </div>
    )
}

export default function SubmitPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        }>
            <SubmitFormContent />
        </Suspense>
    )
}
