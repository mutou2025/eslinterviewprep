'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { db } from '@/lib/db'

export default function SettingsPage() {
    const [isImporting, setIsImporting] = useState(false)
    const [importStatus, setImportStatus] = useState('')

    async function importFromUpstream() {
        setIsImporting(true)
        setImportStatus('正在导入题库...')

        try {
            // 从 data/upstream.json 导入
            const response = await fetch('/api/import-upstream')
            const result = await response.json()

            if (result.success) {
                setImportStatus(`✅ 成功导入 ${result.count} 道题`)
            } else {
                setImportStatus(`❌ 导入失败: ${result.error}`)
            }
        } catch (err) {
            // 备用方案：直接获取预生成的数据
            try {
                const response = await fetch('/data/upstream.json')
                if (!response.ok) {
                    setImportStatus('❌ 请先运行 npm run sync 生成题库数据')
                    return
                }

                const data = await response.json()

                // 导入分类
                await db.categories.bulkPut(data.categories)

                // 导入卡片
                for (const card of data.cards) {
                    // 检查是否已存在
                    const existing = await db.cards.get(card.id)
                    if (!existing) {
                        await db.cards.add({
                            ...card,
                            dueAt: new Date(card.dueAt),
                            createdAt: new Date(card.createdAt),
                            updatedAt: new Date(card.updatedAt)
                        })
                    }
                }

                setImportStatus(`✅ 成功导入 ${data.cards.length} 道题`)
            } catch (innerErr) {
                setImportStatus('❌ 导入失败，请检查题库数据')
            }
        } finally {
            setIsImporting(false)
        }
    }

    async function clearAllData() {
        if (!confirm('确定要清除所有数据吗？这将删除所有题目和学习进度！')) return

        await db.cards.clear()
        await db.overrides.clear()
        await db.sessions.clear()
        await db.logs.clear()

        setImportStatus('✅ 已清除所有数据')
    }

    return (
        <div className="p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">设置</h1>

                {/* 数据管理 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">数据管理</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <div>
                                <p className="font-medium text-gray-900">导入题库</p>
                                <p className="text-sm text-gray-500">从上游仓库同步最新题目</p>
                            </div>
                            <button
                                onClick={importFromUpstream}
                                disabled={isImporting}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={isImporting ? 'animate-spin' : ''} />
                                {isImporting ? '导入中...' : '导入'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between py-3">
                            <div>
                                <p className="font-medium text-gray-900">清除数据</p>
                                <p className="text-sm text-gray-500">删除所有题目和学习进度</p>
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
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                            {importStatus}
                        </div>
                    )}
                </div>

                {/* 使用说明 */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h2>

                    <div className="prose prose-sm text-gray-600">
                        <h3 className="text-base font-medium text-gray-900">首次使用</h3>
                        <ol className="list-decimal list-inside space-y-2 mb-4">
                            <li>运行 <code className="bg-gray-100 px-1 rounded">npm run sync</code> 同步题库</li>
                            <li>点击上方「导入」按钮导入题目到浏览器</li>
                            <li>进入「题库」或点击「开始复习」</li>
                        </ol>

                        <h3 className="text-base font-medium text-gray-900">快捷键</h3>
                        <ul className="space-y-1">
                            <li><code className="bg-gray-100 px-1 rounded">Space</code> - 翻转卡片</li>
                            <li><code className="bg-gray-100 px-1 rounded">Enter</code> - 标记「熟练」并下一题</li>
                            <li><code className="bg-gray-100 px-1 rounded">1-4</code> - 标记掌握度</li>
                            <li><code className="bg-gray-100 px-1 rounded">←→</code> - 切换卡片</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
