# 北美面试通（ESLInterviewPrep）

面向华人和 ESL 求职者的面试训练平台，核心是「题库 + 闪卡 + 间隔复习 + 学习状态追踪」。

## 1. 功能概览

- 介绍页（Landing）：`/site-intro`，用于未登录用户展示产品价值与 CTA。
- 登录后默认行动页：`/dashboard`（今日待复习、掌握率、领域覆盖等）。
- 技术题库：`/library`
- 支持搜索、排序、分页、频率筛选、知识点多选筛选。
- 筛选状态写入 URL（刷新不丢、可分享）。
- 筛选浮窗支持“应用 / 取消”，不是即时生效。
- 复习模式：`/review/[mode]`，闪卡翻转 + 掌握度标注 + 键盘快捷键。
- 我的题目：`/lists`（从头像下拉进入）。
- 数据与管理：`/data-management`（从头像下拉进入，支持导入题库与上传题目）。
- 上传面试题支持中英文双语内容：可自动生成英文草稿，并支持手动编辑后保存。
- 行为面试：`/behavior-interview`、`/company-interviews`。
- 中英文切换：UI 与内容语言支持 `zh-CN` / `en-US`，默认中文。

## 2. 技术栈

- 框架：Next.js 16（App Router）
- 语言：TypeScript + React 19
- 样式：Tailwind CSS 4
- 数据库与鉴权：Supabase（PostgreSQL + Auth + RLS）
- 本地缓存：Dexie（IndexedDB）
- 状态管理：Zustand + React Hooks
- 图表：Recharts
- Markdown/代码高亮：react-markdown + rehype-highlight
- 图标：lucide-react
- 部署：Vercel

## 3. 本地启动（新同学必读）

### 3.1 环境要求

- Node.js >= 20
- npm >= 9
- 可访问 Supabase 与 GitHub（同步脚本会访问 GitHub API）

### 3.2 安装依赖

```bash
npm install
```

### 3.3 配置环境变量

```bash
cp .env.example .env.local
```

在 `.env.local` 填入真实值：

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=... # 可选，用于上传时自动生成英文草稿
```

### 3.4 初始化 Supabase

在 Supabase SQL Editor 依次执行：

1. `supabase/schema.sql`
2. `supabase/schema_labour.sql`（行为面试/公司面试数据）
3. 已在线项目再执行：`supabase/security_hardening_20260223.sql`（收紧读取策略）
4. 已在线项目再执行：`supabase/multilingual_cards_20260223.sql`（新增双语字段）

### 3.5 启动项目

```bash
npm run dev
```

打开 `http://localhost:3000`。

## 4. 数据导入流程（重要）

题库数据来源是仓库内私有文件 `data/upstream.json`（不再暴露 `public` 全量题库）。

1. 拉取上游题库并生成 JSON：

```bash
npm run sync
```

2. 登录管理员账号。
3. 进入 `/data-management` 页面，点击“导入题库”。

说明：

- 导入 API：`/api/import-upstream`
- 导入需要管理员权限（`profiles.role = 'admin'`）。
- 系统会做去重后再 upsert。
- 当题库为空时，系统会自动引导到 `/data-management`。

将用户设为管理员（示例 SQL）：

```sql
update public.profiles
set role = 'admin'
where email = 'your-admin-email@example.com';
```

## 5. 关键业务逻辑

- 根路由 `/`：根据会话跳转（已登录 -> `/dashboard`，未登录 -> `/site-intro`）。
- 全局初始化组件：`src/components/DataInitializer.tsx`。
- 初始化器会在非公开路由校验登录态（公开路由：`/login`、`/tech/*`、`/behavioral/*`、`/english/*`）。
- 初始化器负责默认列表初始化、空库自动引导到 `/data-management`。
- 题库默认方向：前端&全栈（`track=frontend-fullstack`）。
- 题库筛选 URL 参数：`q`（搜索词）、`category`（分类）、`freq`（频率多选，CSV）、`points`（知识点多选，CSV）、`point`（单知识点兼容参数）。

## 6. 目录结构（精简）

```text
src/
  app/
    page.tsx                        # 根路由分流
    site-intro/page.tsx             # 介绍页
    dashboard/page.tsx              # 行动页（登录后默认）
    library/page.tsx                # 技术题库
    review/[mode]/page.tsx          # 复习页
    lists/page.tsx                  # 我的题目
    data-management/page.tsx        # 数据与管理
    behavior-interview/*            # 行为面试
    company-interviews/page.tsx     # 名企面经入口
    api/import-upstream/route.ts    # 题库导入 API
  components/
    Sidebar.tsx                     # 顶部导航 + 头像下拉菜单
    DataInitializer.tsx             # 全局初始化/路由守卫
    MyListsSection.tsx              # 我的题目 + 数据管理主体
  lib/
    data-service.ts                 # 核心数据访问层
    library-tracks.ts               # 题库方向配置
    technical-taxonomy.ts           # 知识点归类
scripts/
  sync-upstream.ts                  # 拉取上游题库并生成 JSON
supabase/
  schema.sql                        # 主业务表 + RLS
  schema_labour.sql                 # 行为面试扩展表
```

## 7. 常用命令

```bash
npm run dev      # 本地开发
npm run build    # 生产构建
npm run start    # 启动生产包
npm run lint     # ESLint
npm run sync     # 同步上游题库到本地 JSON
```

## 8. 当前接手注意事项

- `library` 目前有多轨道 UI，但当前内容主要集中在前端&全栈。
- 未配置 Supabase 时，页面会显示配置提示，不会正常读取用户数据。
- 项目目前没有完整自动化测试；改动后建议手动回归：登录/登出、空库引导到 `/data-management`、导入题库、题库筛选（URL 持久化）、复习流程与掌握度更新。

## 9. 参考文档

- 项目概览：`PROJECT_SUMMARY.md`（历史资料，部分信息可能过期，以代码为准）
