'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'

export default function LoginPage() {
    const router = useRouter()
    const supabase = getSupabaseClient()

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
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">北美面试通</h1>
                <p className="text-gray-500 mb-6">登录后同步你的学习进度</p>

                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setMode('signin')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'signin'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        登录
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${mode === 'signup'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                            }`}
                    >
                        注册
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        required
                        placeholder="邮箱"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                        type="password"
                        required
                        placeholder="密码（至少 6 位）"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? '处理中...' : mode === 'signin' ? '登录' : '注册'}
                    </button>
                </form>

                {message && (
                    <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {message}
                    </div>
                )}
            </div>
        </div>
    )
}
