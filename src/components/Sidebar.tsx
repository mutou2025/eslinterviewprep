'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Library,
    ListChecks,
    PlayCircle,
    Settings,
    Briefcase
} from 'lucide-react'

const navItems = [
    { href: '/dashboard', label: 'Dashboard', labelZh: '仪表盘', icon: LayoutDashboard },
    { href: '/library', label: 'Question Bank', labelZh: '题库', icon: Library },
    { href: '/lists', label: 'My Lists', labelZh: '我的列表', icon: ListChecks },
    { href: '/review/qa', label: 'Start Review', labelZh: '开始复习', icon: PlayCircle },
    { href: '/settings', label: 'Settings', labelZh: '设置', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()

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
            <div className="p-4 border-t border-gray-100">
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

