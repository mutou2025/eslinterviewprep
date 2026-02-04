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
| 数据库 | IndexedDB (Dexie.js) - 本地优先 |
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

### 4. 数据同步
- 从 GitHub 自动同步上游题库 (febobo/web-interview, sudheerj/reactjs-interview-questions)
- 首次访问自动初始化数据
- 用户修改保存到本地 Override

---

## 项目结构

```
interview-flashcards/
├── src/
│   ├── app/
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
│   │   ├── db.ts                        # IndexedDB 数据库
│   │   ├── sync-service.ts              # 客户端同步服务
│   │   └── spaced-repetition.ts         # 间隔复习算法
│   └── types/index.ts                   # TypeScript 类型定义
├── scripts/
│   └── sync-upstream.ts                 # 上游数据同步脚本
└── data/
    └── upstream.json                    # 同步的题库数据
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

### Card (题目卡片)
```typescript
interface Card {
  id: string
  source: 'upstream' | 'user'
  categoryL1Id: string  // 技术面试 / 行为面试
  categoryL2Id: string  // Web前端 / 算法
  categoryL3Id: string  // react / javascript
  title: string
  question: string
  answer?: string
  questionType: 'concept' | 'coding' | 'output' | 'debug' | 'scenario' | 'design'
  difficulty: 'easy' | 'must-know' | 'hard' | 'hand-write'
  frequency: 'high' | 'mid' | 'low'
  mastery: 'new' | 'fuzzy' | 'can-explain' | 'solid'
  reviewCount: number
  intervalDays: number
  dueAt: Date
}
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

## 已完成功能清单

- [x] Next.js 项目初始化
- [x] IndexedDB 数据层 (Dexie.js)
- [x] 速记卡组件 (3D 翻转动画)
- [x] 间隔复习算法
- [x] 仪表盘页面
- [x] 题库页面 (多选、搜索、筛选)
- [x] 题目详情页
- [x] 分类详情页
- [x] 列表管理页
- [x] 复习模式
- [x] 设置页面
- [x] 从 GitHub 自动同步数据
- [x] 首次访问自动初始化
- [x] 代码块语法高亮
- [x] 翻转自动滚动
- [x] SEO 优化 (meta、OpenGraph)
- [x] SEO 落地页 (5 个)
- [x] 品牌更新 (北美面试通)
- [x] Vercel 部署
- [x] 自定义域名绑定

---

## 下一步优化建议

1. **用户认证**: 添加 Supabase 或 NextAuth 支持多设备同步
2. **后端存储**: 将数据迁移到 PostgreSQL
3. **AI 功能**: 集成 AI 生成答案解析
4. **更多题库**: 添加 LeetCode、系统设计题目
5. **移动端优化**: 响应式布局改进
6. **PWA 支持**: 离线访问
7. **统计分析**: 添加学习统计和图表

---

*最后更新: 2026-02-04*
