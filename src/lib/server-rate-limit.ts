type RateLimitOptions = {
    windowMs: number
    max: number
}

type RateLimitEntry = {
    count: number
    resetAt: number
}

type RateLimitResult = {
    allowed: boolean
    remaining: number
    resetAt: number
}

const globalForRateLimit = globalThis as typeof globalThis & {
    __eslInterviewPrepRateLimitStore?: Map<string, RateLimitEntry>
}

const store = globalForRateLimit.__eslInterviewPrepRateLimitStore ?? new Map<string, RateLimitEntry>()
globalForRateLimit.__eslInterviewPrepRateLimitStore = store

export function getClientIp(headers: Headers): string {
    const forwardedFor = headers.get('x-forwarded-for')
    if (forwardedFor) {
        return forwardedFor.split(',')[0]?.trim() || 'unknown'
    }

    const realIp = headers.get('x-real-ip')
    if (realIp) return realIp

    return 'unknown'
}

export function consumeRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
    const now = Date.now()
    const current = store.get(key)

    if (!current || now >= current.resetAt) {
        const resetAt = now + options.windowMs
        store.set(key, { count: 1, resetAt })
        return {
            allowed: true,
            remaining: Math.max(0, options.max - 1),
            resetAt
        }
    }

    if (current.count >= options.max) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: current.resetAt
        }
    }

    const nextCount = current.count + 1
    store.set(key, { count: nextCount, resetAt: current.resetAt })
    return {
        allowed: true,
        remaining: Math.max(0, options.max - nextCount),
        resetAt: current.resetAt
    }
}
