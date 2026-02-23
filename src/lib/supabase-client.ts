import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseConfigIssue(): string | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
        return 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    }

    const hasPlaceholderUrl = url.includes('YOUR_PROJECT_REF') || url.includes('your_project_ref')
    const hasPlaceholderAnonKey = anonKey.startsWith('YOUR_')
    if (hasPlaceholderUrl || hasPlaceholderAnonKey) {
        return 'Supabase env vars are placeholders. Please set real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    }

    return null
}

export function getSupabaseClient(): SupabaseClient {
    if (client) return client

    const issue = getSupabaseConfigIssue()
    if (issue) {
        throw new Error(issue)
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

    client = createClient(url, anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true
        }
    })

    return client
}
