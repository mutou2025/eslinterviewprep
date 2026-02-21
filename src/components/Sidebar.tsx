'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
    LayoutDashboard,
    Library,
    ListChecks,
    PlayCircle,
    Settings,
    Factory,
    type LucideIcon
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useI18n } from '@/i18n/provider'
import type { MessageKey } from '@/i18n/messages'
import { getSupabaseClient } from '@/lib/supabase-client'

const navItems: Array<{ href: string; labelKey: MessageKey; icon: LucideIcon }> = [
    { href: '/dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
    { href: '/library', labelKey: 'sidebar.questionBank', icon: Library },
    { href: '/labour', labelKey: 'sidebar.labourInterviews', icon: Factory },
    { href: '/lists', labelKey: 'sidebar.myLists', icon: ListChecks },
    { href: '/review/qa', labelKey: 'sidebar.startReview', icon: PlayCircle },
    { href: '/settings', labelKey: 'sidebar.settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const { t, uiLanguage } = useI18n()
    const [menuOpen, setMenuOpen] = useState(false)
    const [email, setEmail] = useState<string | null>(null)
    const isLoginPage = pathname.startsWith('/login')

    useEffect(() => {
        let mounted = true
        async function loadUser() {
            const supabase = getSupabaseClient()
            const { data } = await supabase.auth.getUser()
            if (!mounted) return
            setEmail(data.user?.email ?? null)
        }
        loadUser()
        return () => { mounted = false }
    }, [])

    const initials = useMemo(() => {
        if (!email) return 'U'
        return email.slice(0, 1).toUpperCase()
    }, [email])

    async function handleSignOut() {
        const supabase = getSupabaseClient()
        await supabase.auth.signOut()
        router.replace('/login')
    }

    if (isLoginPage) return null

    return (
        <aside className="fixed left-0 top-0 h-full w-[268px] bg-white/95 backdrop-blur border-r border-[#d0d7de] flex flex-col">
            {/* Logo */}
            <div className="px-4 py-6 border-b border-[#d8dee4]">
                <Link href="/dashboard" className="flex w-full items-center justify-start gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                        <Image
                            src="/logo.svg"
                            alt="ESLInterviewPrep logo"
                            width={56}
                            height={56}
                            className="w-full h-full object-contain"
                            priority
                        />
                    </div>
                    <div className="flex min-w-0 flex-col gap-2.5">
                        <h1 className="font-bold text-[18px] leading-tight tracking-[0.1em] text-[#1f2328]">北美面试通</h1>
                        <p className="text-[13px] leading-none tracking-[0.1em] text-[#57606a]">ESLInterviewPrep</p>
                        {uiLanguage === 'en-US' ? (
                            <div className="text-[11px] leading-tight text-[#6e7781]">
                                <p className="tracking-[0.03em]">Ace North America Interviews</p>
                                <p className="tracking-[0.02em]">Speak sharp. Get hired.</p>
                            </div>
                        ) : (
                            <p className="text-[12px] leading-none tracking-normal whitespace-nowrap text-[#6e7781]">{t('sidebar.tagline')}</p>
                        )}
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4">
                <ul className="space-y-1">
                    {navItems.map(item => {
                        const isActive = pathname.startsWith(item.href)
                        const Icon = item.icon

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors border ${isActive
                                        ? 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff66]'
                                        : 'text-[#57606a] border-transparent hover:bg-[#f6f8fa] hover:text-[#1f2328]'
                                        }`}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium block">{t(item.labelKey)}</span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[#d8dee4]">
                <div className="relative">
                    <div className="flex items-start gap-2">
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f6f8fa] transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-[#0969da] text-white flex items-center justify-center font-semibold">
                                {initials}
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-[#1f2328]">{t('sidebar.profile')}</div>
                                <div className="text-xs text-[#57606a] truncate w-36">
                                    {email ?? t('sidebar.notLoggedIn')}
                                </div>
                            </div>
                        </button>

                        {/* 推荐图标位置：用户区右侧，随手可切但不干扰主导航 */}
                        <div className="pt-1">
                            <LanguageSwitcher />
                        </div>
                    </div>

                    {menuOpen && (
                        <div className="absolute bottom-14 left-0 w-full bg-white border border-[#d0d7de] rounded-xl shadow-lg py-2 z-10">
                            <Link
                                href="/profile"
                                className="block px-4 py-2 text-sm text-[#24292f] hover:bg-[#f6f8fa]"
                                onClick={() => setMenuOpen(false)}
                            >
                                {t('sidebar.goProfile')}
                            </Link>
                            <button
                                onClick={handleSignOut}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                {t('sidebar.logout')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    )
}
