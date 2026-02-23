'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { messages, type MessageKey } from './messages'
import type { ContentLanguage, UILanguage } from './types'

const UI_LANG_KEY = 'eslinterviewprep.uiLanguage'
const CONTENT_LANG_KEY = 'eslinterviewprep.contentLanguage'

interface I18nContextValue {
    uiLanguage: UILanguage
    contentLanguage: ContentLanguage
    setUiLanguage: (language: UILanguage) => void
    setContentLanguage: (language: ContentLanguage) => void
    t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function formatMessage(template: string, vars?: Record<string, string | number>): string {
    if (!vars) return template
    return template.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = vars[key]
        return value === undefined ? `{${key}}` : String(value)
    })
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [uiLanguage, setUiLanguageState] = useState<UILanguage>(() => {
        if (typeof window === 'undefined') return 'zh-CN'
        const savedUi = window.localStorage.getItem(UI_LANG_KEY)
        return savedUi === 'zh-CN' || savedUi === 'en-US' ? savedUi : 'zh-CN'
    })
    const [contentLanguage, setContentLanguageState] = useState<ContentLanguage>(() => {
        if (typeof window === 'undefined') return 'zh-CN'
        const savedContent = window.localStorage.getItem(CONTENT_LANG_KEY)
        return savedContent === 'zh-CN' || savedContent === 'en-US' ? savedContent : 'zh-CN'
    })

    useEffect(() => {
        if (typeof document === 'undefined') return
        document.documentElement.lang = uiLanguage === 'zh-CN' ? 'zh-CN' : 'en'
    }, [uiLanguage])

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (!window.localStorage.getItem(UI_LANG_KEY)) {
            window.localStorage.setItem(UI_LANG_KEY, 'zh-CN')
        }
        if (!window.localStorage.getItem(CONTENT_LANG_KEY)) {
            window.localStorage.setItem(CONTENT_LANG_KEY, 'zh-CN')
        }
    }, [])

    const setUiLanguage = useCallback((language: UILanguage) => {
        setUiLanguageState(language)
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(UI_LANG_KEY, language)
        }
    }, [])

    const setContentLanguage = useCallback((language: ContentLanguage) => {
        setContentLanguageState(language)
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(CONTENT_LANG_KEY, language)
        }
    }, [])

    const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => {
        const message = messages[uiLanguage][key] ?? messages['zh-CN'][key] ?? key
        return formatMessage(message, vars)
    }, [uiLanguage])

    const value = useMemo<I18nContextValue>(() => ({
        uiLanguage,
        contentLanguage,
        setUiLanguage,
        setContentLanguage,
        t
    }), [uiLanguage, contentLanguage, setUiLanguage, setContentLanguage, t])

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
    const context = useContext(I18nContext)
    if (!context) {
        throw new Error('useI18n must be used within I18nProvider')
    }
    return context
}
