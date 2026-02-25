'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/provider'
import { ensureCardsAvailable, initializeDefaultData } from '@/lib/data-service'
import { getSupabaseClient } from '@/lib/supabase-client'

interface Props {
    children: React.ReactNode
}

function LoadingScreen({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="fixed inset-0 bg-[#F8FAFC] flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-sm border border-[#CBD5E1]">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 relative">
                        <div className="absolute inset-0 border-4 border-[#E2E8F0] rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                    </div>

                    <h2 className="text-xl font-bold text-[#0F172A] mb-2">
                        {title}
                    </h2>

                    <p className="text-[#475569] mb-4">
                        {subtitle}
                    </p>
                </div>
            </div>
        </div>
    )
}

function ErrorScreen({ title, error, onRetry, retryLabel }: { title: string; error: string; onRetry: () => void; retryLabel: string }) {
    return (
        <div className="fixed inset-0 bg-[#F8FAFC] flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-sm border border-[#CBD5E1]">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">❌</span>
                    </div>

                    <h2 className="text-xl font-bold text-[#0F172A] mb-2">
                        {title}
                    </h2>

                    <p className="text-[#475569] mb-4">
                        {error}
                    </p>

                    <button
                        onClick={onRetry}
                        className="px-6 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                    >
                        {retryLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export function DataInitializer({ children }: Props) {
    const { t } = useI18n()
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

                // 数据与管理页面始终允许进入，便于空库时执行导入
                if (pathname.startsWith('/data-management')) {
                    if (!cancelled) setStatus('ready')
                    return
                }

                // 检查题库是否存在
                const totalCards = await ensureCardsAvailable()
                if (totalCards === 0) {
                    router.replace('/data-management')
                    if (!cancelled) setStatus('loading')
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
            {status === 'loading' && (
                <LoadingScreen
                    title={t('initializer.initializing')}
                    subtitle={t('initializer.loadingData')}
                />
            )}
            {status === 'error' && (
                <ErrorScreen
                    title={t('initializer.failed')}
                    error={error}
                    retryLabel={t('common.retry')}
                    onRetry={() => window.location.reload()}
                />
            )}
            {status === 'ready' && children}
        </>
    )
}
