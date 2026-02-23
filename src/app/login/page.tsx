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
        <div className="min-h-screen flex items-center justify-center bg-[#f6f8fa] px-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-[#d0d7de] shadow-sm p-8">
                <h1 className="text-2xl font-bold text-[#1f2328] mb-2">北美面试通</h1>
                <p className="text-[#57606a] mb-6">登录后同步你的学习进度</p>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setMode('signin')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'signin'
                            ? 'bg-[#0969da] text-white'
                            : 'bg-[#f6f8fa] text-[#57606a] border border-[#d0d7de]'
                            }`}
                    >
                        登录
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'signup'
                            ? 'bg-[#0969da] text-white'
                            : 'bg-[#f6f8fa] text-[#57606a] border border-[#d0d7de]'
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
                        className="w-full px-4 py-2 border border-[#d0d7de] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="password"
                        required
                        placeholder="密码（至少 6 位）"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-[#d0d7de] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !!configIssue}
                        className="w-full py-2 bg-[#0969da] text-white rounded-lg hover:bg-[#0860ca] transition-colors disabled:opacity-50"
                    >
                        {isLoading ? '处理中...' : mode === 'signin' ? '登录' : '注册'}
                    </button>
                </form>

                {message && (
                    <div className="mt-4 text-sm text-[#57606a] bg-[#f6f8fa] border border-[#d8dee4] p-3 rounded-lg">
                        {message}
                    </div>
                )}
            </div>
        </div>
    )
}
