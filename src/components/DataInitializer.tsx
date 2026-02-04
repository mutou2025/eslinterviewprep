'use client'

import { useEffect, useState } from 'react'
import { needsInitialization, syncFromGitHub, type SyncProgress } from '@/lib/sync-service'
import { initializeDefaultData } from '@/lib/db'

interface Props {
    children: React.ReactNode
}

export function DataInitializer({ children }: Props) {
    const [isInitializing, setIsInitializing] = useState(true)
    const [progress, setProgress] = useState<SyncProgress | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function init() {
            try {
                // 初始化默认数据（分类、列表等）
                await initializeDefaultData()

                // 检查是否需要同步题库
                const needsSync = await needsInitialization()

                if (needsSync) {
                    const result = await syncFromGitHub(setProgress)
                    if (!result.success) {
                        setError(result.error || '同步失败')
                    }
                }
            } catch (e) {
                console.error('Initialization failed:', e)
                setError(e instanceof Error ? e.message : '初始化失败')
            } finally {
                setIsInitializing(false)
            }
        }

        init()
    }, [])

    if (isInitializing && progress) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 relative">
                            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            正在初始化题库
                        </h2>

                        <p className="text-gray-600 mb-4">
                            {progress.message}
                        </p>

                        {progress.total > 0 && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        )}

                        <p className="text-sm text-gray-500">
                            首次访问需要从 GitHub 获取题库，请稍候...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-3xl">❌</span>
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            初始化失败
                        </h2>

                        <p className="text-gray-600 mb-4">
                            {error}
                        </p>

                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            重试
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
