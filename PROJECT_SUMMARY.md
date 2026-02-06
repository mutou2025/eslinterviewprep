# 北美面试通 (ESLInterviewPrep) - 项目总结

## 项目概述

**网站名称**: 北美面试通 | ESLInterviewPrep  
**域名**: https://eslinterview.com  
**GitHub**: https://github.com/mutou2025/eslinterviewprep  
**部署平台**: Vercel  

一个专为北美求职的中国和 ESL 开发者设计的面试题库网站，采用 Quizlet 风格的速记卡 + 间隔复习系统。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 数据库 | Supabase (PostgreSQL + Auth + RLS) |
| 本地缓存 | IndexedDB (Dexie.js) - 题库摘要缓存 |
| 状态管理 | React Hooks + Zustand |
| Markdown 渲染 | react-markdown + rehype-highlight |
| 图标 | Lucide React |
| 部署 | Vercel |

---

## 核心功能

### 1. 速记卡系统 (Flashcard)
- 3D 翻转动画
- 正面显示题目，背面显示答案
- 代码语法高亮 (highlight.js github-dark 主题)
- 翻转时自动滚动到顶部

### 2. 间隔复习 (Spaced Repetition)
- 4 级掌握度：未学 → 模糊 → 会讲 → 熟练
- 基于掌握度的间隔天数
- 到期提醒

### 3. 题库管理
- 多选题目功能
- 批量学习选中题目
- 点击进入题目详情页
- 分类筛选和搜索
- 分页/按需加载（列表页不拉全文）
- 答案延迟加载（翻面或点击才拉）

### 4. 数据同步
- 从 GitHub 同步上游题库（本地生成 `public/data/upstream.json`）
- 题库导入到 Supabase（管理员权限）
- 题库摘要缓存到 IndexedDB，增量同步（基于 `updated_at`）

### 5. 用户体系与多端同步
- Supabase Auth（邮箱注册/登录）
- 用户学习状态云端存储（掌握度/复习日志/列表/会话）
- 基于 RLS 的数据隔离

---

## 项目结构

```
interview-flashcards/
├── src/
│   ├── app/
│   │   ├── api/import-upstream/route.ts # 题库导入 API（管理员）
│   │   ├── login/page.tsx               # 登录/注册
│   │   ├── dashboard/page.tsx          # 仪表盘
│   │   ├── library/
│   │   │   ├── page.tsx                 # 题库列表
│   │   │   ├── cards/[id]/page.tsx      # 题目详情
│   │   │   └── categories/[id]/page.tsx # 分类详情
│   │   ├── lists/
│   │   │   ├── page.tsx                 # 我的列表
│   │   │   └── [id]/page.tsx            # 列表详情
│   │   ├── review/[mode]/page.tsx       # 复习模式
│   │   ├── settings/page.tsx            # 设置
│   │   ├── tech/                        # SEO 页面
│   │   │   ├── frontend-interview-questions/
│   │   │   ├── java-interview-questions/
│   │   │   └── devops-interview-questions/
│   │   ├── behavioral/
│   │   │   └── star-interview-questions/
│   │   └── english/
│   │       └── job-interview-phrases/
│   ├── components/
│   │   ├── Flashcard.tsx                # 速记卡组件
│   │   ├── Sidebar.tsx                  # 侧边栏
│   │   ├── MasteryBadge.tsx             # 掌握度徽章
│   │   └── DataInitializer.tsx          # 数据初始化
│   ├── lib/
│   │   ├── data-service.ts              # Supabase 数据访问层
│   │   ├── card-cache.ts                # 题库摘要缓存
│   │   ├── supabase-client.ts           # Supabase 客户端
│   │   ├── supabase-server.ts           # Supabase 服务端
│   │   └── scheduler.ts                 # 间隔复习算法
│   └── types/index.ts                   # TypeScript 类型定义
├── scripts/
│   └── sync-upstream.ts                 # 上游数据同步脚本
└── data/
    └── upstream.json                    # 同步的题库数据
└── public/
    └── data/upstream.json               # CDN/静态题库数据
```

---

## SEO 路由结构

| 路由 | 描述 |
|------|------|
| `/tech/frontend-interview-questions` | 前端面试题 |
| `/tech/java-interview-questions` | Java 面试题 |
| `/tech/devops-interview-questions` | DevOps 面试题 |
| `/behavioral/star-interview-questions` | STAR 行为面试 |
| `/english/job-interview-phrases` | ESL 面试短语 |

---

## 数据模型

### Cards (题库，公共)
```typescript
interface Card {
  id: string
  source: 'upstream' | 'user'
  categoryL1Id: string
  categoryL2Id: string
  categoryL3Id: string
  title: string
  question: string
  answer?: string
  questionType: 'concept' | 'coding' | 'output' | 'debug' | 'scenario' | 'design'
  difficulty: 'easy' | 'must-know' | 'hard' | 'hand-write'
  frequency: 'high' | 'mid' | 'low'
}
```

### User State (每用户学习状态)
```typescript
interface CardOverride {
  userId: string
  cardId: string
  mastery: 'new' | 'fuzzy' | 'can-explain' | 'solid'
  reviewCount: number
  intervalDays: number
  dueAt: Date
  lastReviewedAt?: Date
}
```

### Lists / Sessions / Logs / Subscriptions
```typescript
CardList { id, userId, name, cardIds, isDefault }
ReviewSession { id, userId, scope, mode, queueCardIds, cursor, filters }
ReviewLog { id, userId, cardId, reviewedAt, previousMastery, newMastery }
Subscription { userId, status, plan, currentPeriodEnd }
```

---

## 关键命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 同步上游数据
npm run sync
```

---

## 环境变量（本地/部署）

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 已完成功能清单

- [x] Next.js 项目初始化
- [x] Supabase 数据层（PostgreSQL + Auth + RLS）
- [x] 速记卡组件 (3D 翻转动画)
- [x] 间隔复习算法
- [x] 仪表盘页面
- [x] 题库页面 (多选、搜索、筛选、分页)
- [x] 题目详情页
- [x] 分类详情页
- [x] 列表管理页
- [x] 复习模式
- [x] 设置页面
- [x] 从 GitHub 自动同步数据
- [x] 题库导入 API（管理员）
- [x] 答案延迟加载
- [x] 题库摘要缓存（IndexedDB）
- [x] 代码块语法高亮
- [x] 翻转自动滚动
- [x] SEO 优化 (meta、OpenGraph)
- [x] SEO 落地页 (5 个)
- [x] 品牌更新 (北美面试通)
- [x] Vercel 部署
- [x] 自定义域名绑定
- [x] 题库导入去重与诊断信息（避免重复主键导致导入失败）
- [x] 题库为空时允许进入设置页导入
- [x] 新增个人中心页面（账号信息/订阅状态/偏好设置）
- [x] 侧边栏头像菜单（个人中心入口/退出登录）
- [x] 偏好设置存数据库并多端同步（user_settings）
- [x] profiles 扩展头像字段与注册时默认写入 user_settings

---

## 下一步优化建议

1. **复习队列优化**: 服务端分页/队列续拉
2. **全文检索**: Postgres/PGV 索引或外部搜索服务
3. **AI 功能**: 集成 AI 生成答案解析
4. **更多题库**: 添加 LeetCode、系统设计题目
5. **移动端优化**: 响应式布局改进
6. **PWA 支持**: 离线访问
7. **统计分析**: 添加学习统计和图表

---

*最后更新: 2026-02-04*
