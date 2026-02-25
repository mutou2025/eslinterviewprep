'use client'

import { useEffect, useState, useCallback, useMemo, type ChangeEvent } from 'react'
import Link from 'next/link'
import { FileText, Plus, PlayCircle, Trash2 } from 'lucide-react'
import { SettingsContent } from '@/components/SettingsContent'
import {
    createList as createListRemote,
    createUserCard,
    generateInterviewEnglishDraft,
    deleteList as deleteListRemote,
    getCategories,
    getLists,
    updateList as updateListRemote,
} from '@/lib/data-service'
import { buildTechnicalKnowledgeCategories } from '@/lib/technical-taxonomy'
import { useI18n } from '@/i18n/provider'
import type { CardList, Category } from '@/types'

type UploadFormat = 'markdown' | 'doc'
type UploadMode = 'single' | 'batch'

type SingleUploadState = {
    title: string
    titleEn: string
    categoryId: string
    knowledgePointId: string
    answer: string
    answerEn: string
    format: UploadFormat
    targetListId: string
}

type BatchUploadConfig = {
    categoryId: string
    knowledgePointId: string
    format: UploadFormat
    targetListId: string
}

type BatchUploadEntry = {
    id: string
    sourceFile: string
    title: string
    answer: string
    titleEn: string
    answerEn: string
}

const UPLOAD_LIST_NAME = '我的上传'

function parseImportedContent(raw: string): { title: string; answer: string } {
    const normalized = raw.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim()
    if (!normalized) return { title: '', answer: '' }

    const lines = normalized.split('\n').map(line => line.trim())
    const nonEmpty = lines.filter(Boolean)
    if (nonEmpty.length === 0) return { title: '', answer: '' }

    const firstLine = nonEmpty[0]
        .replace(/^#{1,6}\s*/, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .trim()

    const rest = nonEmpty.slice(1).join('\n').trim()
    return {
        title: firstLine || '未命名题目',
        answer: rest || normalized
    }
}

function isLikelyBinaryText(raw: string): boolean {
    if (!raw) return false

    const sample = raw.slice(0, 5000)
    let suspiciousCount = 0

    for (const char of sample) {
        const code = char.charCodeAt(0)
        const isControl = (code >= 0 && code < 9) || (code > 13 && code < 32)
        if (char === '\ufffd') {
            suspiciousCount += 2
        } else if (isControl) {
            suspiciousCount += 1
        }
    }

    return suspiciousCount / sample.length > 0.1
}

function splitSectionsByIndexes(
    lines: string[],
    indexes: number[],
    getTitle: (line: string) => string
): Array<{ title: string; answer: string }> {
    const entries: Array<{ title: string; answer: string }> = []

    for (let i = 0; i < indexes.length; i += 1) {
        const start = indexes[i]
        const end = i + 1 < indexes.length ? indexes[i + 1] : lines.length
        const title = getTitle(lines[start]).trim()
        const answer = lines.slice(start + 1, end).join('\n').trim()
        if (title && answer) {
            entries.push({ title, answer })
        }
    }

    return entries
}

function parseBatchEntries(raw: string): Array<{ title: string; answer: string }> {
    const normalized = raw.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim()
    if (!normalized) return []

    const lines = normalized.split('\n')

    const headingIndexes: number[] = []
    lines.forEach((line, idx) => {
        if (/^#{1,6}\s+\S+/.test(line.trim())) {
            headingIndexes.push(idx)
        }
    })

    if (headingIndexes.length >= 2) {
        const headingEntries = splitSectionsByIndexes(
            lines,
            headingIndexes,
            (line) => line.replace(/^#{1,6}\s*/, '')
        )
        if (headingEntries.length > 0) {
            return headingEntries
        }
    }

    const qaEntries: Array<{ title: string; answer: string }> = []
    let currentTitle = ''
    let currentAnswerLines: string[] = []

    const pushCurrent = () => {
        if (!currentTitle.trim()) {
            currentTitle = ''
            currentAnswerLines = []
            return
        }

        const answer = currentAnswerLines.join('\n').trim()
        if (answer) {
            qaEntries.push({
                title: currentTitle.trim(),
                answer
            })
        }
        currentTitle = ''
        currentAnswerLines = []
    }

    for (const line of lines) {
        const trimmed = line.trim()
        const questionMatch = trimmed.match(/^Q(?:uestion)?[：:]\s*(.+)$/i)
        if (questionMatch) {
            pushCurrent()
            currentTitle = questionMatch[1].trim()
            continue
        }

        const answerMatch = trimmed.match(/^A(?:nswer)?[：:]\s*(.*)$/i)
        if (answerMatch && currentTitle) {
            if (answerMatch[1]) {
                currentAnswerLines.push(answerMatch[1])
            }
            continue
        }

        if (currentTitle) {
            currentAnswerLines.push(line)
        }
    }
    pushCurrent()

    if (qaEntries.length > 0) {
        return qaEntries
    }

    const numberedIndexes: number[] = []
    lines.forEach((line, idx) => {
        if (/^\d+[\.\)]\s+\S+/.test(line.trim())) {
            numberedIndexes.push(idx)
        }
    })

    if (numberedIndexes.length >= 2) {
        const numberedEntries = splitSectionsByIndexes(
            lines,
            numberedIndexes,
            (line) => line.replace(/^\d+[\.\)]\s*/, '')
        )
        if (numberedEntries.length > 0) {
            return numberedEntries
        }
    }

    const single = parseImportedContent(normalized)
    return single.title && single.answer ? [single] : []
}

function ListCardItem(props: {
    list: CardList
    isSystemList?: boolean
    onDelete: (listId: string) => void
}) {
    const { list, isSystemList = false, onDelete } = props

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href={`/lists/${list.id}`}
                        className="font-medium text-[#0F172A] hover:text-[#2563EB] transition-colors"
                    >
                        {list.isDefault && '⭐ '}{list.name}
                    </Link>
                    <p className="text-sm text-[#94A3B8] mt-1">
                        {list.cardIds.length} 道题
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/review/qa?scope=list:${list.id}`}
                        className="p-2 text-[#2563EB] hover:bg-[#EFF6FF] rounded-lg transition-colors"
                        title="开始复习"
                    >
                        <PlayCircle size={20} />
                    </Link>
                    {!isSystemList && (
                        <button
                            onClick={() => onDelete(list.id)}
                            className="p-2 text-[#94A3B8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除列表"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export function MyListsSection({
    embedded = false,
    mode = 'all'
}: {
    embedded?: boolean
    mode?: 'all' | 'lists' | 'settings'
}) {
    const showLists = mode !== 'settings'
    const showSettings = mode !== 'lists'
    const { uiLanguage, contentLanguage } = useI18n()
    const [lists, setLists] = useState<CardList[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [uploadMode, setUploadMode] = useState<UploadMode>('single')

    const [isSubmittingSingle, setIsSubmittingSingle] = useState(false)
    const [isSubmittingBatch, setIsSubmittingBatch] = useState(false)

    const [newListName, setNewListName] = useState('')

    const [singleUploadFeedback, setSingleUploadFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [batchUploadFeedback, setBatchUploadFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const [singleUploadState, setSingleUploadState] = useState<SingleUploadState>({
        title: '',
        titleEn: '',
        categoryId: '',
        knowledgePointId: '',
        answer: '',
        answerEn: '',
        format: 'markdown',
        targetListId: '',
    })

    const [batchUploadConfig, setBatchUploadConfig] = useState<BatchUploadConfig>({
        categoryId: '',
        knowledgePointId: '',
        format: 'markdown',
        targetListId: '',
    })
    const [batchUploadEntries, setBatchUploadEntries] = useState<BatchUploadEntry[]>([])

    const knowledgeCategories = useMemo(() => {
        return buildTechnicalKnowledgeCategories(categories, { includeFrontendProjectCategory: true })
    }, [categories])

    const favoriteList = useMemo(() => {
        return lists.find(list => list.isDefault) || null
    }, [lists])

    const uploadList = useMemo(() => {
        return lists.find(list => list.name === UPLOAD_LIST_NAME) || null
    }, [lists])

    const customLists = useMemo(() => {
        return lists.filter(list => !list.isDefault && list.name !== UPLOAD_LIST_NAME)
    }, [lists])

    const singleEffectiveCategoryId = knowledgeCategories.some(category => category.id === singleUploadState.categoryId)
        ? singleUploadState.categoryId
        : (knowledgeCategories[0]?.id || '')

    const singleSelectedKnowledgeCategory = useMemo(() => {
        return knowledgeCategories.find(category => category.id === singleEffectiveCategoryId) || null
    }, [knowledgeCategories, singleEffectiveCategoryId])

    const singleSelectedKnowledgePoints = singleSelectedKnowledgeCategory?.points || []
    const singleEffectiveKnowledgePointId = singleSelectedKnowledgePoints.some(point => point.id === singleUploadState.knowledgePointId)
        ? singleUploadState.knowledgePointId
        : (singleSelectedKnowledgePoints[0]?.id || '')
    const singleEffectiveTargetListId = singleUploadState.targetListId && lists.some(list => list.id === singleUploadState.targetListId)
        ? singleUploadState.targetListId
        : ''

    const batchEffectiveCategoryId = knowledgeCategories.some(category => category.id === batchUploadConfig.categoryId)
        ? batchUploadConfig.categoryId
        : (knowledgeCategories[0]?.id || '')

    const batchSelectedKnowledgeCategory = useMemo(() => {
        return knowledgeCategories.find(category => category.id === batchEffectiveCategoryId) || null
    }, [knowledgeCategories, batchEffectiveCategoryId])

    const batchSelectedKnowledgePoints = batchSelectedKnowledgeCategory?.points || []
    const batchEffectiveKnowledgePointId = batchSelectedKnowledgePoints.some(point => point.id === batchUploadConfig.knowledgePointId)
        ? batchUploadConfig.knowledgePointId
        : (batchSelectedKnowledgePoints[0]?.id || '')
    const batchEffectiveTargetListId = batchUploadConfig.targetListId && lists.some(list => list.id === batchUploadConfig.targetListId)
        ? batchUploadConfig.targetListId
        : ''

    useEffect(() => {
        let cancelled = false
        async function loadData() {
            const [allLists, level3Categories] = await Promise.all([
                getLists(),
                getCategories(3)
            ])

            let nextLists = allLists
            if (!allLists.some(list => list.name === UPLOAD_LIST_NAME)) {
                const createdUploadList = await createListRemote(UPLOAD_LIST_NAME, [])
                if (createdUploadList) {
                    nextLists = [...allLists, createdUploadList]
                }
            }

            if (!cancelled) {
                setLists(nextLists)
                setCategories(level3Categories)
            }
        }
        loadData()
        return () => {
            cancelled = true
        }
    }, [])

    const openUploadModal = useCallback(() => {
        setUploadMode('single')
        setSingleUploadState(prev => ({ ...prev, title: '', titleEn: '', answer: '', answerEn: '' }))
        setBatchUploadEntries([])
        setSingleUploadFeedback(null)
        setBatchUploadFeedback(null)
        setIsUploadModalOpen(true)
    }, [])

    const closeUploadModal = useCallback(() => {
        setIsUploadModalOpen(false)
    }, [])

    const ensureUploadList = useCallback(async (): Promise<CardList | null> => {
        const existing = lists.find(list => list.name === UPLOAD_LIST_NAME)
        if (existing) return existing

        const created = await createListRemote(UPLOAD_LIST_NAME, [])
        if (!created) return null

        setLists(prev => [...prev, created])
        return created
    }, [lists])

    const appendCardsToList = useCallback(async (listId: string, cardIds: string[], fallbackList?: CardList | null) => {
        const targetList = lists.find(list => list.id === listId) || fallbackList || null
        if (!targetList || cardIds.length === 0) return

        const nextCardIds = Array.from(new Set([...targetList.cardIds, ...cardIds]))
        if (nextCardIds.length === targetList.cardIds.length) return

        await updateListRemote(targetList.id, { cardIds: nextCardIds })
        setLists(prev => prev.map(list => (
            list.id === targetList.id ? { ...list, cardIds: nextCardIds } : list
        )))
    }, [lists])

    const handleCreateList = useCallback(async () => {
        if (!newListName.trim()) return

        const newList = await createListRemote(newListName.trim(), [])
        if (!newList) return

        setLists(prev => [...prev, newList])
        setNewListName('')
        setIsCreating(false)
    }, [newListName])

    const handleDeleteList = useCallback(async (listId: string) => {
        const cannotDelete = lists.some(list => list.id === listId && (list.isDefault || list.name === UPLOAD_LIST_NAME))
        if (cannotDelete) return

        if (!confirm(uiLanguage === 'en-US' ? 'Delete this list?' : '确定要删除这个列表吗？')) return

        await deleteListRemote(listId)
        setLists(prev => prev.filter(l => l.id !== listId))
    }, [uiLanguage, lists])

    const handleUploadQuestion = useCallback(async () => {
        const title = singleUploadState.title.trim()
        const answer = singleUploadState.answer.trim()
        let titleEn = singleUploadState.titleEn.trim()
        let answerEn = singleUploadState.answerEn.trim()

        if (!title) {
            setSingleUploadFeedback({ type: 'error', text: '请填写题目标题。' })
            return
        }
        if (!singleEffectiveCategoryId) {
            setSingleUploadFeedback({ type: 'error', text: '请选择所属技术分类。' })
            return
        }
        if (!singleEffectiveKnowledgePointId) {
            setSingleUploadFeedback({ type: 'error', text: '请选择知识点。' })
            return
        }
        if (!answer) {
            setSingleUploadFeedback({ type: 'error', text: '请填写答案内容。' })
            return
        }

        const selectedCategory = categories.find(category => category.id === singleEffectiveCategoryId)
        setIsSubmittingSingle(true)
        setSingleUploadFeedback(null)

        if (!titleEn || !answerEn) {
            const draft = await generateInterviewEnglishDraft({ title, answer })
            titleEn = draft.titleEn
            answerEn = draft.answerEn
        }

        const createdCard = await createUserCard({
            title,
            titleZh: title,
            titleEn,
            question: title,
            questionZh: title,
            questionEn: titleEn,
            answer,
            answerZh: answer,
            answerEn,
            categoryL3Id: singleEffectiveCategoryId,
            categoryL2Id: selectedCategory?.parentId || 'web-frontend',
            customTags: [
                `knowledge:${singleEffectiveKnowledgePointId}`,
                `answer-format:${singleUploadState.format}`
            ],
            questionType: 'concept',
            difficulty: 'must-know',
            frequency: 'mid'
        })

        if (!createdCard) {
            setSingleUploadFeedback({ type: 'error', text: '上传失败，请确认当前账号有上传权限。' })
            setIsSubmittingSingle(false)
            return
        }

        const ensuredUploadList = await ensureUploadList()
        if (ensuredUploadList) {
            await appendCardsToList(ensuredUploadList.id, [createdCard.id], ensuredUploadList)
        }

        if (singleEffectiveTargetListId && singleEffectiveTargetListId !== ensuredUploadList?.id) {
            await appendCardsToList(singleEffectiveTargetListId, [createdCard.id])
        }

        setSingleUploadState(prev => ({
            ...prev,
            title: '',
            titleEn: '',
            answer: '',
            answerEn: ''
        }))
        setIsSubmittingSingle(false)
        setIsUploadModalOpen(false)
    }, [singleUploadState, singleEffectiveCategoryId, singleEffectiveKnowledgePointId, singleEffectiveTargetListId, categories, ensureUploadList, appendCardsToList])

    const handleGenerateSingleEnglishDraft = useCallback(async () => {
        const title = singleUploadState.title.trim()
        const answer = singleUploadState.answer.trim()
        if (!title || !answer) {
            setSingleUploadFeedback({ type: 'error', text: '请先填写中文标题和答案，再生成英文版。' })
            return
        }

        setSingleUploadFeedback(null)
        setIsSubmittingSingle(true)
        const draft = await generateInterviewEnglishDraft({ title, answer })
        setSingleUploadState(prev => ({
            ...prev,
            titleEn: draft.titleEn,
            answerEn: draft.answerEn
        }))
        setSingleUploadFeedback({
            type: 'success',
            text: draft.generated ? '已生成英文草稿，可继续编辑后上传。' : '未检测到翻译服务，已填充可编辑草稿。'
        })
        setIsSubmittingSingle(false)
    }, [singleUploadState.title, singleUploadState.answer])

    const handleBatchImportDocuments = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || [])
        if (files.length === 0) return

        setBatchUploadFeedback(null)
        const nextEntries: BatchUploadEntry[] = []
        const failedFiles: string[] = []

        for (const file of files) {
            try {
                const text = await file.text()
                if (isLikelyBinaryText(text)) {
                    failedFiles.push(file.name)
                    continue
                }

                const parsedEntries = parseBatchEntries(text)
                if (parsedEntries.length === 0) {
                    failedFiles.push(file.name)
                    continue
                }

                parsedEntries.forEach((entry, idx) => {
                    nextEntries.push({
                        id: `${file.name}-${idx}-${crypto.randomUUID()}`,
                        sourceFile: file.name,
                        title: entry.title,
                        answer: entry.answer,
                        titleEn: '',
                        answerEn: ''
                    })
                })
            } catch {
                failedFiles.push(file.name)
            }
        }

        if (nextEntries.length > 0) {
            setBatchUploadEntries(prev => [...prev, ...nextEntries])
        }

        if (nextEntries.length > 0 && failedFiles.length === 0) {
            setBatchUploadFeedback({ type: 'success', text: `成功导入 ${nextEntries.length} 道题。` })
        } else if (nextEntries.length > 0 && failedFiles.length > 0) {
            setBatchUploadFeedback({
                type: 'error',
                text: `已导入 ${nextEntries.length} 道题，${failedFiles.length} 个文件解析失败（建议转为 .md 或 .txt 后重试）。`
            })
        } else {
            setBatchUploadFeedback({
                type: 'error',
                text: '未识别到有效题目内容，建议使用 .md 或 .txt，并按标题分段。'
            })
        }

        event.target.value = ''
    }, [])

    const handleGenerateBatchEnglishDrafts = useCallback(async () => {
        if (batchUploadEntries.length === 0) {
            setBatchUploadFeedback({ type: 'error', text: '请先导入文档并识别题目。' })
            return
        }

        setIsSubmittingBatch(true)
        setBatchUploadFeedback(null)

        const nextEntries: BatchUploadEntry[] = []
        for (const entry of batchUploadEntries) {
            const hasDraft = entry.titleEn.trim() && entry.answerEn.trim()
            if (hasDraft) {
                nextEntries.push(entry)
                continue
            }
            const draft = await generateInterviewEnglishDraft({
                title: entry.title,
                answer: entry.answer
            })
            nextEntries.push({
                ...entry,
                titleEn: draft.titleEn,
                answerEn: draft.answerEn
            })
        }

        setBatchUploadEntries(nextEntries)
        setBatchUploadFeedback({ type: 'success', text: `已生成 ${nextEntries.length} 道题的英文草稿，可继续手动修改。` })
        setIsSubmittingBatch(false)
    }, [batchUploadEntries])

    const handleBatchUploadQuestions = useCallback(async () => {
        if (!batchEffectiveCategoryId) {
            setBatchUploadFeedback({ type: 'error', text: '请选择所属技术分类。' })
            return
        }
        if (!batchEffectiveKnowledgePointId) {
            setBatchUploadFeedback({ type: 'error', text: '请选择知识点。' })
            return
        }
        if (batchUploadEntries.length === 0) {
            setBatchUploadFeedback({ type: 'error', text: '请先导入文档并识别题目。' })
            return
        }

        const selectedCategory = categories.find(category => category.id === batchEffectiveCategoryId)
        const createdCardIds: string[] = []
        const successfulEntryIds = new Set<string>()

        setIsSubmittingBatch(true)
        setBatchUploadFeedback(null)

        for (const entry of batchUploadEntries) {
            let titleEn = entry.titleEn.trim()
            let answerEn = entry.answerEn.trim()
            if (!titleEn || !answerEn) {
                const draft = await generateInterviewEnglishDraft({
                    title: entry.title,
                    answer: entry.answer
                })
                titleEn = draft.titleEn
                answerEn = draft.answerEn
            }

            const createdCard = await createUserCard({
                title: entry.title,
                titleZh: entry.title,
                titleEn,
                question: entry.title,
                questionZh: entry.title,
                questionEn: titleEn,
                answer: entry.answer,
                answerZh: entry.answer,
                answerEn,
                categoryL3Id: batchEffectiveCategoryId,
                categoryL2Id: selectedCategory?.parentId || 'web-frontend',
                customTags: [
                    `knowledge:${batchEffectiveKnowledgePointId}`,
                    `answer-format:${batchUploadConfig.format}`,
                    `imported-from:${entry.sourceFile}`
                ],
                questionType: 'concept',
                difficulty: 'must-know',
                frequency: 'mid'
            })

            if (createdCard) {
                createdCardIds.push(createdCard.id)
                successfulEntryIds.add(entry.id)
            }
        }

        if (createdCardIds.length > 0) {
            const ensuredUploadList = await ensureUploadList()
            if (ensuredUploadList) {
                await appendCardsToList(ensuredUploadList.id, createdCardIds, ensuredUploadList)
            }

            if (batchEffectiveTargetListId && batchEffectiveTargetListId !== ensuredUploadList?.id) {
                await appendCardsToList(batchEffectiveTargetListId, createdCardIds)
            }
        }

        setBatchUploadEntries(prev => prev.filter(entry => !successfulEntryIds.has(entry.id)))

        const failedCount = batchUploadEntries.length - createdCardIds.length
        if (createdCardIds.length === 0) {
            setBatchUploadFeedback({ type: 'error', text: '批量上传失败，请确认当前账号有上传权限。' })
        } else if (failedCount > 0) {
            setBatchUploadFeedback({
                type: 'error',
                text: `部分上传成功：${createdCardIds.length} 道成功，${failedCount} 道失败。`
            })
        } else {
            setIsUploadModalOpen(false)
        }

        setIsSubmittingBatch(false)
    }, [batchUploadConfig, batchUploadEntries, batchEffectiveCategoryId, batchEffectiveKnowledgePointId, batchEffectiveTargetListId, categories, ensureUploadList, appendCardsToList])

    return (
        <div
            id={embedded && showLists ? 'my-lists' : undefined}
            className={embedded ? 'scroll-mt-24' : 'p-8'}
        >
            <div className={embedded ? 'max-w-4xl' : 'max-w-4xl mx-auto'}>
                {showLists && (
                    <div className={`flex items-center justify-between ${embedded ? 'mb-6' : 'mb-8'}`}>
                        <div>
                            <h1 className={`${embedded ? 'text-xl' : 'text-2xl'} font-bold text-[#0F172A]`}>我的列表</h1>
                            <p className="text-[#94A3B8] mt-1">管理我的收藏、我的上传和自定义学习列表</p>
                        </div>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                        >
                            <Plus size={18} />
                            新建列表
                        </button>
                    </div>
                )}

                {!showLists && showSettings && (
                    <div className={`${embedded ? 'mb-6' : 'mb-8'}`}>
                        <h1 className={`${embedded ? 'text-xl' : 'text-2xl'} font-bold text-[#0F172A]`}>数据与管理</h1>
                        <p className="text-[#94A3B8] mt-1">导入题库、上传题目、清理数据都在这里统一管理</p>
                    </div>
                )}

                {showLists && isCreating && (
                    <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="列表名称"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                                className="flex-1 px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                autoFocus
                            />
                            <button
                                onClick={handleCreateList}
                                className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
                            >
                                创建
                            </button>
                            <button
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-[#94A3B8] hover:text-[#475569] transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                )}

                {showLists && (
                    <>
                        <section className="mb-6">
                            <h2 className="text-lg font-semibold text-[#0F172A] mb-3">我的收藏</h2>
                            {favoriteList ? (
                                <ListCardItem
                                    list={favoriteList}
                                    isSystemList
                                    onDelete={handleDeleteList}
                                />
                            ) : (
                                <div className="bg-white rounded-xl p-4 shadow-sm text-sm text-[#94A3B8]">暂未初始化收藏列表</div>
                            )}
                        </section>

                        <section className="mb-6">
                            <h2 className="text-lg font-semibold text-[#0F172A] mb-3">我的上传</h2>
                            {uploadList ? (
                                <ListCardItem
                                    list={uploadList}
                                    isSystemList
                                    onDelete={handleDeleteList}
                                />
                            ) : (
                                <div className="bg-white rounded-xl p-4 shadow-sm text-sm text-[#94A3B8]">暂未生成上传列表</div>
                            )}
                        </section>

                        <section className="mb-10">
                            <h2 className="text-lg font-semibold text-[#0F172A] mb-3">自定义列表</h2>
                            {customLists.length === 0 ? (
                                <div className="bg-white rounded-xl p-4 shadow-sm text-sm text-[#94A3B8]">还没有创建自定义列表</div>
                            ) : (
                                <div className="space-y-3">
                                    {customLists.map(list => (
                                        <ListCardItem
                                            key={list.id}
                                            list={list}
                                            onDelete={handleDeleteList}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}

                {showSettings && (
                    <section className={showLists ? 'mt-10' : ''}>
                        <SettingsContent onOpenUploadModal={openUploadModal} />
                    </section>
                )}
            </div>

            {isUploadModalOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4"
                    onClick={closeUploadModal}
                >
                    <div
                        className="w-full max-w-5xl max-h-[88vh] overflow-y-auto bg-white rounded-2xl shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText size={18} className="text-slate-600" />
                                <h2 className="text-lg font-semibold text-[#0F172A]">上传面试题</h2>
                            </div>
                            <button
                                onClick={closeUploadModal}
                                className="px-3 py-1.5 text-sm text-[#94A3B8] hover:text-[#475569] transition-colors"
                            >
                                关闭
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="inline-flex rounded-lg border border-[#E2E8F0] p-1 mb-4 bg-[#F8FAFC]">
                                <button
                                    onClick={() => setUploadMode('single')}
                                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${uploadMode === 'single' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#94A3B8] hover:text-[#475569]'}`}
                                >
                                    单题上传
                                </button>
                                <button
                                    onClick={() => setUploadMode('batch')}
                                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${uploadMode === 'batch' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#94A3B8] hover:text-[#475569]'}`}
                                >
                                    批量导入文档
                                </button>
                            </div>

                            {uploadMode === 'single' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-sm text-[#475569] mb-1">标题</label>
                                            <input
                                                type="text"
                                                value={singleUploadState.title}
                                                onChange={(e) => setSingleUploadState(prev => ({ ...prev, title: e.target.value }))}
                                                placeholder="例如：React 中 useMemo 与 useCallback 的区别"
                                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#475569] mb-1">答案格式</label>
                                            <select
                                                value={singleUploadState.format}
                                                onChange={(e) => setSingleUploadState(prev => ({ ...prev, format: e.target.value as UploadFormat }))}
                                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                                            >
                                                <option value="markdown">Markdown</option>
                                                <option value="doc">doc</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                        <div>
                                            <label className="block text-sm text-[#475569] mb-1">所属技术分类</label>
                                            <select
                                                value={singleEffectiveCategoryId}
                                                onChange={(e) => setSingleUploadState(prev => ({ ...prev, categoryId: e.target.value, knowledgePointId: '' }))}
                                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                                            >
                                                {knowledgeCategories.map(category => (
                                                    <option key={category.id} value={category.id}>
                                                        {contentLanguage === 'en-US' ? category.nameEn : category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#475569] mb-1">知识点</label>
                                            <select
                                                value={singleEffectiveKnowledgePointId}
                                                onChange={(e) => setSingleUploadState(prev => ({ ...prev, knowledgePointId: e.target.value }))}
                                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                                            >
                                                {singleSelectedKnowledgePoints.map(point => (
                                                    <option key={point.id} value={point.id}>
                                                        {contentLanguage === 'en-US' ? point.nameEn : point.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#475569] mb-1">加入列表（可选）</label>
                                            <select
                                                value={singleEffectiveTargetListId}
                                                onChange={(e) => setSingleUploadState(prev => ({ ...prev, targetListId: e.target.value }))}
                                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                                            >
                                                <option value="">仅上传到题库</option>
                                                {lists.map(list => (
                                                    <option key={list.id} value={list.id}>
                                                        {list.isDefault ? `⭐ ${list.name}` : list.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm text-[#475569] mb-1">答案</label>
                                        <textarea
                                            value={singleUploadState.answer}
                                            onChange={(e) => setSingleUploadState(prev => ({ ...prev, answer: e.target.value }))}
                                            rows={9}
                                            placeholder={singleUploadState.format === 'markdown' ? '可直接输入 Markdown 内容...' : '输入 doc 格式内容...'}
                                            className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                        />
                                    </div>

                                    <div className="mb-4 rounded-lg border border-[#DBEAFE] bg-[#F8FBFF] p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-[#1E3A8A]">英文版（自动生成，可编辑）</p>
                                            <button
                                                onClick={handleGenerateSingleEnglishDraft}
                                                disabled={isSubmittingSingle}
                                                className="px-3 py-1.5 text-xs rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
                                            >
                                                {isSubmittingSingle ? '生成中...' : '生成英文草稿'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-[#64748B] mb-1">英文标题</label>
                                                <input
                                                    type="text"
                                                    value={singleUploadState.titleEn}
                                                    onChange={(e) => setSingleUploadState(prev => ({ ...prev, titleEn: e.target.value }))}
                                                    placeholder="English title"
                                                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[#64748B] mb-1">英文答案</label>
                                                <textarea
                                                    value={singleUploadState.answerEn}
                                                    onChange={(e) => setSingleUploadState(prev => ({ ...prev, answerEn: e.target.value }))}
                                                    rows={4}
                                                    placeholder="English answer"
                                                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {singleUploadFeedback && (
                                        <div className={`mb-3 text-sm ${singleUploadFeedback.type === 'success' ? 'text-[#10B981]' : 'text-red-600'}`}>
                                            {singleUploadFeedback.text}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleUploadQuestion}
                                            disabled={isSubmittingSingle}
                                            className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
                                        >
                                            {isSubmittingSingle ? '上传中...' : '上传题目'}
                                        </button>
                                        <button
                                            onClick={closeUploadModal}
                                            className="px-4 py-2 text-[#94A3B8] hover:text-[#475569] transition-colors"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </>
                            )}

                            {uploadMode === 'batch' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                        <div>
                                            <label className="block text-sm text-[#475569] mb-1">所属技术分类</label>
                                            <select
                                                value={batchEffectiveCategoryId}
                                                onChange={(e) => setBatchUploadConfig(prev => ({ ...prev, categoryId: e.target.value, knowledgePointId: '' }))}
                                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                                            >
                                                {knowledgeCategories.map(category => (
                                                    <option key={category.id} value={category.id}>
                                                        {contentLanguage === 'en-US' ? category.nameEn : category.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#475569] mb-1">知识点</label>
                                            <select
                                                value={batchEffectiveKnowledgePointId}
                                                onChange={(e) => setBatchUploadConfig(prev => ({ ...prev, knowledgePointId: e.target.value }))}
                                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                                            >
                                                {batchSelectedKnowledgePoints.map(point => (
                                                    <option key={point.id} value={point.id}>
                                                        {contentLanguage === 'en-US' ? point.nameEn : point.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#475569] mb-1">答案格式</label>
                                            <select
                                                value={batchUploadConfig.format}
                                                onChange={(e) => setBatchUploadConfig(prev => ({ ...prev, format: e.target.value as UploadFormat }))}
                                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                                            >
                                                <option value="markdown">Markdown</option>
                                                <option value="doc">doc</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[#475569] mb-1">加入列表（可选）</label>
                                            <select
                                                value={batchEffectiveTargetListId}
                                                onChange={(e) => setBatchUploadConfig(prev => ({ ...prev, targetListId: e.target.value }))}
                                                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                                            >
                                                <option value="">仅上传到题库</option>
                                                {lists.map(list => (
                                                    <option key={list.id} value={list.id}>
                                                        {list.isDefault ? `⭐ ${list.name}` : list.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="block text-sm text-[#475569] mb-1">导入文档（批量）</label>
                                        <input
                                            type="file"
                                            accept=".md,.markdown,.txt,.doc,.docx"
                                            multiple
                                            onChange={handleBatchImportDocuments}
                                            className="block w-full text-sm text-[#475569] file:mr-3 file:px-3 file:py-2 file:border-0 file:rounded-lg file:bg-[#F1F5F9] file:text-[#475569] hover:file:bg-[#E2E8F0]"
                                        />
                                        <p className="text-xs text-[#94A3B8] mt-1">支持一次选择多个文件，系统会尝试自动拆分为多道题目后再批量入库。</p>
                                    </div>

                                    <div className="mb-4 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                                        <div className="text-sm text-[#475569]">
                                            已识别题目数：<span className="font-semibold">{batchUploadEntries.length}</span>
                                        </div>
                                        {batchUploadEntries.length > 0 && (
                                            <div className="mt-2 space-y-2 text-xs max-h-56 overflow-y-auto">
                                                {batchUploadEntries.map(entry => (
                                                    <div key={entry.id} className="rounded-lg border border-[#E2E8F0] bg-white p-2">
                                                        <div className="mb-1 truncate text-[#334155]">
                                                            {entry.title} <span className="text-[#94A3B8]">({entry.sourceFile})</span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={entry.titleEn}
                                                            onChange={(e) => setBatchUploadEntries(prev => prev.map(item => item.id === entry.id ? { ...item, titleEn: e.target.value } : item))}
                                                            placeholder="英文标题（可编辑）"
                                                            className="mb-1 w-full px-2 py-1 border border-[#E2E8F0] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                                        />
                                                        <textarea
                                                            value={entry.answerEn}
                                                            onChange={(e) => setBatchUploadEntries(prev => prev.map(item => item.id === entry.id ? { ...item, answerEn: e.target.value } : item))}
                                                            rows={2}
                                                            placeholder="英文答案（可编辑）"
                                                            className="w-full px-2 py-1 border border-[#E2E8F0] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {batchUploadFeedback && (
                                        <div className={`mb-3 text-sm ${batchUploadFeedback.type === 'success' ? 'text-[#10B981]' : 'text-red-600'}`}>
                                            {batchUploadFeedback.text}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleGenerateBatchEnglishDrafts}
                                            disabled={isSubmittingBatch || batchUploadEntries.length === 0}
                                            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
                                        >
                                            生成全部英文草稿
                                        </button>
                                        <button
                                            onClick={handleBatchUploadQuestions}
                                            disabled={isSubmittingBatch}
                                            className="px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
                                        >
                                            {isSubmittingBatch ? '批量上传中...' : '批量上传题目'}
                                        </button>
                                        <button
                                            onClick={() => setBatchUploadEntries([])}
                                            className="px-4 py-2 text-[#94A3B8] hover:text-[#475569] transition-colors"
                                        >
                                            清空已识别
                                        </button>
                                        <button
                                            onClick={closeUploadModal}
                                            className="px-4 py-2 text-[#94A3B8] hover:text-[#475569] transition-colors"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
