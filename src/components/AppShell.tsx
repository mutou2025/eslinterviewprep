'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const showSidebar = !pathname.startsWith('/login') && !pathname.startsWith('/site-intro')

    // 使用单一 return 避免条件性渲染问题
    return (
        <div className="flex flex-col min-h-screen bg-[var(--background)]">
            {showSidebar ? <Sidebar /> : null}
            <main className="flex-1">
                {children}
            </main>
        </div>
    )
}
