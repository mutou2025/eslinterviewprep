import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'
import { consumeRateLimit, getClientIp } from '@/lib/server-rate-limit'

export const runtime = 'nodejs'

const MAX_PAGE_SIZE = 100
const CARD_SELECT_I18N = 'id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,title_zh,title_en,question,question_zh,question_en,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at'
const CARD_SELECT_LEGACY = 'id,source,upstream_source,category_l1_id,category_l2_id,category_l3_id,title,question,question_type,difficulty,frequency,custom_tags,origin_upstream_id,created_at,updated_at'
const MISSING_I18N_COLUMN_REGEX = /column cards\.(title_zh|title_en|question_zh|question_en|answer_zh|answer_en) does not exist/i

function parsePositiveInt(value: string | null, fallback: number): number {
    if (!value) return fallback
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback
    return Math.floor(parsed)
}

function parseCsv(value: string | null): string[] {
    if (!value) return []
    return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
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

        const ip = getClientIp(request.headers)
        const limiter = consumeRateLimit(`library:cards:${authData.user.id}:${ip}`, {
            windowMs: 60_000,
            max: 120
        })
        if (!limiter.allowed) {
            const retryAfterSeconds = Math.max(1, Math.ceil((limiter.resetAt - Date.now()) / 1000))
            return NextResponse.json(
                { success: false, error: '请求过于频繁，请稍后再试' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(retryAfterSeconds),
                        'X-RateLimit-Remaining': String(limiter.remaining),
                        'X-RateLimit-Reset': String(limiter.resetAt)
                    }
                }
            )
        }

        const { searchParams } = new URL(request.url)
        const page = parsePositiveInt(searchParams.get('page'), 1)
        const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), 40), MAX_PAGE_SIZE)
        const search = searchParams.get('search')?.trim() || ''
        const categoryL3Id = searchParams.get('categoryL3Id')?.trim() || ''
        const categoryL3Ids = parseCsv(searchParams.get('categoryL3Ids'))

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        function buildCardsQuery(selectColumns: string) {
            let query = supabase
                .from('cards')
                .select(selectColumns, { count: 'exact' })

            if (search) {
                query = query.or(`title.ilike.%${search}%,question.ilike.%${search}%`)
            }

            if (categoryL3Id) {
                query = query.eq('category_l3_id', categoryL3Id)
            } else if (categoryL3Ids.length > 0) {
                query = query.in('category_l3_id', categoryL3Ids)
            }

            return query.order('id').range(from, to)
        }

        let { data, error, count } = await buildCardsQuery(CARD_SELECT_I18N)
        if (error && MISSING_I18N_COLUMN_REGEX.test(error.message || '')) {
            const fallbackResult = await buildCardsQuery(CARD_SELECT_LEGACY)
            data = fallbackResult.data
            error = fallbackResult.error
            count = fallbackResult.count
        }

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json(
            {
                success: true,
                cards: data || [],
                total: count || 0,
                page,
                pageSize
            },
            {
                headers: {
                    'X-RateLimit-Remaining': String(limiter.remaining),
                    'X-RateLimit-Reset': String(limiter.resetAt)
                }
            }
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : '获取题库失败'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
