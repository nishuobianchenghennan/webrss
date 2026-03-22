# RSS Plus

一个基于 Cloudflare 全栈方案的现代 RSS 阅读器，支持多订阅源管理、AI 智能助手、主题自定义等功能。

## 功能特性

### 核心阅读
- **多订阅源管理**：添加、分类、刷新 RSS/Atom 订阅源
- **自动抓取**：每 15 分钟自动后台抓取新文章，每天凌晨 3 点清理过期数据
- **三栏布局**：侧边栏（分类/订阅源）+ 文章列表 + 文章详情，响应式适配移动端
- **文章过滤**：按已读/未读/收藏状态过滤，按时间维度（今天/本周/本月/今年）筛选
- **时间分组**：文章列表按时间自动分组展示（今天、本周、本月、今年、更早）
- **文章大纲（TOC）**：自动提取正文标题，固定显示在详情区右上角，点击跳转
- **键盘快捷键**：`J`/`K` 上下导航，`S` 收藏，`V` 打开原文，`Shift+A` 全部标为已读

### 订阅管理
- **RSS 自动发现**：输入任意网址自动探测 RSS 链接
- **OPML 导入/导出**：批量迁移订阅源
- **分类管理**：自定义分类图标和颜色
- **标签系统**：为文章打标签

### AI 助手
- **浮动面板**：不离开阅读器即可使用 AI 功能
- **多模型商支持**：兼容 OpenAI API 协议，支持 OpenAI、DeepSeek、本地模型等任意兼容服务
- **模型管理**：手动拉取模型列表，按需添加，支持多模型商快速切换
- **上下文感知**：自动将当前文章或整个列表作为 AI 上下文
- **对话历史**：自动保存最近 50 条对话，支持恢复和删除

### 个性化设置
- **完整调色板**：分别配置浅色/深色模式下所有 CSS 设计令牌，实时预览
- **主题模式**：浅色 / 深色 / 跟随系统
- **视图模式**：列表视图 / 卡片视图
- **快捷键参考**：设置页内置快捷键说明

### 数据与安全
- **JWT 认证**：所有接口均需登录，数据完全私有
- **图片代理**：封面图/Favicon 经 R2 缓存代理，避免混合内容和跨域问题
- **OPML 导入导出**：完整的数据迁移能力

---

## 技术栈

### 前端
| 技术 | 用途 |
|------|------|
| React 19 + TypeScript | UI 框架 |
| Vite 5 | 构建工具 |
| React Router v6 | 路由管理 |
| Zustand + persist | 状态管理与本地持久化 |
| TanStack Query v5 | 服务端数据请求与缓存 |
| Tailwind CSS v3 | 样式 |
| framer-motion | 动画 |
| lucide-react | 图标 |
| date-fns | 时间处理 |

### 后端
| 技术 | 用途 |
|------|------|
| Cloudflare Workers | 无服务器 API 运行时 |
| Hono | 轻量 Web 框架 |
| Cloudflare D1 | SQLite 数据库 |
| Cloudflare R2 | 图片/Favicon 对象存储 |
| Cloudflare KV | 缓存层 |
| Cloudflare Pages | 前端静态托管 |

### 工程化
| 技术 | 用途 |
|------|------|
| pnpm workspaces | Monorepo 包管理 |
| GitHub Actions | CI/CD 自动部署 |
| TypeScript | 全栈类型安全 |

---

## 项目结构

```
rss-plus/
├── frontend/                  # 前端 React 应用
│   └── src/
│       ├── components/
│       │   ├── ai/            # AI 助手组件
│       │   ├── article/       # 文章相关组件（行、卡片、大纲）
│       │   └── layout/        # 布局组件（侧边栏、文章列表、详情）
│       ├── views/
│       │   ├── ReaderPage.tsx # 主阅读器页面（三栏布局）
│       │   ├── SettingsPage.tsx # 设置页外壳
│       │   └── settings/      # 各设置子页面
│       ├── stores/            # Zustand 状态（阅读、偏好、AI）
│       ├── hooks/             # React Query 数据 hooks
│       ├── lib/               # 工具库（API 请求、日期、AI 调用）
│       └── styles/            # 全局样式与 CSS 变量
├── workers/                   # Cloudflare Workers 后端
│   └── src/
│       ├── routes/            # API 路由（feeds、articles、categories、tags、auth）
│       ├── services/          # 业务逻辑（feed 解析、OPML、图片代理、RSS 发现）
│       ├── cron/              # 定时任务（自动抓取、清理）
│       ├── middleware/        # 中间件（JWT 鉴权）
│       ├── utils/             # 工具函数（响应格式、哈希、HTML 处理）
│       └── types/             # 类型定义
├── shared/                    # 前后端共享类型
├── .github/workflows/         # GitHub Actions CI/CD
├── DEPLOY.md                  # 详细部署指南
└── README.md
```

---

## 本地开发

### 前置条件

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
# 根目录
pnpm install

# 或分别安装
cd frontend && npm install
cd workers && npm install
```

### 启动前端开发服务器

```bash
cd frontend
npm run dev
# 访问 http://localhost:5173
```

前端默认连接 `VITE_API_URL` 环境变量指向的后端。本地开发时可在 `frontend/.env.local` 中配置：

```env
VITE_API_URL=http://localhost:8787/api
```

### 启动 Workers 本地开发服务器

```bash
cd workers
npx wrangler dev
# 本地 API 运行在 http://localhost:8787
```

> 本地 Workers 开发需要先在 Cloudflare 创建 D1/KV/R2 资源并配置 `wrangler.toml`，或使用 `--local` 模式运行本地 D1 实例。

### 类型检查与构建

```bash
# 前端类型检查
cd frontend && npm run typecheck

# 前端构建
cd frontend && npm run build

# Workers 类型检查
cd workers && npm run typecheck
```

---

## 部署（Cloudflare 全栈）

> 完整的手把手部署步骤请参阅 [DEPLOY.md](./DEPLOY.md)。以下为流程概览。

### 所需资源

在 Cloudflare 控制台创建以下资源：

| 资源 | 说明 |
|------|------|
| D1 数据库 | 存储用户、订阅源、文章数据 |
| KV 命名空间 | 缓存层 |
| R2 存储桶 | 图片/Favicon 缓存，需开启公开访问 |
| Worker | 后端 API 服务（名称自定义） |
| Pages 项目 | 前端静态托管 |

### GitHub Secrets 配置

在仓库 **Settings → Secrets and variables → Actions** 中添加以下 11 个 Secret：

| Secret | 说明 |
|--------|------|
| `CF_API_TOKEN` | Cloudflare API Token |
| `CF_ACCOUNT_ID` | Cloudflare 账号 ID |
| `CF_WORKER_NAME` | Worker 名称 |
| `CF_D1_DB_NAME` | D1 数据库名称 |
| `CF_D1_DATABASE_ID` | D1 数据库 ID |
| `CF_R2_BUCKET_NAME` | R2 存储桶名称 |
| `CF_KV_NAMESPACE_ID` | KV 命名空间 ID |
| `CF_R2_PUBLIC_URL` | R2 公开访问 URL |
| `CF_FRONTEND_URL` | Pages 前端域名 |
| `CF_VITE_API_URL` | Worker 域名 + `/api` 后缀 |
| `CF_PAGES_PROJECT_NAME` | Pages 项目名称 |

### 自动部署

配置完成后，推送代码到 `main` 分支，GitHub Actions 自动完成：

1. 初始化 D1 数据库表结构
2. 部署 Cloudflare Worker（后端）
3. 构建并部署 Cloudflare Pages（前端）

### 最后一步

Worker 部署完成后，在 Cloudflare 控制台手动设置 JWT 密钥：

**Worker 详情页 → Settings → Variables and Secrets → 添加 `JWT_SECRET`（加密类型）**

---

## API 接口概览

所有接口均以 `/api` 为前缀，除登录/注册外需携带 `Authorization: Bearer <token>` 请求头。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| GET | `/api/feeds` | 获取订阅源列表 |
| POST | `/api/feeds` | 添加订阅源 |
| POST | `/api/feeds/discover` | RSS 自动发现 |
| POST | `/api/feeds/import` | OPML 导入 |
| GET | `/api/feeds/export` | OPML 导出 |
| DELETE | `/api/feeds/:id` | 删除订阅源 |
| POST | `/api/feeds/:id/refresh` | 手动刷新订阅源 |
| GET | `/api/articles` | 获取文章列表（支持过滤/分页） |
| GET | `/api/articles/:id` | 获取文章详情 |
| PUT | `/api/articles/:id/read` | 标记已读 |
| PUT | `/api/articles/:id/star` | 收藏/取消收藏 |
| POST | `/api/articles/batch` | 批量操作（标记已读等） |
| GET | `/api/categories` | 获取分类列表 |
| POST | `/api/categories` | 创建分类 |
| GET | `/api/stats` | 获取统计数据 |
| PUT | `/api/settings` | 保存用户设置 |

---

## 定时任务

| Cron | 任务 |
|------|------|
| `*/15 * * * *` | 自动抓取所有订阅源的新文章 |
| `0 3 * * *` | 清理过期文章和错误记录 |

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `J` | 选择下一篇文章 |
| `K` | 选择上一篇文章 |
| `S` | 收藏/取消收藏当前文章 |
| `V` | 在新标签页打开原文 |
| `Escape` | 关闭文章详情 |
| `Shift+A` | 将当前列表全部标为已读 |

---

## License

MIT
