'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient, getSupabaseConfigIssue } from '@/lib/supabase-client'

export default function LoginPage() {
    const router = useRouter()
    const configIssue = getSupabaseConfigIssue()

    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)

        try {
            if (configIssue) {
                setMessage(configIssue)
                return
            }

            const supabase = getSupabaseClient()
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) {
                    setMessage(error.message)
                } else {
                    router.replace('/dashboard')
                }
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password
                })
                if (error) {
                    setMessage(error.message)
                } else {
                    setMessage('✅ 注册成功，请检查邮箱完成验证后登录')
                    setMode('signin')
                }
            }
        } catch (error) {
            console.error('Auth request failed:', error)
            const message = error instanceof Error ? error.message : '请求失败'
            if (message.toLowerCase().includes('failed to fetch')) {
                setMessage('无法连接到 Supabase。请检查 .env.local 的 URL/KEY 是否为真实值，并确认网络可访问 Supabase。')
            } else {
                setMessage(message)
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-[#CBD5E1] shadow-sm p-8">
                <h1 className="text-2xl font-bold text-[#0F172A] mb-2">北美面试通</h1>
                <p className="text-[#475569] mb-6">登录后同步你的学习进度</p>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setMode('signin')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'signin'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1]'
                            }`}
                    >
                        登录
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'signup'
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1]'
                            }`}
                    >
                        注册
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {configIssue && (
                        <div className="text-sm bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg">
                            Supabase 未配置完成：请在 <code>.env.local</code> 填入真实 URL 和 ANON KEY，然后重启 <code>npm run dev</code>。
                        </div>
                    )}
                    <input
                        type="email"
                        required
                        placeholder="邮箱"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <input
                        type="password"
                        required
                        placeholder="密码（至少 6 位）"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !!configIssue}
                        className="w-full py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
                    >
                        {isLoading ? '处理中...' : mode === 'signin' ? '登录' : '注册'}
                    </button>
                </form>

                {message && (
                    <div className="mt-4 text-sm text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
                        {message}
                    </div>
                )}
            </div>
        </div>
    )
}
