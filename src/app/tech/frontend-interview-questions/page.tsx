import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Code2, Layers, Globe, Zap } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Frontend Interview Questions - React, JavaScript, CSS, HTML',
    description: 'Comprehensive frontend interview questions for React, JavaScript, TypeScript, CSS, HTML. Perfect for Chinese & ESL job seekers preparing for North America tech interviews.',
    keywords: ['frontend interview', 'react interview questions', 'javascript interview', 'css interview', 'web developer interview', 'ESL tech interview'],
}

const topics = [
    {
        id: 'javascript',
        name: 'JavaScript',
        nameZh: 'JavaScript 面试题',
        icon: Code2,
        count: 50,
        description: 'Core concepts, closures, promises, event loop, and ES6+ features'
    },
    {
        id: 'react',
        name: 'React',
        nameZh: 'React 面试题',
        icon: Layers,
        count: 45,
        description: 'Hooks, state management, lifecycle, performance optimization'
    },
    {
        id: 'css',
        name: 'CSS',
        nameZh: 'CSS 面试题',
        icon: Globe,
        count: 30,
        description: 'Flexbox, Grid, animations, responsive design, CSS-in-JS'
    },
    {
        id: 'typescript',
        name: 'TypeScript',
        nameZh: 'TypeScript 面试题',
        icon: Zap,
        count: 25,
        description: 'Types, interfaces, generics, utility types, best practices'
    },
]

export default function FrontendInterviewQuestionsPage() {
    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* SEO H1 */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Frontend Interview Questions
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    Master essential frontend concepts for your next tech interview in North America.
                    <span className="block text-gray-500 mt-2">
                        为北美求职的中国和 ESL 开发者准备的前端面试题库
                    </span>
                </p>

                {/* Topics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {topics.map(topic => {
                        const Icon = topic.icon
                        return (
                            <Link
                                key={topic.id}
                                href={`/library/categories/${topic.id}`}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-[#d0d7de] hover:shadow-md transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                        <Icon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            {topic.name}
                                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">{topic.nameZh}</p>
                                        <p className="text-sm text-gray-600 mt-2">{topic.description}</p>
                                        <p className="text-xs text-blue-600 mt-2">{topic.count}+ questions</p>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-slate-900 to-blue-700 rounded-2xl p-6 text-white">
                    <h2 className="text-xl font-bold mb-2">Start Practicing Now</h2>
                    <p className="text-blue-100 mb-4">
                        Use spaced repetition flashcards to master these concepts efficiently
                    </p>
                    <Link
                        href="/review/qa"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors"
                    >
                        Start Review
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
