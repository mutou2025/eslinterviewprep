import { NextResponse, type NextRequest } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { getSupabaseAdminClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type UpstreamCategory = {
    id: string
    level: 1 | 2 | 3
    name: string
    nameEn?: string
    parentId?: string
}

type UpstreamCard = {
    id: string
    source: string
    upstreamSource?: string
    categoryL1Id: string
    categoryL2Id: string
    categoryL3Id: string
    title: string
    question: string
    answer?: string
    questionType: string
    difficulty: string
    frequency: string
    customTags?: string[]
    originUpstreamId?: string
    createdAt?: string
    updatedAt?: string
}

function chunk<T>(items: T[], size: number): T[][] {
    const result: T[][] = []
    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size))
    }
    return result
}

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization') || ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

        if (!token) {
            return NextResponse.json({ success: false, error: '未授权' }, { status: 401 })
        }

        const supabase = getSupabaseAdminClient()
        const { data: authData, error: authError } = await supabase.auth.getUser(token)
        if (authError || !authData.user) {
            return NextResponse.json({ success: false, error: '无效的登录状态' }, { status: 401 })
        }

        const { count: cardCount, error: cardCountError } = await supabase
            .from('cards')
            .select('id', { count: 'exact', head: true })
        if (cardCountError) {
            return NextResponse.json({ success: false, error: cardCountError.message }, { status: 500 })
        }

        const isBootstrapImport = (cardCount || 0) === 0
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .maybeSingle()

        if (!isBootstrapImport && profile?.role !== 'admin') {
            return NextResponse.json({ success: false, error: '需要管理员权限' }, { status: 403 })
        }

        const dataPath = path.join(process.cwd(), 'data', 'upstream.json')

        const raw = await fs.readFile(dataPath, 'utf8')
        const payload = JSON.parse(raw) as { categories: UpstreamCategory[]; cards: UpstreamCard[] }

        const categories = payload.categories.map(cat => ({
            id: cat.id,
            level: cat.level,
            name: cat.name,
            name_en: cat.nameEn ?? null,
            parent_id: cat.parentId ?? null
        }))

        // 去重，避免同一批次 upsert 出现重复主键导致报错
        const uniqueCategories = Array.from(new Map(categories.map(cat => [cat.id, cat])).values())

        const categoryStats = {
            total: categories.length,
            unique: uniqueCategories.length,
            duplicates: Math.max(categories.length - uniqueCategories.length, 0)
        }

        const { error: categoryError } = await supabase
            .from('categories')
            .upsert(uniqueCategories, { onConflict: 'id' })

        if (categoryError) {
            return NextResponse.json({ success: false, error: categoryError.message })
        }

        const cards = payload.cards.map(card => ({
            id: card.id,
            source: card.source,
            upstream_source: card.upstreamSource ?? null,
            category_l1_id: card.categoryL1Id,
            category_l2_id: card.categoryL2Id,
            category_l3_id: card.categoryL3Id,
            title: card.title,
            question: card.question,
            answer: card.answer ?? null,
            question_type: card.questionType,
            difficulty: card.difficulty,
            frequency: card.frequency,
            custom_tags: card.customTags ?? [],
            origin_upstream_id: card.originUpstreamId ?? null,
            created_at: card.createdAt ? new Date(card.createdAt).toISOString() : new Date().toISOString(),
            updated_at: card.updatedAt ? new Date(card.updatedAt).toISOString() : new Date().toISOString()
        }))

        // 去重，避免同一批次 upsert 出现重复主键导致报错
        const uniqueCards = Array.from(new Map(cards.map(card => [card.id, card])).values())

        const cardStats = {
            total: cards.length,
            unique: uniqueCards.length,
            duplicates: Math.max(cards.length - uniqueCards.length, 0)
        }

        const batches = chunk(uniqueCards, 500)
        for (const batch of batches) {
            const { error } = await supabase
                .from('cards')
                .upsert(batch, { onConflict: 'id' })
            if (error) {
                return NextResponse.json({ success: false, error: error.message })
            }
        }

        return NextResponse.json({
            success: true,
            count: uniqueCards.length,
            stats: {
                cards: cardStats,
                categories: categoryStats
            }
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : '导入失败'
        return NextResponse.json({ success: false, error: message })
    }
}
