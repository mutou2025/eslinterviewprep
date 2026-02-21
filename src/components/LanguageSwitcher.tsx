'use client'

import { Languages } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/provider'

export function LanguageSwitcher() {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const { uiLanguage, contentLanguage, setUiLanguage, setContentLanguage, t } = useI18n()

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [open])

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setOpen(prev => !prev)}
                className="p-2 text-[#57606a] hover:text-[#1f2328] hover:bg-[#f6f8fa] rounded-lg transition-colors"
                title={t('language.title')}
                aria-label={t('language.title')}
            >
                <Languages size={18} />
            </button>

            {open && (
                <div className="absolute bottom-11 right-0 w-60 bg-white border border-[#d0d7de] rounded-xl shadow-lg p-3 z-20 space-y-3">
                    <div>
                        <p className="text-xs text-[#57606a] mb-2">{t('language.ui')}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setUiLanguage('zh-CN')}
                                className={`px-2 py-1.5 rounded-md text-sm border transition-colors ${uiLanguage === 'zh-CN'
                                    ? 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff66]'
                                    : 'border-[#d0d7de] text-[#57606a] hover:bg-[#f6f8fa]'
                                    }`}
                            >
                                {t('language.zh')}
                            </button>
                            <button
                                onClick={() => setUiLanguage('en-US')}
                                className={`px-2 py-1.5 rounded-md text-sm border transition-colors ${uiLanguage === 'en-US'
                                    ? 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff66]'
                                    : 'border-[#d0d7de] text-[#57606a] hover:bg-[#f6f8fa]'
                                    }`}
                            >
                                {t('language.en')}
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-[#57606a] mb-2">{t('language.content')}</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setContentLanguage('zh-CN')}
                                className={`px-2 py-1.5 rounded-md text-sm border transition-colors ${contentLanguage === 'zh-CN'
                                    ? 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff66]'
                                    : 'border-[#d0d7de] text-[#57606a] hover:bg-[#f6f8fa]'
                                    }`}
                            >
                                {t('language.zh')}
                            </button>
                            <button
                                onClick={() => setContentLanguage('en-US')}
                                className={`px-2 py-1.5 rounded-md text-sm border transition-colors ${contentLanguage === 'en-US'
                                    ? 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff66]'
                                    : 'border-[#d0d7de] text-[#57606a] hover:bg-[#f6f8fa]'
                                    }`}
                            >
                                {t('language.en')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
