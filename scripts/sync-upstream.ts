#!/usr/bin/env npx ts-node

/**
 * 题库同步脚本
 * 从两个上游仓库同步面试题:
 * 1. febobo/web-interview - docs/*.md 文件
 * 2. sudheerj/reactjs-interview-questions - README.md Q&A
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { fileURLToPath } from 'url'

// ESM 兼容：获取 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 类型定义
interface RawCard {
    id: string
    source: 'upstream'
    upstreamSource: 'febobo' | 'sudheerj'
    categoryL1Id: string
    categoryL2Id: string
    categoryL3Id: string
    title: string
    question: string
    answer: string
    questionType: 'concept' | 'coding' | 'output' | 'debug' | 'scenario' | 'design'
    difficulty: 'easy' | 'must-know' | 'hard' | 'hand-write'
    frequency: 'high' | 'mid' | 'low'
    customTags: string[]
    mastery: 'new'
    reviewCount: 0
    intervalDays: 0
    dueAt: string
    createdAt: string
    updatedAt: string
    originUpstreamId: string
}

interface SyncResult {
    cards: RawCard[]
    categories: Array<{
        id: string
        level: 1 | 2 | 3
        name: string
        nameEn?: string
        parentId?: string
    }>
}

// 分类映射
const CATEGORY_MAP: Record<string, { l3Id: string; l3Name: string }> = {
    'React': { l3Id: 'react', l3Name: 'React' },
    'JavaScript': { l3Id: 'javascript', l3Name: 'JavaScript' },
    'css': { l3Id: 'css', l3Name: 'CSS' },
    'vue': { l3Id: 'vue', l3Name: 'Vue' },
    'http': { l3Id: 'network', l3Name: 'Network' },
    'webpack': { l3Id: 'webpack', l3Name: 'Webpack' },
    '算法与数据结构': { l3Id: 'algorithm', l3Name: 'Algorithm' },
    'es6': { l3Id: 'es6', l3Name: 'ES6' },
    'NodeJS': { l3Id: 'nodejs', l3Name: 'NodeJS' },
    'TypeScript': { l3Id: 'typescript', l3Name: 'TypeScript' },
    '设计模式': { l3Id: 'design-pattern', l3Name: '设计模式' },
    'Git': { l3Id: 'git', l3Name: 'Git' },
    'Linux': { l3Id: 'linux', l3Name: 'Linux' },
    '小程序': { l3Id: 'applet', l3Name: '小程序' },
    'applet': { l3Id: 'applet', l3Name: '小程序' },
    'vue3': { l3Id: 'vue', l3Name: 'Vue' },
}

// 生成稳定 ID
function generateId(source: string, path: string): string {
    return crypto.createHash('md5').update(`${source}:${path}`).digest('hex').slice(0, 16)
}

// 提取短标题 (≤6字符)
function extractTitle(filename: string, question: string): string {
    // 从文件名提取
    const fromFilename = filename.replace(/\.md$/i, '').slice(0, 6)
    if (fromFilename.length >= 2) return fromFilename

    // 从问题提取
    const match = question.match(/[说谈讲]说?(.{2,6})[的是吗？?]/)
    if (match) return match[1].slice(0, 6)

    return question.slice(0, 6).replace(/[#*\s]/g, '')
}

// 从 GitHub API 获取内容
async function fetchGitHub(url: string): Promise<unknown> {
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'interview-flashcards-sync'
        }
    })
    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
    }
    return response.json()
}

// 同步 febobo/web-interview
async function syncFebobo(): Promise<RawCard[]> {
    console.log('📚 Syncing febobo/web-interview...')
    const cards: RawCard[] = []

    try {
        // 获取 docs 目录列表
        const docsUrl = 'https://api.github.com/repos/febobo/web-interview/contents/docs'
        const dirs = await fetchGitHub(docsUrl) as Array<{ name: string; type: string; url: string }>

        for (const dir of dirs) {
            if (dir.type !== 'dir') continue

            const categoryName = dir.name
            const categoryConfig = CATEGORY_MAP[categoryName] || {
                l3Id: categoryName.toLowerCase(),
                l3Name: categoryName
            }

            console.log(`  📁 Processing ${categoryName}...`)

            // 获取目录下的文件
            const files = await fetchGitHub(dir.url) as Array<{
                name: string
                type: string
                download_url: string
            }>

            for (const file of files) {
                if (file.type !== 'file' || !file.name.endsWith('.md')) continue

                try {
                    // 获取文件内容
                    const contentResponse = await fetch(file.download_url)
                    const content = await contentResponse.text()

                    // 解析标题和内容
                    const lines = content.split('\n')
                    let question = ''
                    let answer = content

                    // 查找第一个标题作为问题
                    for (const line of lines) {
                        if (line.startsWith('#')) {
                            question = line.replace(/^#+\s*/, '').trim()
                            break
                        }
                    }

                    if (!question) {
                        question = file.name.replace('.md', '')
                    }

                    const card: RawCard = {
                        id: generateId('febobo', `${categoryName}/${file.name}`),
                        source: 'upstream',
                        upstreamSource: 'febobo',
                        categoryL1Id: 'technical',
                        categoryL2Id: 'web-frontend',
                        categoryL3Id: categoryConfig.l3Id,
                        title: extractTitle(file.name, question),
                        question: question,
                        answer: answer,
                        questionType: 'concept',
                        difficulty: 'must-know',
                        frequency: 'mid',
                        customTags: [],
                        mastery: 'new',
                        reviewCount: 0,
                        intervalDays: 0,
                        dueAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        originUpstreamId: `febobo:${categoryName}/${file.name}`
                    }

                    cards.push(card)
                } catch (err) {
                    console.error(`    ⚠️ Failed to process ${file.name}:`, err)
                }

                // 避免 API 限制
                await new Promise(resolve => setTimeout(resolve, 100))
            }
        }
    } catch (err) {
        console.error('❌ Failed to sync febobo:', err)
    }

    console.log(`  ✅ Synced ${cards.length} cards from febobo`)
    return cards
}

// 同步 sudheerj/reactjs-interview-questions
async function syncSudheerj(): Promise<RawCard[]> {
    console.log('📚 Syncing sudheerj/reactjs-interview-questions...')
    const cards: RawCard[] = []

    try {
        const readmeUrl = 'https://raw.githubusercontent.com/sudheerj/reactjs-interview-questions/master/README.md'
        const response = await fetch(readmeUrl)
        const content = await response.text()

        // 解析 Q&A 格式: ### 1. What is React?
        const questionRegex = /###\s+(\d+)\.\s+(.+?)(?=\n)/g
        const sections = content.split(/###\s+\d+\.\s+/)

        let match
        let index = 0
        while ((match = questionRegex.exec(content)) !== null) {
            index++
            const questionNum = match[1]
            const questionTitle = match[2].trim()

            // 获取答案内容（到下一个问题之前）
            const answerSection = sections[index] || ''
            const answerLines = answerSection.split('\n').slice(1) // 跳过标题行
            const answer = answerLines.join('\n').trim()

            if (questionTitle && answer.length > 10) {
                const card: RawCard = {
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
                    dueAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    originUpstreamId: `sudheerj:${questionNum}`
                }

                cards.push(card)
            }
        }
    } catch (err) {
        console.error('❌ Failed to sync sudheerj:', err)
    }

    console.log(`  ✅ Synced ${cards.length} cards from sudheerj`)
    return cards
}

// 主函数
async function main() {
    console.log('🚀 Starting upstream sync...\n')

    const feboboCards = await syncFebobo()
    const sudheerCards = await syncSudheerj()

    const allCards = [...feboboCards, ...sudheerCards]

    // 生成分类
    const categoriesSet = new Set<string>()
    allCards.forEach(card => {
        categoriesSet.add(card.categoryL3Id)
    })

    const categories = [
        { id: 'technical', level: 1 as const, name: '技术面试', nameEn: 'Technical Interview' },
        { id: 'behavioral', level: 1 as const, name: '行为面试', nameEn: 'Behavioral Interview' },
        { id: 'web-frontend', level: 2 as const, name: 'Web前端', nameEn: 'Web Frontend', parentId: 'technical' },
        { id: 'algorithm', level: 2 as const, name: '算法', nameEn: 'Algorithm', parentId: 'technical' },
    ]

    // 添加 L3 分类
    categoriesSet.forEach(l3Id => {
        const config = Object.values(CATEGORY_MAP).find(c => c.l3Id === l3Id)
        categories.push({
            id: l3Id,
            level: 3 as const,
            name: config?.l3Name || l3Id,
            parentId: 'web-frontend'
        })
    })

    const result: SyncResult = {
        cards: allCards,
        categories
    }

    // 保存结果
    const outputDir = path.join(__dirname, '..', 'data')
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
    }

    const outputPath = path.join(outputDir, 'upstream.json')
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

    console.log(`\n✅ Sync complete!`)
    console.log(`   Total cards: ${allCards.length}`)
    console.log(`   Categories: ${categories.length}`)
    console.log(`   Output: ${outputPath}`)
}

main().catch(console.error)
