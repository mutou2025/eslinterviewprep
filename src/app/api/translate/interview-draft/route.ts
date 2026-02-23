import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase-server'
import { consumeRateLimit, getClientIp } from '@/lib/server-rate-limit'

export const runtime = 'nodejs'

type TranslationResponse = {
    titleEn: string
    answerEn: string
}

function safeTrim(value: unknown): string {
    if (typeof value !== 'string') return ''
    return value.trim()
}

function fallbackTranslation(title: string, answer: string) {
    return {
        success: true,
        generated: false,
        titleEn: title,
        answerEn: answer
    }
}

export async function POST(request: NextRequest) {
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
        const limiter = consumeRateLimit(`translate:draft:${authData.user.id}:${ip}`, {
            windowMs: 60_000,
            max: 30
        })
        if (!limiter.allowed) {
            const retryAfterSeconds = Math.max(1, Math.ceil((limiter.resetAt - Date.now()) / 1000))
            return NextResponse.json(
                { success: false, error: '请求过于频繁，请稍后再试' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(retryAfterSeconds)
                    }
                }
            )
        }

        const body = await request.json().catch(() => ({}))
        const title = safeTrim((body as { title?: unknown }).title)
        const answer = safeTrim((body as { answer?: unknown }).answer)

        if (!title || !answer) {
            return NextResponse.json({ success: false, error: '标题和答案不能为空' }, { status: 400 })
        }

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            return NextResponse.json(fallbackTranslation(title, answer))
        }

        const prompt = [
            'You are a professional technical interview bilingual editor.',
            'Translate the input Chinese interview question and answer into clear, concise English for ESL learners.',
            'Preserve markdown structure and technical terms.',
            'Return only compact JSON with keys: titleEn, answerEn.'
        ].join(' ')

        const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.2,
                messages: [
                    { role: 'system', content: prompt },
                    {
                        role: 'user',
                        content: JSON.stringify({ title, answer })
                    }
                ],
                response_format: { type: 'json_object' }
            })
        })

        if (!openAiResponse.ok) {
            return NextResponse.json(fallbackTranslation(title, answer))
        }

        const raw = await openAiResponse.json() as {
            choices?: Array<{ message?: { content?: string | null } }>
        }
        const content = raw.choices?.[0]?.message?.content
        if (!content) {
            return NextResponse.json(fallbackTranslation(title, answer))
        }

        const parsed = JSON.parse(content) as Partial<TranslationResponse>
        const titleEn = safeTrim(parsed.titleEn)
        const answerEn = safeTrim(parsed.answerEn)

        if (!titleEn || !answerEn) {
            return NextResponse.json(fallbackTranslation(title, answer))
        }

        return NextResponse.json({
            success: true,
            generated: true,
            titleEn,
            answerEn
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : '翻译失败'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
