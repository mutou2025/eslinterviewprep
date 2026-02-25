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
                <h1 className="text-3xl font-bold text-[#0F172A] mb-4">
                    STAR Interview Questions
                </h1>
                <p className="text-lg text-[#475569] mb-8">
                    Master behavioral interviews using the STAR method: Situation, Task, Action, Result.
                    <span className="block text-[#94A3B8] mt-2">
                        使用 STAR 方法准备北美公司的行为面试
                    </span>
                </p>

                {/* STAR Method Explainer */}
                <div className="bg-gradient-to-r from-slate-50 to-emerald-50 rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-[#0F172A] mb-4">What is the STAR Method?</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-[#2563EB] text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">S</div>
                            <p className="font-medium">Situation</p>
                            <p className="text-sm text-[#94A3B8]">情境背景</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">T</div>
                            <p className="font-medium">Task</p>
                            <p className="text-sm text-[#94A3B8]">任务目标</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-[#2563EB] text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">A</div>
                            <p className="font-medium">Action</p>
                            <p className="text-sm text-[#94A3B8]">采取行动</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-[#10B981] text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">R</div>
                            <p className="font-medium">Result</p>
                            <p className="text-sm text-[#94A3B8]">结果成果</p>
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
                                className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1]"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-[#DBEAFE] rounded-xl flex items-center justify-center">
                                        <Icon className="w-6 h-6 text-[#1D4ED8]" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-[#0F172A]">
                                            {cat.name}
                                            <span className="text-sm font-normal text-[#94A3B8] ml-2">{cat.nameZh}</span>
                                        </h2>
                                        <ul className="mt-3 space-y-2">
                                            {cat.examples.map((ex, i) => (
                                                <li key={i} className="text-sm text-[#475569] flex items-start gap-2">
                                                    <span className="text-[#2563EB]">•</span>
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
                <div className="bg-gradient-to-r from-[#0B1F3B] to-[#2563EB] rounded-2xl p-6 text-white">
                    <h2 className="text-xl font-bold mb-2">Practice STAR Responses</h2>
                    <p className="text-[#DBEAFE] mb-4">
                        Use our flashcards to prepare your STAR stories for common behavioral questions
                    </p>
                    <Link
                        href="/review/qa"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1D4ED8] rounded-xl font-medium hover:bg-slate-50 transition-colors"
                    >
                        Start Practice
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
