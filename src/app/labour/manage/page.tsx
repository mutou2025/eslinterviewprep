'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Check, X, AlertCircle, Building2 } from 'lucide-react'
import {
    getLabourCompanies,
    createLabourCompany,
    updateLabourCompany,
    deleteLabourCompany,
    isCurrentUserAdmin,
} from '@/lib/labour-service'
import type { LabourCompany } from '@/types'

// Generate slug from name
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
}

export default function ManageCompaniesPage() {
    const [companies, setCompanies] = useState<LabourCompany[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    // Add new company state
    const [showAddForm, setShowAddForm] = useState(false)
    const [newCompanyName, setNewCompanyName] = useState('')
    const [newCompanyId, setNewCompanyId] = useState('')
    const [addLoading, setAddLoading] = useState(false)
    const [addError, setAddError] = useState<string | null>(null)

    // Edit company state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState('')
    const [editLoading, setEditLoading] = useState(false)

    // Delete state
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const [companiesData, adminStatus] = await Promise.all([
            getLabourCompanies(),
            isCurrentUserAdmin(),
        ])
        setCompanies(companiesData)
        setIsAdmin(adminStatus)
        setLoading(false)
    }

    // Auto-generate ID from name
    useEffect(() => {
        if (newCompanyName && !showAddForm) return
        setNewCompanyId(generateSlug(newCompanyName))
    }, [newCompanyName, showAddForm])

    async function handleAddCompany(e: React.FormEvent) {
        e.preventDefault()
        setAddError(null)

        if (!newCompanyName.trim()) {
            setAddError('请输入公司名称')
            return
        }
        if (!newCompanyId.trim()) {
            setAddError('请输入公司 ID')
            return
        }

        // Check for duplicate ID
        if (companies.some(c => c.id === newCompanyId)) {
            setAddError('公司 ID 已存在')
            return
        }

        setAddLoading(true)
        const result = await createLabourCompany({
            id: newCompanyId.trim(),
            name: newCompanyName.trim(),
        })
        setAddLoading(false)

        if (result) {
            setCompanies(prev => [...prev, result].sort((a, b) => a.name.localeCompare(b.name)))
            setNewCompanyName('')
            setNewCompanyId('')
            setShowAddForm(false)
        } else {
            setAddError('创建失败，请检查权限')
        }
    }

    async function handleUpdateCompany(id: string) {
        if (!editingName.trim()) return

        setEditLoading(true)
        const success = await updateLabourCompany(id, { name: editingName.trim() })
        setEditLoading(false)

        if (success) {
            setCompanies(prev =>
                prev.map(c => c.id === id ? { ...c, name: editingName.trim() } : c)
            )
            setEditingId(null)
        }
    }

    async function handleDeleteCompany(id: string) {
        setDeletingId(id)
        const success = await deleteLabourCompany(id)
        setDeletingId(null)

        if (success) {
            setCompanies(prev => prev.filter(c => c.id !== id))
        }
    }

    function startEdit(company: LabourCompany) {
        setEditingId(company.id)
        setEditingName(company.name)
    }

    function cancelEdit() {
        setEditingId(null)
        setEditingName('')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="max-w-2xl mx-auto text-center py-16">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">权限不足</h2>
                <p className="text-gray-500 mb-4">只有管理员可以管理公司列表</p>
                <Link href="/labour" className="text-blue-600 hover:underline">
                    返回公司列表
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Back Link */}
            <Link
                href="/labour"
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
            >
                <ArrowLeft size={18} />
                返回公司列表
            </Link>

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">管理公司</h1>
                    <p className="text-gray-500 mt-1">添加、编辑或删除 Labour 面试公司</p>
                </div>
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Plus size={18} />
                        新增公司
                    </button>
                )}
            </div>

            {/* Add Form */}
            {showAddForm && (
                <form onSubmit={handleAddCompany} className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                公司名称 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={newCompanyName}
                                onChange={e => setNewCompanyName(e.target.value)}
                                placeholder="如：Amazon"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                公司 ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={newCompanyId}
                                onChange={e => setNewCompanyId(e.target.value)}
                                placeholder="如：amazon"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">用于 URL，只能包含小写字母和连字符</p>
                        </div>
                    </div>

                    {addError && (
                        <div className="text-red-600 text-sm mb-3">{addError}</div>
                    )}

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={addLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {addLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            添加
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddForm(false)
                                setNewCompanyName('')
                                setNewCompanyId('')
                                setAddError(null)
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            取消
                        </button>
                    </div>
                </form>
            )}

            {/* Company List */}
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {companies.map(company => (
                    <div key={company.id} className="p-4 flex items-center justify-between gap-4">
                        {editingId === company.id ? (
                            // Edit mode
                            <div className="flex-1 flex items-center gap-3">
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleUpdateCompany(company.id)
                                        if (e.key === 'Escape') cancelEdit()
                                    }}
                                    autoFocus
                                />
                                <button
                                    onClick={() => handleUpdateCompany(company.id)}
                                    disabled={editLoading}
                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                >
                                    {editLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                </button>
                                <button
                                    onClick={cancelEdit}
                                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            // View mode
                            <>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{company.name}</div>
                                        <div className="text-sm text-gray-400">{company.id} · {company.questionCount ?? 0} 题</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => startEdit(company)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="编辑"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCompany(company.id)}
                                        disabled={deletingId === company.id}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="删除"
                                    >
                                        {deletingId === company.id ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={18} />
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {companies.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        暂无公司，点击"新增公司"添加
                    </div>
                )}
            </div>
        </div>
    )
}
