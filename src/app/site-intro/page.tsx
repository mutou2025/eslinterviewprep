'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient, getSupabaseConfigIssue } from '@/lib/supabase-client'

type AuthState = 'checking' | 'guest' | 'authed'

const painPoints = [
    '背不住面试题',
    '回答没有结构',
    '紧张说不出来',
    '英语表达不稳定',
]

const features = [
    '行为面试分类',
    'STAR 结构拆解',
    '闪卡训练模式',
    '每日复习系统',
    '掌握度追踪',
]

export default function SiteIntroPage() {
    const router = useRouter()
    const [authState, setAuthState] = useState<AuthState>('checking')

    useEffect(() => {
        let cancelled = false

        async function checkAuth() {
            const configIssue = getSupabaseConfigIssue()
            if (configIssue) {
                if (!cancelled) setAuthState('guest')
                return
            }

            try {
                const supabase = getSupabaseClient()
                const { data } = await supabase.auth.getUser()
                if (cancelled) return

                if (data.user) {
                    setAuthState('authed')
                    router.replace('/dashboard')
                    return
                }

                setAuthState('guest')
            } catch {
                if (!cancelled) setAuthState('guest')
            }
        }

        checkAuth()
        return () => {
            cancelled = true
        }
    }, [router])

    if (authState === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="animate-spin w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full" />
            </div>
        )
    }

    if (authState === 'authed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="animate-spin w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
            <main className="mx-auto max-w-5xl px-6 py-8 md:py-12 space-y-14">
                <section className="rounded-3xl overflow-hidden bg-[linear-gradient(135deg,#0B1F3B_0%,#2563EB_100%)] text-white p-8 md:p-12 shadow-lg">
                    <p className="text-xs md:text-sm tracking-[0.12em] uppercase text-[#BFDBFE]">北美面试通</p>
                    <h1 className="mt-3 text-3xl md:text-5xl font-bold leading-tight">
                        用闪卡和结构化训练，
                        <br />
                        系统通过行为面试
                    </h1>
                    <p className="mt-4 text-lg md:text-xl text-[#DBEAFE] leading-8">
                        STAR 模板 + 高频题库 + 间隔复习
                        <br />
                        为 ESL 求职者打造的面试训练系统
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href="/login"
                            className="inline-flex items-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-[#1D4ED8] hover:bg-[#EFF6FF] transition-colors"
                        >
                            免费开始
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center rounded-xl border border-[#BFDBFE] px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                        >
                            立即体验
                        </Link>
                    </div>
                </section>

                <section className="rounded-2xl border border-[#E2E8F0] bg-white p-7 md:p-8">
                    <h2 className="text-3xl font-bold mb-5">你解决什么问题？</h2>
                    <ul className="space-y-3 text-2xl">
                        {painPoints.map(item => (
                            <li key={item} className="flex items-start gap-3">
                                <span className="text-red-500 leading-none mt-0.5">✘</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-6 text-2xl">→ 对应解决方案</p>
                </section>

                <section className="rounded-2xl border border-[#E2E8F0] bg-white p-7 md:p-8">
                    <h2 className="text-3xl font-bold mb-5">核心功能</h2>
                    <ul className="space-y-3 text-2xl">
                        {features.map(item => (
                            <li key={item} className="flex items-start gap-3">
                                <span className="leading-none mt-0.5">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="rounded-2xl border border-[#E2E8F0] bg-white p-7 md:p-8">
                    <h2 className="text-3xl font-bold mb-4">开始你的面试通关训练</h2>
                    <p className="text-xl text-[#475569] mb-6">现在登录后，系统会直接进入 Dashboard，优先处理今日到期复习。</p>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/login"
                            className="inline-flex items-center rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8] transition-colors"
                        >
                            免费开始
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center rounded-xl border border-[#93C5FD] bg-[#EFF6FF] px-5 py-2.5 text-sm font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE] transition-colors"
                        >
                            立即体验
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    )
}
