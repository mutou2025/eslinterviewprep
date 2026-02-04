import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Phone, Mail, Handshake, MessageCircle, FileText } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Job Interview Phrases for ESL - English Speaking Practice',
    description: 'Essential English phrases and vocabulary for job interviews. Designed for Chinese speakers and ESL job seekers preparing for North America interviews.',
    keywords: ['ESL interview', 'English interview phrases', 'job interview vocabulary', 'Chinese English interview', 'interview English practice'],
}

const phraseSections = [
    {
        id: 'greetings',
        name: 'Greetings & Introduction',
        nameZh: '问候与自我介绍',
        icon: Handshake,
        phrases: [
            { en: "Nice to meet you, I'm [Name].", zh: '很高兴认识您，我是[名字]。' },
            { en: "Thank you for the opportunity to interview.", zh: '感谢您给我面试的机会。' },
            { en: "I'm excited to learn more about this role.", zh: '我很期待了解更多关于这个职位的信息。' },
        ]
    },
    {
        id: 'strengths',
        name: 'Discussing Strengths',
        nameZh: '介绍优势',
        icon: MessageCircle,
        phrases: [
            { en: "One of my key strengths is...", zh: '我的一个主要优势是...' },
            { en: "I'm particularly skilled at...", zh: '我特别擅长...' },
            { en: "I have extensive experience in...", zh: '我在...方面有丰富的经验。' },
        ]
    },
    {
        id: 'questions',
        name: 'Asking Questions',
        nameZh: '提问环节',
        icon: Phone,
        phrases: [
            { en: "Could you tell me more about the team structure?", zh: '您能告诉我更多关于团队结构的信息吗？' },
            { en: "What does a typical day look like in this role?", zh: '这个岗位的日常工作是怎样的？' },
            { en: "What are the growth opportunities?", zh: '有哪些成长机会？' },
        ]
    },
    {
        id: 'closing',
        name: 'Closing & Follow-up',
        nameZh: '结束与跟进',
        icon: Mail,
        phrases: [
            { en: "Thank you for your time today.", zh: '感谢您今天抽出时间。' },
            { en: "I look forward to hearing from you.", zh: '期待收到您的回复。' },
            { en: "Please don't hesitate to reach out if you need anything else.", zh: '如果您需要任何其他信息，请随时联系我。' },
        ]
    },
]

export default function JobInterviewPhrasesPage() {
    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* SEO H1 */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Job Interview Phrases for ESL
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    Master essential English phrases for your North America job interviews.
                    <span className="block text-gray-500 mt-2">
                        为 ESL 求职者准备的面试英语常用短语
                    </span>
                </p>

                {/* Tips Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Tips for ESL Candidates
                    </h2>
                    <ul className="space-y-2 text-blue-800">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <span>Practice speaking slowly and clearly — clarity matters more than speed</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <span>It's okay to ask "Could you repeat that?" if you didn't understand</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <span>Prepare your answers in advance and practice out loud</span>
                        </li>
                    </ul>
                </div>

                {/* Phrase Sections */}
                <div className="space-y-6 mb-8">
                    {phraseSections.map(section => {
                        const Icon = section.icon
                        return (
                            <div key={section.id} className="bg-white rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                        <Icon className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-gray-900">{section.name}</h2>
                                        <p className="text-sm text-gray-500">{section.nameZh}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {section.phrases.map((phrase, i) => (
                                        <div key={i} className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-gray-900 font-medium">{phrase.en}</p>
                                            <p className="text-gray-500 text-sm mt-1">{phrase.zh}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
                    <h2 className="text-xl font-bold mb-2">Practice with Flashcards</h2>
                    <p className="text-green-100 mb-4">
                        Use spaced repetition to memorize these phrases effectively
                    </p>
                    <Link
                        href="/review/qa"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-600 rounded-xl font-medium hover:bg-green-50 transition-colors"
                    >
                        Start Practice
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
