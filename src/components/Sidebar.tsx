'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
    LayoutDashboard,
    Library,
    ListChecks,
    PlayCircle,
<<<<<<< HEAD
    Factory,
    Building2,
    type LucideIcon
=======
    Settings,
    Factory
>>>>>>> fix(style): change style
} from 'lucide-react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useI18n } from '@/i18n/provider'
import type { MessageKey } from '@/i18n/messages'
import { TECHNICAL_TRACKS, isTechnicalTrackId } from '@/lib/library-tracks'
import { getSupabaseClient } from '@/lib/supabase-client'

const navItems: Array<{ href: string; labelKey: MessageKey; icon: LucideIcon }> = [
    { href: '/dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
    { href: '/review/qa', labelKey: 'sidebar.startReview', icon: PlayCircle },
    { href: '/library', labelKey: 'sidebar.questionBank', icon: Library },
    { href: '/behavior-interview', labelKey: 'sidebar.behaviorInterviews', icon: Factory },
    { href: '/company-interviews', labelKey: 'sidebar.topCompanyInterviews', icon: Building2 },
    { href: '/lists', labelKey: 'sidebar.myLists', icon: ListChecks },
]

export function Sidebar() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const router = useRouter()
    const { t } = useI18n()
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
    const trackParam = searchParams.get('track')
    const selectedTrack = pathname.startsWith('/library')
        ? (isTechnicalTrackId(trackParam) ? trackParam : 'frontend-fullstack')
        : null

    async function handleSignOut() {
        const supabase = getSupabaseClient()
        await supabase.auth.signOut()
        router.replace('/login')
    }

    if (isLoginPage) return null

    return (
<<<<<<< HEAD
        <header className="relative z-50 bg-white/95 backdrop-blur border-b border-[#d0d7de]">
            <div className="px-4 py-4">
                <div className="flex items-center gap-4">
                    {/* Brand */}
                    <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                            <Image
                                src="/logo.svg"
                                alt="ESLInterviewPrep logo"
                                width={48}
                                height={48}
                                className="w-full h-full object-contain"
                                priority
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-bold text-[18px] leading-tight tracking-[0.08em] text-[#1f2328]">北美面试通</h1>
                            <p className="text-[13px] leading-none tracking-[0.08em] text-[#57606a]">ESLInterviewPrep</p>
                        </div>
                    </Link>

                    {/* Top menu */}
                    <nav className="flex-1 min-w-0">
                        <ul className="flex items-center gap-2 whitespace-nowrap">
                            {navItems.map(item => {
                                const isActive = pathname.startsWith(item.href)
                                const Icon = item.icon

                                if (item.href === '/library') {
                                    const libraryDefaultHref = '/library?track=frontend-fullstack'
                                    return (
                                        <li key={item.href} className="relative shrink-0 group">
                                            <Link
                                                href={libraryDefaultHref}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border text-sm ${isActive
                                                    ? 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff66]'
                                                    : 'text-[#57606a] border-transparent hover:bg-[#f6f8fa] hover:text-[#1f2328]'
                                                    }`}
                                            >
                                                <Icon size={18} />
                                                <span className="font-medium">{t(item.labelKey)}</span>
                                            </Link>

                                            <div className="pointer-events-none absolute left-0 top-full z-[120] pt-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                                                <div className="min-w-[220px] rounded-xl border border-[#d0d7de] bg-white p-2 shadow-lg">
                                                    {TECHNICAL_TRACKS.map(track => (
                                                        <Link
                                                            key={track.id}
                                                            href={`/library?track=${track.id}`}
                                                            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${selectedTrack === track.id
                                                                ? 'bg-[#ddf4ff] text-[#0969da]'
                                                                : 'text-[#24292f] hover:bg-[#f6f8fa] active:bg-[#f6f8fa]'
                                                                }`}
                                                            aria-current={selectedTrack === track.id ? 'page' : undefined}
                                                        >
                                                            {t(track.labelKey)}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        </li>
                                    )
                                }
=======
        <aside className="fixed left-0 top-0 h-full w-72 bg-white/95 backdrop-blur border-r border-[#d0d7de] flex flex-col">
            {/* Logo */}
            <div className="px-4 py-8 border-b border-[#d8dee4]">
                <Link href="/dashboard" className="flex w-full items-center justify-center gap-3">
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
                        <p className="text-[12px] leading-none tracking-normal whitespace-nowrap text-[#6e7781]">专为北美求职打造</p>
                    </div>
                </Link>
            </div>
>>>>>>> fix(style): change style

                                return (
                                    <li key={item.href} className="shrink-0">
                                        <Link
                                            href={item.href}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border text-sm ${isActive
                                                ? 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff66]'
                                                : 'text-[#57606a] border-transparent hover:bg-[#f6f8fa] hover:text-[#1f2328]'
                                                }`}
                                        >
                                            <Icon size={18} />
                                            <span className="font-medium">{t(item.labelKey)}</span>
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    </nav>

                    {/* User controls */}
                    <div className="relative flex items-center gap-2 shrink-0">
                        <LanguageSwitcher />
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="p-1 rounded-xl hover:bg-[#f6f8fa] transition-colors"
                            title={t('sidebar.profile')}
                            aria-label={t('sidebar.profile')}
                        >
                            <div className="w-9 h-9 rounded-full bg-[#0969da] text-white flex items-center justify-center font-semibold text-sm">
                                {initials}
                            </div>
                        </button>

                        {menuOpen && (
                            <div className="absolute top-12 right-0 w-48 bg-white border border-[#d0d7de] rounded-xl shadow-lg py-2 z-10">
                                <Link
<<<<<<< HEAD
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
=======
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors border ${isActive
                                        ? 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff66]'
                                        : 'text-[#57606a] border-transparent hover:bg-[#f6f8fa] hover:text-[#1f2328]'
                                        }`}
                                >
                                    <Icon size={20} />
                                    <div>
                                        <span className="font-medium block">{item.labelZh}</span>
                                        <span className="text-xs text-[#6e7781]">{item.label}</span>
                                    </div>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-[#d8dee4]">
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#f6f8fa] transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-[#0969da] text-white flex items-center justify-center font-semibold">
                            {initials}
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-medium text-[#1f2328]">个人中心</div>
                            <div className="text-xs text-[#57606a] truncate w-36">
                                {email ?? '未登录'}
                            </div>
                        </div>
                    </button>

                    {menuOpen && (
                        <div className="absolute bottom-14 left-0 w-full bg-white border border-[#d0d7de] rounded-xl shadow-lg py-2 z-10">
                            <Link
                                href="/profile"
                                className="block px-4 py-2 text-sm text-[#24292f] hover:bg-[#f6f8fa]"
                                onClick={() => setMenuOpen(false)}
                            >
                                进入个人中心
                            </Link>
                            <button
                                onClick={handleSignOut}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                退出登录
                            </button>
                        </div>
                    )}
>>>>>>> fix(style): change style
                </div>
            </div>
        </header>
    )
}
