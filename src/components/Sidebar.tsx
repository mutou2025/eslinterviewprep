'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
    LayoutDashboard,
    Library,
    ListChecks,
    PlayCircle,
    Settings,
    Briefcase,
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

    if (pathname.startsWith('/login')) {
        return null
    }

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

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-100">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900">北美面试通</h1>
                        <p className="text-xs text-gray-500">ESLInterviewPrep</p>
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
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive
                                        ? 'bg-indigo-50 text-indigo-600'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon size={20} />
                                    <div>
                                        <span className="font-medium block">{item.labelZh}</span>
                                        <span className="text-xs text-gray-400">{item.label}</span>
                                    </div>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 space-y-3">
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">
                            {initials}
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-medium text-gray-900">个人中心</div>
                            <div className="text-xs text-gray-500 truncate w-36">
                                {email ?? '未登录'}
                            </div>
                        </div>
                    </button>

                    {menuOpen && (
                        <div className="absolute bottom-14 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-10">
                            <Link
                                href="/profile"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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

                <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                    <p className="text-sm text-gray-600">
                        <span className="font-medium text-indigo-600">Tech + Behavioral</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">For Chinese & ESL Job Seekers</p>
                </div>
            </div>
        </aside>
    )
}
