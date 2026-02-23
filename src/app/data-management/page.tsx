'use client'

import { MyListsSection } from '@/components/MyListsSection'

export default function DataManagementPage() {
    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A8A]">
                    题库为空时会自动引导到此页面。请先点击“导入题库”完成初始化。
                </div>
            </div>
            <MyListsSection mode="settings" />
        </div>
    )
}
