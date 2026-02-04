import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Container, GitBranch, Server, Shield } from 'lucide-react'

export const metadata: Metadata = {
    title: 'DevOps Interview Questions - Docker, Kubernetes, CI/CD, AWS',
    description: 'DevOps and SRE interview questions covering Docker, Kubernetes, CI/CD pipelines, AWS, Linux. For Chinese & ESL engineers targeting North America tech jobs.',
    keywords: ['devops interview', 'kubernetes interview questions', 'docker interview', 'CI/CD interview', 'SRE interview', 'cloud engineer interview'],
}

const topics = [
    {
        id: 'docker',
        name: 'Docker & Containers',
        nameZh: 'Docker 与容器',
        icon: Container,
        count: 25,
        description: 'Containerization, Dockerfile, networking, volumes, best practices'
    },
    {
        id: 'kubernetes',
        name: 'Kubernetes',
        nameZh: 'Kubernetes',
        icon: Server,
        count: 30,
        description: 'Pods, services, deployments, ingress, helm, operators'
    },
    {
        id: 'cicd',
        name: 'CI/CD Pipelines',
        nameZh: 'CI/CD 流水线',
        icon: GitBranch,
        count: 20,
        description: 'Jenkins, GitHub Actions, GitLab CI, ArgoCD, deployment strategies'
    },
    {
        id: 'security',
        name: 'Security & Networking',
        nameZh: '安全与网络',
        icon: Shield,
        count: 20,
        description: 'IAM, networking, firewalls, secrets management, compliance'
    },
]

export default function DevOpsInterviewQuestionsPage() {
    return (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                {/* SEO H1 */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    DevOps Interview Questions
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    Ace your DevOps, SRE, and Cloud Engineer interviews at top tech companies.
                    <span className="block text-gray-500 mt-2">
                        为北美求职准备的 DevOps / 运维面试题库
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
                                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                                        <Icon className="w-6 h-6 text-teal-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            {topic.name}
                                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">{topic.nameZh}</p>
                                        <p className="text-sm text-gray-600 mt-2">{topic.description}</p>
                                        <p className="text-xs text-teal-600 mt-2">{topic.count}+ questions</p>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-6 text-white">
                    <h2 className="text-xl font-bold mb-2">Start Practicing Now</h2>
                    <p className="text-teal-100 mb-4">
                        Master DevOps concepts with flashcards and spaced repetition
                    </p>
                    <Link
                        href="/review/qa"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-600 rounded-xl font-medium hover:bg-teal-50 transition-colors"
                    >
                        Start Review
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
