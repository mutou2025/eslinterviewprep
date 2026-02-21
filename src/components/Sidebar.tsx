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
    Factory
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', labelZh: '仪表盘', icon: LayoutDashboard },
    { href: '/library', label: 'Question Bank', labelZh: '题库', icon: Library },
    { href: '/lists', label: 'My Lists', labelZh: '我的列表', icon: ListChecks },
    { href: '/review/qa', label: 'Start Review', labelZh: '开始复习', icon: PlayCircle },
    { href: '/settings', label: 'Settings', labelZh: '设置', icon: Settings },
    { href: '/labour', label: 'Labour Interviews', labelZh: 'Labour面试', icon: Factory },
]

export function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
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
                </div>
            </div>
        </aside>
    )
}
