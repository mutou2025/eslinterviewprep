import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'
import { consumeRateLimit, getClientIp } from '@/lib/server-rate-limit'

export const runtime = 'nodejs'

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
        const limiter = consumeRateLimit(`library:answer:${authData.user.id}:${ip}`, {
            windowMs: 60_000,
            max: 180
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
        const cardId = searchParams.get('cardId')?.trim()
        if (!cardId) {
            return NextResponse.json({ success: false, error: '缺少 cardId' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('cards')
            .select('answer')
            .eq('id', cardId)
            .maybeSingle()

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json(
            {
                success: true,
                answer: (data as { answer: string | null } | null)?.answer ?? null
            },
            {
                headers: {
                    'X-RateLimit-Remaining': String(limiter.remaining),
                    'X-RateLimit-Reset': String(limiter.resetAt)
                }
            }
        )
    } catch (error) {
        const message = error instanceof Error ? error.message : '获取答案失败'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
