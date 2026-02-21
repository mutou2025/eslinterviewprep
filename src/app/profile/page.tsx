'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'

type Profile = {
    id: string
    email: string | null
    role?: string | null
    displayName?: string | null
    avatarUrl?: string | null
}

type Subscription = {
    status?: string | null
    plan?: string | null
    current_period_end?: string | null
}
type UserSettings = {
    review_mode: 'qa' | 'flashcard'
    daily_reminder: boolean
    language: 'zh-CN' | 'en-US'
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [settingsLoaded, setSettingsLoaded] = useState(false)
    const [prefReviewMode, setPrefReviewMode] = useState<'qa' | 'flashcard'>('qa')
    const [prefDailyReminder, setPrefDailyReminder] = useState(false)
    const [prefLanguage, setPrefLanguage] = useState<'zh-CN' | 'en-US'>('zh-CN')
    const saveTimerRef = useRef<number | null>(null)

    useEffect(() => {
        async function loadProfile() {
            setLoading(true)
            const supabase = getSupabaseClient()
            const { data } = await supabase.auth.getUser()
            const user = data.user
            if (!user) {
                setProfile(null)
                setSubscription(null)
                setUserId(null)
                setLoading(false)
                return
            }

            const { data: profileRow } = await supabase
                .from('profiles')
                .select('role, display_name, avatar_url')
                .eq('id', user.id)
                .maybeSingle()

            let subscriptionRow: Subscription | null = null
            const { data: subscriptionData, error: subscriptionError } = await supabase
                .from('subscriptions')
                .select('status, plan, current_period_end')
                .eq('user_id', user.id)
                .maybeSingle()
            if (!subscriptionError) {
                subscriptionRow = subscriptionData ?? null
            }

            setProfile({
                id: user.id,
                email: user.email ?? null,
                role: profileRow?.role ?? null
                ,displayName: profileRow?.display_name ?? null
                ,avatarUrl: profileRow?.avatar_url ?? null
            })
            setUserId(user.id)

            setSubscription(subscriptionRow)

            const { data: settingsRow, error: settingsError } = await supabase
                .from('user_settings')
                .select('review_mode, daily_reminder, language')
                .eq('user_id', user.id)
                .maybeSingle()

            if (!settingsError && settingsRow) {
                setPrefReviewMode(settingsRow.review_mode as 'qa' | 'flashcard')
                setPrefDailyReminder(!!settingsRow.daily_reminder)
                setPrefLanguage((settingsRow.language as 'zh-CN' | 'en-US') ?? 'zh-CN')
            }
            setSettingsLoaded(true)
            setLoading(false)
        }

        loadProfile()
    }, [])

    useEffect(() => {
        if (!userId || !settingsLoaded) return
        if (saveTimerRef.current) {
            window.clearTimeout(saveTimerRef.current)
        }
        saveTimerRef.current = window.setTimeout(async () => {
            const supabase = getSupabaseClient()
            const payload: UserSettings & { user_id: string; updated_at: string } = {
                user_id: userId,
                review_mode: prefReviewMode,
                daily_reminder: prefDailyReminder,
                language: prefLanguage,
                updated_at: new Date().toISOString()
            }
            await supabase.from('user_settings').upsert(payload, { onConflict: 'user_id' })
        }, 300)
        return () => {
            if (saveTimerRef.current) {
                window.clearTimeout(saveTimerRef.current)
                saveTimerRef.current = null
            }
        }
    }, [userId, settingsLoaded, prefReviewMode, prefDailyReminder, prefLanguage])

    const displayName = useMemo(() => {
        if (profile?.displayName) return profile.displayName
        if (!profile?.email) return '用户'
        return profile.email.split('@')[0] || '用户'
    }, [profile])

    return (
        <div className="p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>
                    <p className="text-gray-500 mt-1">账号信息、订阅状态与偏好设置</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#d0d7de]">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">账号信息</h2>
                    {loading ? (
                        <p className="text-gray-500">加载中...</p>
                    ) : profile ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                            <div>
                                <div className="text-gray-500">昵称</div>
                                <div className="font-medium text-gray-900">{displayName}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">头像</div>
                                <div className="font-medium text-gray-900">{profile.avatarUrl ?? '未设置'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">邮箱</div>
                                <div className="font-medium text-gray-900">{profile.email ?? '未绑定'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">用户 ID</div>
                                <div className="font-mono text-xs text-gray-700 break-all">{profile.id}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">角色</div>
                                <div className="font-medium text-gray-900">{profile.role ?? 'user'}</div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500">未登录</p>
                    )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#d0d7de]">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">订阅状态</h2>
                    {loading ? (
                        <p className="text-gray-500">加载中...</p>
                    ) : subscription ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                            <div>
                                <div className="text-gray-500">状态</div>
                                <div className="font-medium text-gray-900">{subscription.status ?? 'unknown'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">方案</div>
                                <div className="font-medium text-gray-900">{subscription.plan ?? 'free'}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">到期</div>
                                <div className="font-medium text-gray-900">{subscription.current_period_end ?? '—'}</div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500">暂无订阅记录</p>
                    )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#d0d7de]">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">偏好设置</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">默认复习模式</div>
                                <div className="text-sm text-gray-500">进入复习时默认的模式（多端同步）</div>
                            </div>
                            <select
                                value={prefReviewMode}
                                onChange={(e) => setPrefReviewMode(e.target.value as 'qa' | 'flashcard')}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            >
                                <option value="qa">问答模式</option>
                                <option value="flashcard">速记卡模式</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">每日提醒</div>
                                <div className="text-sm text-gray-500">同步到账号的提醒偏好</div>
                            </div>
                            <button
                                onClick={() => setPrefDailyReminder(!prefDailyReminder)}
                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${prefDailyReminder
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {prefDailyReminder ? '已开启' : '已关闭'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">界面语言</div>
                                <div className="text-sm text-gray-500">同步到账号的语言偏好</div>
                            </div>
                            <select
                                value={prefLanguage}
                                onChange={(e) => setPrefLanguage(e.target.value as 'zh-CN' | 'en-US')}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            >
                                <option value="zh-CN">简体中文</option>
                                <option value="en-US">English</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
