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
                <h1 className="text-3xl font-bold text-[#0F172A] mb-4">
                    Job Interview Phrases for ESL
                </h1>
                <p className="text-lg text-[#475569] mb-8">
                    Master essential English phrases for your North America job interviews.
                    <span className="block text-[#94A3B8] mt-2">
                        为 ESL 求职者准备的面试英语常用短语
                    </span>
                </p>

                {/* Tips Box */}
                <div className="bg-[#EFF6FF] border border-[#93C5FD] rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Tips for ESL Candidates
                    </h2>
                    <ul className="space-y-2 text-blue-800">
                        <li className="flex items-start gap-2">
                            <span className="text-[#2563EB]">•</span>
                            <span>Practice speaking slowly and clearly — clarity matters more than speed</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#2563EB]">•</span>
                            <span>It's okay to ask "Could you repeat that?" if you didn't understand</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-[#2563EB]">•</span>
                            <span>Prepare your answers in advance and practice out loud</span>
                        </li>
                    </ul>
                </div>

                {/* Phrase Sections */}
                <div className="space-y-6 mb-8">
                    {phraseSections.map(section => {
                        const Icon = section.icon
                        return (
                            <div key={section.id} className="bg-white rounded-2xl p-6 shadow-sm border border-[#CBD5E1]">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                        <Icon className="w-5 h-5 text-[#10B981]" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-[#0F172A]">{section.name}</h2>
                                        <p className="text-sm text-[#94A3B8]">{section.nameZh}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {section.phrases.map((phrase, i) => (
                                        <div key={i} className="bg-[#F8FAFC] rounded-xl p-4">
                                            <p className="text-[#0F172A] font-medium">{phrase.en}</p>
                                            <p className="text-[#94A3B8] text-sm mt-1">{phrase.zh}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-[#10B981] to-[#059669] rounded-2xl p-6 text-white">
                    <h2 className="text-xl font-bold mb-2">Practice with Flashcards</h2>
                    <p className="text-[#D1FAE5] mb-4">
                        Use spaced repetition to memorize these phrases effectively
                    </p>
                    <Link
                        href="/review/qa"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#10B981] rounded-xl font-medium hover:bg-green-50 transition-colors"
                    >
                        Start Practice
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
