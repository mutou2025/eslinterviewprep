'use client'

import { useEffect, useState, Suspense } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ensureCardsAvailable, initializeDefaultData } from '@/lib/data-service'
import { getSupabaseClient } from '@/lib/supabase-client'

interface Props {
    children: React.ReactNode
}

function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 relative">
                        <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        正在初始化
                    </h2>

                    <p className="text-gray-600 mb-4">
                        正在加载用户数据，请稍候...
                    </p>
                </div>
            </div>
        </div>
    )
}

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
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
                        onClick={onRetry}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        重试
                    </button>
                </div>
            </div>
        </div>
    )
}

export function DataInitializer({ children }: Props) {
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [error, setError] = useState<string>('')
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        let cancelled = false

        async function init() {
            try {
                const isPublic =
                    pathname.startsWith('/login') ||
                    pathname.startsWith('/tech') ||
                    pathname.startsWith('/behavioral') ||
                    pathname.startsWith('/english')

                if (isPublic) {
                    if (!cancelled) setStatus('ready')
                    return
                }

                const supabase = getSupabaseClient()
                const { data } = await supabase.auth.getUser()
                if (!data.user) {
                    router.replace('/login')
                    return
                }

                // 初始化默认数据（列表等）
                await initializeDefaultData()

                // 允许在题库为空时进入设置页以便导入
                if (pathname.startsWith('/settings') || pathname.startsWith('/profile')) {
                    if (!cancelled) setStatus('ready')
                    return
                }

                // 检查题库是否存在
                const totalCards = await ensureCardsAvailable()
                if (totalCards === 0) {
                    if (!cancelled) {
                        setError('题库为空，请管理员先在设置页导入题库数据。')
                        setStatus('error')
                    }
                    return
                }

                if (!cancelled) setStatus('ready')
            } catch (e) {
                console.error('Initialization failed:', e)
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : '初始化失败')
                    setStatus('error')
                }
            }
        }

        init()

        return () => {
            cancelled = true
        }
    }, [pathname, router])

    // 使用单一 return 语句，避免条件性 early return
    return (
        <>
            {status === 'loading' && <LoadingScreen />}
            {status === 'error' && <ErrorScreen error={error} onRetry={() => window.location.reload()} />}
            {status === 'ready' && children}
        </>
    )
}
