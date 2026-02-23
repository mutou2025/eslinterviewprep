'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient, getSupabaseConfigIssue } from '@/lib/supabase-client'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function routeBySession() {
      const configIssue = getSupabaseConfigIssue()
      if (configIssue) {
        router.replace('/site-intro')
        return
      }

      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase.auth.getUser()
        if (cancelled) return

        if (data.user) {
          router.replace('/dashboard')
        } else {
          router.replace('/site-intro')
        }
      } catch {
        if (!cancelled) {
          router.replace('/site-intro')
        }
      }
    }

    routeBySession()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full" />
    </div>
  )
}
