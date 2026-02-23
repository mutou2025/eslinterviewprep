import type { Card, Category } from '@/types'

export type TechnicalKnowledgePoint = {
    id: string
    name: string
    nameEn: string
    keywords: string[]
}

export type TechnicalKnowledgeCategory = {
    id: string
    name: string
    nameEn: string
    points: TechnicalKnowledgePoint[]
}

export type TechnicalUploadOption = {
    categoryId: string
    categoryName: string
    knowledgePoints: Array<{ id: string; name: string }>
}

type BuildTaxonomyOptions = {
    includeFrontendProjectCategory?: boolean
}

type TaxonomyConfig = {
    name?: string
    nameEn?: string
    points: TechnicalKnowledgePoint[]
}

const CATEGORY_ALIASES: Record<string, string> = {
    'design-pattern': 'design',
    http: 'network',
}

const CATEGORY_ORDER = [
    'javascript',
    'typescript',
    'react',
    'vue',
    'css',
    'network',
    'nodejs',
    'es6',
    'webpack',
    'algorithm',
    'git',
    'linux',
    'applet',
    'design',
]

const DEFAULT_POINTS: TechnicalKnowledgePoint[] = [
    {
        id: 'core-concepts',
        name: '核心概念',
        nameEn: 'Core Concepts',
        keywords: ['原理', '机制', '理解', 'concept', 'principle']
    },
    {
        id: 'common-practice',
        name: '常见实践',
        nameEn: 'Common Practice',
        keywords: ['实践', '方案', '实现', 'best practice', 'implementation']
    },
    {
        id: 'performance-and-troubleshooting',
        name: '性能与排查',
        nameEn: 'Performance & Troubleshooting',
        keywords: ['性能', '优化', '监控', '排查', 'performance', 'optimize', 'troubleshoot']
    }
]

const TAXONOMY: Record<string, TaxonomyConfig> = {
    javascript: {
        name: 'JavaScript',
        nameEn: 'JavaScript',
        points: [
            { id: 'js-data-types', name: '数据类型与类型转换', nameEn: 'Types & Coercion', keywords: ['数据类型', '类型', 'typeof', 'instanceof', '转换', '==', '===', 'coercion'] },
            { id: 'js-scope-this-closure', name: '作用域、this与闭包', nameEn: 'Scope, this & Closure', keywords: ['作用域', '闭包', 'this', '执行上下文', '执行栈', 'scope', 'closure'] },
            { id: 'js-object-prototype', name: '对象与原型链', nameEn: 'Objects & Prototype', keywords: ['原型', '继承', 'prototype', '__proto__', 'class', '对象'] },
            { id: 'js-async-event-loop', name: '异步与事件循环', nameEn: 'Async & Event Loop', keywords: ['异步', '事件循环', 'promise', 'microtask', 'macrotask', 'async', 'await'] },
            { id: 'js-dom-bom-events', name: 'DOM/BOM与事件机制', nameEn: 'DOM/BOM & Events', keywords: ['dom', 'bom', '事件', '冒泡', '捕获', '委托', 'event'] },
            { id: 'js-function-patterns', name: '函数式与调用机制', nameEn: 'Function Patterns', keywords: ['call', 'apply', 'bind', '柯里化', '高阶函数', '函数'] },
            { id: 'js-browser-storage', name: '浏览器存储与Web API', nameEn: 'Browser Storage & Web API', keywords: ['localstorage', 'sessionstorage', 'cookie', 'indexeddb', 'webworker', '跨域', 'ajax', 'fetch'] },
            { id: 'js-engineering', name: '性能优化与工程实践', nameEn: 'Performance & Engineering', keywords: ['性能', '优化', '内存', '垃圾回收', '防抖', '节流', '大文件上传'] },
        ]
    },
    typescript: {
        name: 'TypeScript',
        nameEn: 'TypeScript',
        points: [
            { id: 'ts-basic-types', name: '基础类型系统', nameEn: 'Basic Type System', keywords: ['类型', '基本类型', 'any', 'unknown', 'never', 'void'] },
            { id: 'ts-interfaces-classes', name: '接口与类', nameEn: 'Interfaces & Classes', keywords: ['接口', 'interface', '类', 'class', 'implements', 'extends'] },
            { id: 'ts-generics', name: '泛型', nameEn: 'Generics', keywords: ['泛型', 'generic', 'T extends'] },
            { id: 'ts-advanced-types', name: '高级类型', nameEn: 'Advanced Types', keywords: ['联合类型', '交叉类型', '映射类型', '条件类型', 'infer', 'utility'] },
            { id: 'ts-modules-decorators', name: '模块与装饰器', nameEn: 'Modules & Decorators', keywords: ['模块', 'namespace', 'decorator', '装饰器'] },
            { id: 'ts-react-vue', name: 'TS在React/Vue中的应用', nameEn: 'TS with React/Vue', keywords: ['react', 'vue', 'tsx', '组件', '项目'] },
        ]
    },
    react: {
        name: 'React',
        nameEn: 'React',
        points: [
            { id: 'react-core', name: '核心概念与渲染机制', nameEn: 'Core & Rendering', keywords: ['jsx', 'virtual dom', 'render', 'fiber', 'diff', 'react'] },
            { id: 'react-state-lifecycle', name: '状态管理与生命周期', nameEn: 'State & Lifecycle', keywords: ['state', 'props', '生命周期', 'setstate', '组件通信'] },
            { id: 'react-hooks', name: 'Hooks体系', nameEn: 'Hooks', keywords: ['hook', 'useeffect', 'usestate', 'usememo', 'usecallback', '自定义hook'] },
            { id: 'react-routing', name: '路由与导航', nameEn: 'Routing', keywords: ['router', '路由', 'react router', 'history'] },
            { id: 'react-performance', name: '性能优化', nameEn: 'Performance Optimization', keywords: ['性能', '优化', 'memo', '懒加载', '代码分割', '批处理'] },
            { id: 'react-ssr-next', name: 'SSR与同构', nameEn: 'SSR & Isomorphic', keywords: ['ssr', '服务端渲染', 'hydrate', 'next', '同构'] },
            { id: 'react-patterns', name: '复用模式', nameEn: 'Reuse Patterns', keywords: ['hoc', '高阶组件', 'render props', 'context', 'redux'] },
        ]
    },
    vue: {
        name: 'Vue',
        nameEn: 'Vue',
        points: [
            { id: 'vue-core-reactivity', name: '响应式与核心原理', nameEn: 'Reactivity Core', keywords: ['响应式', '双向绑定', 'proxy', 'defineproperty', 'diff'] },
            { id: 'vue-components', name: '组件通信与复用', nameEn: 'Components & Reuse', keywords: ['组件', '通信', 'props', 'emit', 'slot', 'mixins'] },
            { id: 'vue-lifecycle', name: '生命周期与指令', nameEn: 'Lifecycle & Directives', keywords: ['生命周期', 'beforecreate', 'mounted', '指令', 'v-if'] },
            { id: 'vue-router-state', name: '路由与状态管理', nameEn: 'Router & State', keywords: ['vue-router', '路由', 'vuex', 'pinia'] },
            { id: 'vue-composition-api', name: 'Composition API', nameEn: 'Composition API', keywords: ['composition api', 'setup', 'ref', 'reactive', 'watch'] },
            { id: 'vue-engineering', name: '工程化与性能优化', nameEn: 'Engineering & Performance', keywords: ['性能', '优化', '首屏', '打包', '部署', '404', 'axios'] },
        ]
    },
    css: {
        name: 'CSS',
        nameEn: 'CSS',
        points: [
            { id: 'css-box-layout', name: '盒模型与布局', nameEn: 'Box Model & Layout', keywords: ['盒模型', '布局', 'float', 'position', 'bfc', '两栏', '三栏'] },
            { id: 'css-flex-grid', name: 'Flex与Grid', nameEn: 'Flex & Grid', keywords: ['flex', 'grid', '弹性盒'] },
            { id: 'css-selector-cascade', name: '选择器与层叠规则', nameEn: 'Selectors & Cascade', keywords: ['选择器', '优先级', '层叠', '继承'] },
            { id: 'css-responsive', name: '响应式与适配', nameEn: 'Responsive Design', keywords: ['响应式', 'rem', 'em', 'vw', 'vh', 'dpr', '媒体查询'] },
            { id: 'css-animation', name: '动画与视觉效果', nameEn: 'Animation & Visual Effects', keywords: ['动画', 'transition', 'transform', 'animation'] },
            { id: 'css-performance', name: 'CSS性能优化', nameEn: 'CSS Performance', keywords: ['性能', '优化', '重排', '重绘'] },
        ]
    },
    network: {
        name: '计算机网络',
        nameEn: 'Computer Network',
        points: [
            { id: 'network-http', name: 'HTTP协议体系', nameEn: 'HTTP Protocol', keywords: ['http', '状态码', '请求头', 'get', 'post', 'http2', 'http3'] },
            { id: 'network-https-security', name: 'HTTPS与传输安全', nameEn: 'HTTPS & Security', keywords: ['https', 'tls', 'ssl', '证书', '加密'] },
            { id: 'network-tcp-ip', name: 'TCP/IP与传输层', nameEn: 'TCP/IP & Transport', keywords: ['tcp', 'udp', '三次握手', '四次挥手', 'ip'] },
            { id: 'network-dns-cdn', name: 'DNS与CDN', nameEn: 'DNS & CDN', keywords: ['dns', 'cdn', '域名解析'] },
            { id: 'network-websocket', name: 'WebSocket与实时通信', nameEn: 'WebSocket & Realtime', keywords: ['websocket', '长连接', 'sse'] },
            { id: 'network-browser-request', name: '浏览器请求全链路', nameEn: 'Browser Request Lifecycle', keywords: ['url', '地址栏', '回车后', '缓存', '跨域', 'cors', 'osi'] },
        ]
    },
    nodejs: {
        name: 'NodeJS',
        nameEn: 'NodeJS',
        points: [
            { id: 'node-runtime-loop', name: '运行时与事件循环', nameEn: 'Runtime & Event Loop', keywords: ['事件循环', 'event loop', 'libuv', 'nodejs', 'node.js'] },
            { id: 'node-modules', name: '模块系统与加载机制', nameEn: 'Module System', keywords: ['module', 'commonjs', 'esm', 'require', 'import'] },
            { id: 'node-buffer-stream', name: 'Buffer与Stream', nameEn: 'Buffer & Stream', keywords: ['buffer', 'stream', '流'] },
            { id: 'node-fs-process', name: '文件系统与进程', nameEn: 'FS & Process', keywords: ['fs', '文件', 'process', 'child_process'] },
            { id: 'node-framework-middleware', name: '框架与中间件', nameEn: 'Framework & Middleware', keywords: ['express', 'koa', '中间件', 'middleware', 'eventemitter'] },
            { id: 'node-auth-api', name: '鉴权与接口设计', nameEn: 'Auth & API Design', keywords: ['jwt', '鉴权', '分页', 'api', '上传'] },
            { id: 'node-performance', name: '性能监控与优化', nameEn: 'Performance Monitoring', keywords: ['性能', '优化', '监控', 'cluster', 'pm2'] },
        ]
    },
    es6: {
        name: 'ES6+',
        nameEn: 'ES6+',
        points: [
            { id: 'es6-syntax', name: '语法增强', nameEn: 'Syntax Enhancements', keywords: ['let', 'const', '解构', '模板字符串', '扩展运算符'] },
            { id: 'es6-object-array', name: '对象与数组扩展', nameEn: 'Object & Array Extensions', keywords: ['对象', '数组', 'assign', 'entries', 'from'] },
            { id: 'es6-promise-async', name: 'Promise与异步流程', nameEn: 'Promise & Async Flow', keywords: ['promise', 'async', 'await', 'generator'] },
            { id: 'es6-module', name: 'Module体系', nameEn: 'Module System', keywords: ['module', 'import', 'export', '模块'] },
            { id: 'es6-proxy-reflect', name: 'Proxy/Reflect', nameEn: 'Proxy/Reflect', keywords: ['proxy', 'reflect'] },
            { id: 'es6-collections', name: 'Set/Map与新数据结构', nameEn: 'Collections', keywords: ['set', 'map', 'weakmap', 'weakset'] },
        ]
    },
    webpack: {
        name: 'Webpack',
        nameEn: 'Webpack',
        points: [
            { id: 'webpack-core', name: '构建流程与核心概念', nameEn: 'Build Pipeline & Core', keywords: ['构建流程', 'entry', 'output', 'chunk', 'module'] },
            { id: 'webpack-loader-plugin', name: 'Loader与Plugin', nameEn: 'Loader & Plugin', keywords: ['loader', 'plugin'] },
            { id: 'webpack-dev-hmr', name: '开发体验与热更新', nameEn: 'Dev Experience & HMR', keywords: ['hmr', '热更新', 'devserver'] },
            { id: 'webpack-performance', name: '构建与运行性能优化', nameEn: 'Performance Optimization', keywords: ['优化', 'tree shaking', '缓存', '构建速度', '性能'] },
            { id: 'webpack-proxy-env', name: '代理与环境配置', nameEn: 'Proxy & Environment', keywords: ['proxy', '跨域', 'env', '环境变量'] },
        ]
    },
    algorithm: {
        name: '算法与数据结构',
        nameEn: 'Algorithm & Data Structure',
        points: [
            { id: 'algo-array-string', name: '数组与字符串', nameEn: 'Array & String', keywords: ['数组', '字符串', '双指针', '滑动窗口'] },
            { id: 'algo-linkedlist-stack-queue', name: '链表/栈/队列', nameEn: 'LinkedList/Stack/Queue', keywords: ['链表', '栈', '队列'] },
            { id: 'algo-tree-graph', name: '树与图', nameEn: 'Tree & Graph', keywords: ['树', '二叉树', '图', '遍历'] },
            { id: 'algo-sort-search', name: '排序与查找', nameEn: 'Sort & Search', keywords: ['排序', '快排', '归并', '冒泡', '二分'] },
            { id: 'algo-dp-greedy-backtracking', name: '动态规划/贪心/回溯', nameEn: 'DP/Greedy/Backtracking', keywords: ['动态规划', '贪心', '回溯', '分治'] },
            { id: 'algo-complexity', name: '复杂度分析', nameEn: 'Complexity Analysis', keywords: ['复杂度', '时间复杂度', '空间复杂度'] },
        ]
    },
    git: {
        name: 'Git',
        nameEn: 'Git',
        points: [
            { id: 'git-basics', name: '基础概念与工作流', nameEn: 'Basics & Workflow', keywords: ['git', '版本管理', 'head', '工作树', '索引'] },
            { id: 'git-branch-merge-rebase', name: '分支与合并策略', nameEn: 'Branch/Merge/Rebase', keywords: ['branch', 'merge', 'rebase', 'fork', 'clone'] },
            { id: 'git-reset-revert-stash', name: '回滚与现场管理', nameEn: 'Reset/Revert/Stash', keywords: ['reset', 'revert', 'stash', 'cherry-pick'] },
            { id: 'git-conflict-collaboration', name: '冲突处理与协作', nameEn: 'Conflict & Collaboration', keywords: ['冲突', 'conflict', 'pull', 'fetch', '协作'] },
        ]
    },
    linux: {
        name: 'Linux',
        nameEn: 'Linux',
        points: [
            { id: 'linux-file-permission', name: '文件系统与权限', nameEn: 'File System & Permissions', keywords: ['文件', '权限', 'chmod', 'chown', 'ls', 'cp', 'mv'] },
            { id: 'linux-process-thread', name: '进程与线程', nameEn: 'Process & Thread', keywords: ['进程', '线程', 'ps', 'top', 'kill'] },
            { id: 'linux-shell-pipeline', name: 'Shell与管道重定向', nameEn: 'Shell, Pipe & Redirect', keywords: ['shell', '管道', '重定向', 'grep', 'awk'] },
            { id: 'linux-network-service', name: '网络与服务管理', nameEn: 'Network & Service', keywords: ['网络', '端口', 'netstat', 'systemctl'] },
            { id: 'linux-performance', name: '系统监控与性能', nameEn: 'Monitoring & Performance', keywords: ['监控', '性能', '内存', 'io'] },
        ]
    },
    applet: {
        name: '小程序',
        nameEn: 'Mini Program',
        points: [
            { id: 'applet-core', name: '框架机制与生命周期', nameEn: 'Framework & Lifecycle', keywords: ['小程序', '生命周期', 'app', 'page'] },
            { id: 'applet-routing', name: '路由与页面通信', nameEn: 'Routing & Communication', keywords: ['路由', '跳转', '页面通信'] },
            { id: 'applet-auth-payment', name: '登录与支付', nameEn: 'Auth & Payment', keywords: ['登录', '鉴权', '支付'] },
            { id: 'applet-performance', name: '性能优化', nameEn: 'Performance Optimization', keywords: ['性能', '优化', '速度', '分包'] },
            { id: 'applet-webview', name: 'WebView与原生能力', nameEn: 'WebView & Native Capabilities', keywords: ['webview', 'jscore', '原生能力'] },
        ]
    },
    design: {
        name: '设计模式',
        nameEn: 'Design Patterns',
        points: [
            { id: 'design-principles', name: '设计原则', nameEn: 'Design Principles', keywords: ['设计模式', '原则', 'solid'] },
            { id: 'design-creational', name: '创建型模式', nameEn: 'Creational Patterns', keywords: ['工厂', '单例', '建造者', '原型'] },
            { id: 'design-structural', name: '结构型模式', nameEn: 'Structural Patterns', keywords: ['代理', '适配器', '装饰器', '外观'] },
            { id: 'design-behavioral', name: '行为型模式', nameEn: 'Behavioral Patterns', keywords: ['策略', '观察者', '发布订阅', '责任链', '命令'] },
            { id: 'design-usage', name: '工程落地与场景选择', nameEn: 'Practical Application', keywords: ['场景', '应用', '如何选择'] },
        ]
    },
}

const FRONTEND_PROJECT_CATEGORY: TechnicalKnowledgeCategory = {
    id: 'practical-projects',
    name: '实战项目',
    nameEn: 'Practical Projects',
    points: [
        {
            id: 'project-user-management',
            name: '用户管理',
            nameEn: 'User Management',
            keywords: ['用户管理', '用户', 'user management', 'user']
        },
        {
            id: 'project-auth-login',
            name: '登录管理',
            nameEn: 'Auth & Login Management',
            keywords: ['登录管理', '登录', '鉴权', 'token', 'jwt', 'auth', 'login']
        },
        {
            id: 'project-permission-rbac',
            name: '权限与角色(RBAC)',
            nameEn: 'Permissions & RBAC',
            keywords: ['权限', '角色', 'rbac', 'permission', 'role']
        },
        {
            id: 'project-api-integration',
            name: '接口联调与错误处理',
            nameEn: 'API Integration & Error Handling',
            keywords: ['接口', '联调', '错误处理', 'api', 'error']
        },
        {
            id: 'project-performance-monitoring',
            name: '性能与监控',
            nameEn: 'Performance & Monitoring',
            keywords: ['性能', '监控', 'performance', 'monitoring']
        },
    ]
}

function normalizeCategoryId(categoryId: string): string {
    return CATEGORY_ALIASES[categoryId] || categoryId
}

function getCategorySortWeight(categoryId: string): number {
    const normalized = normalizeCategoryId(categoryId)
    const idx = CATEGORY_ORDER.indexOf(normalized)
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
}

function getCategoryTaxonomy(categoryId: string): TaxonomyConfig {
    const normalized = normalizeCategoryId(categoryId)
    return TAXONOMY[normalized] || { points: DEFAULT_POINTS }
}

function scoreKnowledgePoint(text: string, point: TechnicalKnowledgePoint): number {
    let score = 0
    for (const keyword of point.keywords) {
        const term = keyword.trim().toLowerCase()
        if (!term) continue
        if (text.includes(term)) {
            score += term.length >= 5 ? 3 : 2
        }
    }
    return score
}

export function buildTechnicalKnowledgeCategories(
    categories: Category[],
    options?: BuildTaxonomyOptions
): TechnicalKnowledgeCategory[] {
    const base = categories
        .slice()
        .sort((a, b) => {
            const aw = getCategorySortWeight(a.id)
            const bw = getCategorySortWeight(b.id)
            if (aw !== bw) return aw - bw
            return a.id.localeCompare(b.id)
        })
        .map(category => {
            const config = getCategoryTaxonomy(category.id)
            return {
                id: category.id,
                name: config.name || category.name,
                nameEn: config.nameEn || category.nameEn || category.name,
                points: config.points
            }
        })

    if (options?.includeFrontendProjectCategory) {
        base.push(FRONTEND_PROJECT_CATEGORY)
    }

    return base
}

export function classifyCardToKnowledgePoint(
    card: Pick<Card, 'title' | 'question' | 'customTags'>,
    points: TechnicalKnowledgePoint[]
): string {
    if (points.length === 0) return 'general'

    const text = `${card.title} ${card.question} ${(card.customTags || []).join(' ')}`.toLowerCase()

    let bestPointId = points[0].id
    let bestScore = -1

    for (const point of points) {
        const score = scoreKnowledgePoint(text, point)
        if (score > bestScore) {
            bestScore = score
            bestPointId = point.id
        }
    }

    return bestPointId
}

export function getTechnicalUploadOptions(categories: Category[], language: 'zh-CN' | 'en-US'): TechnicalUploadOption[] {
    const knowledgeCategories = buildTechnicalKnowledgeCategories(categories)

    return knowledgeCategories.map(category => ({
        categoryId: category.id,
        categoryName: language === 'en-US' ? category.nameEn : category.name,
        knowledgePoints: category.points.map(point => ({
            id: point.id,
            name: language === 'en-US' ? point.nameEn : point.name
        }))
    }))
}
