'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Plus, PlayCircle, Trash2 } from 'lucide-react'
import { createList as createListRemote, deleteList as deleteListRemote, getLists } from '@/lib/data-service'
import type { CardList } from '@/types'

export default function ListsPage() {
    const [lists, setLists] = useState<CardList[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [newListName, setNewListName] = useState('')

    useEffect(() => {
        loadLists()
    }, [])

    async function loadLists() {
        const allLists = await getLists()
        setLists(allLists)
    }

    const handleCreateList = useCallback(async () => {
        if (!newListName.trim()) return

        const newList = await createListRemote(newListName.trim(), [])
        if (!newList) return

        setLists(prev => [...prev, newList])
        setNewListName('')
        setIsCreating(false)
    }, [newListName])

    const handleDeleteList = useCallback(async (listId: string) => {
        if (!confirm('确定要删除这个列表吗？')) return

        await deleteListRemote(listId)
        setLists(prev => prev.filter(l => l.id !== listId))
    }, [])

    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* 标题 */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">我的列表</h1>
                        <p className="text-gray-500 mt-1">创建自定义学习列表</p>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={18} />
                        新建列表
                    </button>
                </div>

                {/* 创建表单 */}
                {isCreating && (
                    <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="列表名称"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            <button
                                onClick={handleCreateList}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                创建
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                )}

                {/* 列表 */}
                <div className="space-y-3">
                    {lists.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p>还没有创建任何列表</p>
                            <p className="text-sm text-gray-400 mt-2">点击上方按钮创建你的第一个列表</p>
                        </div>
                    ) : (
                        lists.map(list => (
                            <div
                                key={list.id}
                                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Link
                                            href={`/lists/${list.id}`}
                                            className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                                        >
                                            {list.isDefault && '⭐ '}{list.name}
                                        </Link>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {list.cardIds.length} 道题
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            href={`/review/qa?scope=list:${list.id}`}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="开始复习"
                                        >
                                            <PlayCircle size={20} />
                                        </Link>
                                        {!list.isDefault && (
                                            <button
                                                onClick={() => handleDeleteList(list.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="删除列表"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
