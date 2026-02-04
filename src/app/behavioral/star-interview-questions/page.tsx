import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Target, MessageSquare, Users, Trophy } from 'lucide-react'

export const metadata: Metadata = {
    title: 'STAR Interview Questions - Behavioral Interview Prep',
    description: 'Master the STAR method (Situation, Task, Action, Result) for behavioral interviews. Perfect for Chinese & ESL job seekers preparing for North America interviews.',
    keywords: ['STAR interview', 'behavioral interview questions', 'situational interview', 'leadership questions', 'teamwork interview', 'ESL interview prep'],
}

const starCategories = [
    {
        id: 'leadership',
        name: 'Leadership',
        nameZh: '领导力',
        icon: Trophy,
        examples: [
            'Tell me about a time you led a project',
            'Describe a situation where you had to motivate others'
        ]
    },
    {
        id: 'teamwork',
        name: 'Teamwork',
        nameZh: '团队合作',
        icon: Users,
        examples: [
            'Describe a time you worked with a difficult team member',
            'Tell me about a successful team project'
        ]
    },
    {
        id: 'problem-solving',
        name: 'Problem Solving',
        nameZh: '问题解决',
        icon: Target,
        examples: [
            'Tell me about a challenging problem you solved',
            'Describe a time you had to make a difficult decision'
        ]
    },
    {
        id: 'communication',
        name: 'Communication',
        nameZh: '沟通能力',
        icon: MessageSquare,
        examples: [
            'Describe a time you had to explain something complex',
            'Tell me about a miscommunication and how you resolved it'
        ]
    },
]

export default function STARInterviewQuestionsPage() {
    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* SEO H1 */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    STAR Interview Questions
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    Master behavioral interviews using the STAR method: Situation, Task, Action, Result.
                    <span className="block text-gray-500 mt-2">
                        使用 STAR 方法准备北美公司的行为面试
                    </span>
                </p>

                {/* STAR Method Explainer */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">What is the STAR Method?</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">S</div>
                            <p className="font-medium">Situation</p>
                            <p className="text-sm text-gray-500">情境背景</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">T</div>
                            <p className="font-medium">Task</p>
                            <p className="text-sm text-gray-500">任务目标</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">A</div>
                            <p className="font-medium">Action</p>
                            <p className="text-sm text-gray-500">采取行动</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">R</div>
                            <p className="font-medium">Result</p>
                            <p className="text-sm text-gray-500">结果成果</p>
                        </div>
                    </div>
                </div>

                {/* Categories */}
                <div className="space-y-4 mb-8">
                    {starCategories.map(cat => {
                        const Icon = cat.icon
                        return (
                            <div
                                key={cat.id}
                                className="bg-white rounded-2xl p-6 shadow-sm"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <Icon className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            {cat.name}
                                            <span className="text-sm font-normal text-gray-500 ml-2">{cat.nameZh}</span>
                                        </h2>
                                        <ul className="mt-3 space-y-2">
                                            {cat.examples.map((ex, i) => (
                                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                    <span className="text-purple-500">•</span>
                                                    {ex}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                    <h2 className="text-xl font-bold mb-2">Practice STAR Responses</h2>
                    <p className="text-purple-100 mb-4">
                        Use our flashcards to prepare your STAR stories for common behavioral questions
                    </p>
                    <Link
                        href="/review/qa"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-xl font-medium hover:bg-purple-50 transition-colors"
                    >
                        Start Practice
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
