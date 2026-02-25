import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'
import { consumeRateLimit, getClientIp } from '@/lib/server-rate-limit'

export const runtime = 'nodejs'

const ANSWER_SELECT_I18N = 'answer,answer_zh,answer_en'
const ANSWER_SELECT_LEGACY = 'answer'
const MISSING_I18N_COLUMN_REGEX = /column cards\.(title_zh|title_en|question_zh|question_en|answer_zh|answer_en) does not exist/i

function getErrorMessage(error: unknown): string {
    if (!error) return ''
    if (typeof error === 'string') return error
    if (typeof error === 'object' && error !== null) {
        const withMessage = error as { message?: unknown }
        if (typeof withMessage.message === 'string') return withMessage.message
        try {
            return JSON.stringify(error)
        } catch {
            return String(error)
        }
    }
    return String(error)
}

function shouldFallbackToLegacySelect(error: unknown): boolean {
    const message = getErrorMessage(error).trim()
    if (MISSING_I18N_COLUMN_REGEX.test(message)) return true
    if (message === '' || message === '{}') return true

    if (error && typeof error === 'object') {
        const withCode = error as { code?: unknown }
        if (withCode.code === '42703') return true
    }

    return false
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
        const language = searchParams.get('language') === 'en-US' ? 'en-US' : 'zh-CN'
        if (!cardId) {
            return NextResponse.json({ success: false, error: '缺少 cardId' }, { status: 400 })
        }

        const buildQuery = (selectColumns: string) => supabase
            .from('cards')
            .select(selectColumns)
            .eq('id', cardId)
            .maybeSingle()

        let { data, error } = await buildQuery(ANSWER_SELECT_I18N)
        if (error && shouldFallbackToLegacySelect(error)) {
            const fallbackResult = await buildQuery(ANSWER_SELECT_LEGACY)
            data = fallbackResult.data
            error = fallbackResult.error
        }

        if (error) {
            return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
        }

        return NextResponse.json(
            {
                success: true,
                answer: (data as { answer: string | null } | null)?.answer ?? null,
                answerZh: (data as { answer_zh: string | null } | null)?.answer_zh ?? null,
                answerEn: (data as { answer_en: string | null } | null)?.answer_en ?? null,
                language
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
