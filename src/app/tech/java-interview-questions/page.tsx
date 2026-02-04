import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Coffee, Database, Cloud, Cpu } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Java Interview Questions - Spring, JVM, Concurrency, OOP',
    description: 'Comprehensive Java interview questions covering Spring Framework, JVM internals, multithreading, OOP design patterns. For Chinese & ESL developers targeting North America jobs.',
    keywords: ['java interview', 'spring interview questions', 'jvm interview', 'java concurrency', 'backend developer interview', 'ESL tech interview'],
}

const topics = [
    {
        id: 'java-core',
        name: 'Java Core',
        nameZh: 'Java 核心',
        icon: Coffee,
        count: 40,
        description: 'Collections, generics, exception handling, I/O, Java 8+ features'
    },
    {
        id: 'java-spring',
        name: 'Spring Framework',
        nameZh: 'Spring 框架',
        icon: Cloud,
        count: 35,
        description: 'Spring Boot, Spring MVC, dependency injection, AOP'
    },
    {
        id: 'java-jvm',
        name: 'JVM & Performance',
        nameZh: 'JVM 与性能',
        icon: Cpu,
        count: 25,
        description: 'Memory model, garbage collection, JIT compilation, profiling'
    },
    {
        id: 'java-db',
        name: 'Database & ORM',
        nameZh: '数据库与 ORM',
        icon: Database,
        count: 30,
        description: 'JDBC, Hibernate, JPA, SQL optimization, transactions'
    },
]

export default function JavaInterviewQuestionsPage() {
    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* SEO H1 */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Java Interview Questions
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    Prepare for Java backend developer interviews at top North American companies.
                    <span className="block text-gray-500 mt-2">
                        为北美求职准备的 Java 后端面试题库
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
                                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                        <Icon className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            {topic.name}
                                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">{topic.nameZh}</p>
                                        <p className="text-sm text-gray-600 mt-2">{topic.description}</p>
                                        <p className="text-xs text-orange-600 mt-2">{topic.count}+ questions</p>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white">
                    <h2 className="text-xl font-bold mb-2">Start Practicing Now</h2>
                    <p className="text-orange-100 mb-4">
                        Use spaced repetition flashcards to master Java concepts efficiently
                    </p>
                    <Link
                        href="/review/qa"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-medium hover:bg-orange-50 transition-colors"
                    >
                        Start Review
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
