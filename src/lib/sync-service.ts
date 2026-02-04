/**
 * 题库同步服务（客户端版本）
 * 首次访问时从 GitHub 获取题库并保存到 IndexedDB
 */

import { db } from './db'
import type { Card, Category } from '@/types'

// 分类映射
const CATEGORY_MAP: Record<string, { l3Id: string; l3Name: string }> = {
    'React': { l3Id: 'react', l3Name: 'React' },
    'JavaScript': { l3Id: 'javascript', l3Name: 'JavaScript' },
    'css': { l3Id: 'css', l3Name: 'CSS' },
    'vue': { l3Id: 'vue', l3Name: 'Vue' },
    'http': { l3Id: 'network', l3Name: 'Network' },
    'webpack': { l3Id: 'webpack', l3Name: 'Webpack' },
    '算法与数据结构': { l3Id: 'algorithm', l3Name: 'Algorithm' },
    'algorithm': { l3Id: 'algorithm', l3Name: 'Algorithm' },
    'es6': { l3Id: 'es6', l3Name: 'ES6' },
    'NodeJS': { l3Id: 'nodejs', l3Name: 'NodeJS' },
    'typescript': { l3Id: 'typescript', l3Name: 'TypeScript' },
    'design': { l3Id: 'design-pattern', l3Name: '设计模式' },
    'git': { l3Id: 'git', l3Name: 'Git' },
    'linux': { l3Id: 'linux', l3Name: 'Linux' },
    'applet': { l3Id: 'applet', l3Name: '小程序' },
    'vue3': { l3Id: 'vue', l3Name: 'Vue' },
}

// 生成稳定 ID
function generateId(source: string, path: string): string {
    // 简单哈希函数（浏览器兼容）
    let hash = 0
    const str = `${source}:${path}`
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
}

// 提取短标题
function extractTitle(filename: string, question: string): string {
    const fromFilename = filename.replace(/\.md$/i, '').slice(0, 6)
    if (fromFilename.length >= 2) return fromFilename
    return question.slice(0, 6).replace(/[#*\s]/g, '')
}

export interface SyncProgress {
    stage: 'checking' | 'fetching-febobo' | 'fetching-sudheerj' | 'saving' | 'done' | 'error'
    current: number
    total: number
    message: string
}

export type SyncProgressCallback = (progress: SyncProgress) => void

/**
 * 检查是否需要初始化题库
 */
export async function needsInitialization(): Promise<boolean> {
    const cardCount = await db.cards.count()
    return cardCount === 0
}

/**
 * 从 GitHub 同步题库到 IndexedDB
 */
export async function syncFromGitHub(onProgress?: SyncProgressCallback): Promise<{ success: boolean; count: number; error?: string }> {
    const report = (stage: SyncProgress['stage'], current: number, total: number, message: string) => {
        onProgress?.({ stage, current, total, message })
    }

    try {
        report('checking', 0, 0, '检查题库状态...')

        const allCards: Partial<Card>[] = []
        const categoriesSet = new Set<string>()

        // ========== 同步 febobo/web-interview ==========
        report('fetching-febobo', 0, 0, '正在从 febobo/web-interview 获取题目...')

        try {
            const docsUrl = 'https://api.github.com/repos/febobo/web-interview/contents/docs'
            const docsRes = await fetch(docsUrl)
            if (!docsRes.ok) throw new Error(`GitHub API error: ${docsRes.status}`)

            const dirs = await docsRes.json() as Array<{ name: string; type: string; url: string }>
            const validDirs = dirs.filter(d => d.type === 'dir' && !d.name.startsWith('.'))

            let processed = 0
            for (const dir of validDirs) {
                const categoryName = dir.name
                const categoryConfig = CATEGORY_MAP[categoryName] || {
                    l3Id: categoryName.toLowerCase(),
                    l3Name: categoryName
                }
                categoriesSet.add(categoryConfig.l3Id)

                report('fetching-febobo', processed, validDirs.length, `处理 ${categoryName}...`)

                try {
                    const filesRes = await fetch(dir.url)
                    const files = await filesRes.json() as Array<{ name: string; type: string; download_url: string }>

                    for (const file of files) {
                        if (file.type !== 'file' || !file.name.endsWith('.md')) continue

                        try {
                            const contentRes = await fetch(file.download_url)
                            const content = await contentRes.text()

                            const lines = content.split('\n')
                            let question = ''
                            for (const line of lines) {
                                if (line.startsWith('#')) {
                                    question = line.replace(/^#+\s*/, '').trim()
                                    break
                                }
                            }
                            if (!question) question = file.name.replace('.md', '')

                            allCards.push({
                                id: generateId('febobo', `${categoryName}/${file.name}`),
                                source: 'upstream',
                                upstreamSource: 'febobo',
                                categoryL1Id: 'technical',
                                categoryL2Id: 'web-frontend',
                                categoryL3Id: categoryConfig.l3Id,
                                title: extractTitle(file.name, question),
                                question: question,
                                answer: content,
                                questionType: 'concept',
                                difficulty: 'must-know',
                                frequency: 'mid',
                                customTags: [],
                                mastery: 'new',
                                reviewCount: 0,
                                intervalDays: 0,
                                dueAt: new Date(),
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                originUpstreamId: `febobo:${categoryName}/${file.name}`
                            })
                        } catch (e) {
                            console.warn(`Failed to fetch ${file.name}:`, e)
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to process directory ${categoryName}:`, e)
                }

                processed++
                // 添加小延迟避免 API 限制
                await new Promise(r => setTimeout(r, 50))
            }
        } catch (e) {
            console.error('Failed to sync febobo:', e)
        }

        // ========== 同步 sudheerj/reactjs-interview-questions ==========
        report('fetching-sudheerj', 0, 0, '正在从 sudheerj/reactjs-interview-questions 获取题目...')

        try {
            const readmeUrl = 'https://raw.githubusercontent.com/sudheerj/reactjs-interview-questions/master/README.md'
            const res = await fetch(readmeUrl)
            const content = await res.text()

            const questionRegex = /###\s+(\d+)\.\s+(.+?)(?=\n)/g
            const sections = content.split(/###\s+\d+\.\s+/)

            let match
            let index = 0
            while ((match = questionRegex.exec(content)) !== null) {
                index++
                const questionNum = match[1]
                const questionTitle = match[2].trim()

                const answerSection = sections[index] || ''
                const answerLines = answerSection.split('\n').slice(1)
                const answer = answerLines.join('\n').trim()

                if (questionTitle && answer.length > 10) {
                    allCards.push({
                        id: generateId('sudheerj', questionNum),
                        source: 'upstream',
                        upstreamSource: 'sudheerj',
                        categoryL1Id: 'technical',
                        categoryL2Id: 'web-frontend',
                        categoryL3Id: 'react',
                        title: questionTitle.slice(0, 6),
                        question: questionTitle,
                        answer: answer,
                        questionType: 'concept',
                        difficulty: 'must-know',
                        frequency: 'mid',
                        customTags: [],
                        mastery: 'new',
                        reviewCount: 0,
                        intervalDays: 0,
                        dueAt: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        originUpstreamId: `sudheerj:${questionNum}`
                    })
                }

                report('fetching-sudheerj', index, 0, `已解析 ${index} 道 React 题目...`)
            }
            categoriesSet.add('react')
        } catch (e) {
            console.error('Failed to sync sudheerj:', e)
        }

        // ========== 保存到 IndexedDB ==========
        report('saving', 0, allCards.length, '正在保存到本地数据库...')

        // 保存分类
        const defaultCategories: Category[] = [
            { id: 'technical', level: 1, name: '技术面试', nameEn: 'Technical Interview' },
            { id: 'behavioral', level: 1, name: '行为面试', nameEn: 'Behavioral Interview' },
            { id: 'web-frontend', level: 2, name: 'Web前端', nameEn: 'Web Frontend', parentId: 'technical' },
            { id: 'algorithm', level: 2, name: '算法', nameEn: 'Algorithm', parentId: 'technical' },
        ]

        categoriesSet.forEach(l3Id => {
            const config = Object.values(CATEGORY_MAP).find(c => c.l3Id === l3Id)
            defaultCategories.push({
                id: l3Id,
                level: 3,
                name: config?.l3Name || l3Id,
                parentId: 'web-frontend'
            })
        })

        await db.categories.bulkPut(defaultCategories)

        // 保存卡片
        let saved = 0
        for (const card of allCards) {
            try {
                await db.cards.put(card as Card)
                saved++
                if (saved % 20 === 0) {
                    report('saving', saved, allCards.length, `已保存 ${saved}/${allCards.length} 道题目...`)
                }
            } catch (e) {
                console.warn(`Failed to save card ${card.id}:`, e)
            }
        }

        report('done', saved, saved, `✅ 成功导入 ${saved} 道题目！`)

        return { success: true, count: saved }
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : '未知错误'
        report('error', 0, 0, `❌ 同步失败: ${errorMsg}`)
        return { success: false, count: 0, error: errorMsg }
    }
}
