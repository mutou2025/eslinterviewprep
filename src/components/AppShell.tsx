'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const showSidebar = !pathname.startsWith('/login')

    // 使用单一 return 避免条件性渲染问题
    return (
        <div className="flex min-h-screen">
            {showSidebar ? <Sidebar /> : null}
            <main className={`flex-1 ${showSidebar ? 'ml-64' : ''}`}>
                {children}
            </main>
        </div>
    )
}
