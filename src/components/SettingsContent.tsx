'use client'

import { useState } from 'react'
import { RefreshCw, Upload } from 'lucide-react'
import { clearUserData, initializeDefaultData } from '@/lib/data-service'
import { getSupabaseClient } from '@/lib/supabase-client'

type SettingsContentProps = {
    onOpenUploadModal?: () => void
}

export function SettingsContent({ onOpenUploadModal }: SettingsContentProps) {
    const [isImporting, setIsImporting] = useState(false)
    const [importStatus, setImportStatus] = useState('')
    const [importStats, setImportStats] = useState<{
        cards: { total: number; unique: number; duplicates: number }
        categories: { total: number; unique: number; duplicates: number }
    } | null>(null)

    async function importFromUpstream() {
        setIsImporting(true)
        setImportStatus('正在导入题库...')
        setImportStats(null)

        try {
            const supabase = getSupabaseClient()
            const { data } = await supabase.auth.getSession()
            const token = data.session?.access_token

            const response = await fetch('/api/import-upstream', {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            })
            const result = await response.json()

            if (result.success) {
                setImportStatus(`✅ 成功导入 ${result.count} 道题`)
                if (result.stats?.cards && result.stats?.categories) {
                    setImportStats(result.stats)
                }
            } else {
                setImportStatus(`❌ 导入失败: ${result.error}`)
            }
        } catch {
            setImportStatus('❌ 导入失败，请检查服务端日志')
        } finally {
            setIsImporting(false)
        }
    }

    async function clearAllData() {
        if (!confirm('确定要清除所有数据吗？这将删除所有题目和学习进度！')) return

        await clearUserData()
        await initializeDefaultData()
        setImportStatus('✅ 已清除所有数据')
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1]">
                <h2 className="text-lg font-semibold text-[#0F172A] mb-4">数据管理</h2>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-[#E2E8F0]">
                        <div>
                            <p className="font-medium text-[#0F172A]">导入题库</p>
                            <p className="text-sm text-[#94A3B8]">从上游仓库同步最新题目</p>
                        </div>
                        <button
                            onClick={importFromUpstream}
                            disabled={isImporting}
                            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={isImporting ? 'animate-spin' : ''} />
                            {isImporting ? '导入中...' : '导入'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-[#E2E8F0]">
                        <div>
                            <p className="font-medium text-[#0F172A]">上传面试题</p>
                            <p className="text-sm text-[#94A3B8]">支持单题上传和文档批量上传</p>
                        </div>
                        <button
                            onClick={() => onOpenUploadModal?.()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <Upload size={18} />
                            上传
                        </button>
                    </div>

                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="font-medium text-[#0F172A]">清除数据</p>
                            <p className="text-sm text-[#94A3B8]">删除所有题目和学习进度</p>
                        </div>
                        <button
                            onClick={clearAllData}
                            className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                            清除
                        </button>
                    </div>
                </div>

                {importStatus && (
                    <div className="mt-4 p-3 bg-[#F8FAFC] rounded-lg text-sm">
                        {importStatus}
                    </div>
                )}

                {importStats && (
                    <div className="mt-3 p-3 bg-[#F8FAFC] rounded-lg text-sm text-[#475569]">
                        <div className="font-medium text-[#0F172A] mb-2">导入前检测报告</div>
                        <div>Cards: 总数 {importStats.cards.total} / 去重后 {importStats.cards.unique} / 重复 {importStats.cards.duplicates}</div>
                        <div>Categories: 总数 {importStats.categories.total} / 去重后 {importStats.categories.unique} / 重复 {importStats.categories.duplicates}</div>
                    </div>
                )}
            </div>
        </div>
    )
}
