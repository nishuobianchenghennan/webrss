# RSS Plus 手动部署指南

> 全程使用浏览器界面操作，无需命令行。分为两个平台：**GitHub**（代码托管）+ **Cloudflare**（后端 + 前端托管）

---

## 总体流程概览

```
第一步  →  上传代码到 GitHub
第二步  →  Cloudflare 创建 D1 数据库 + 初始化表结构
第三步  →  Cloudflare 创建 KV 命名空间
第四步  →  Cloudflare 创建 R2 存储桶 + 开启公开访问
第五步  →  Cloudflare Pages 连接 GitHub 部署前端
第六步  →  在 GitHub 仓库配置所有 Secrets（核心步骤）
第七步  →  推送代码触发自动部署
第八步  →  在 Cloudflare 控制台配置 JWT_SECRET
第九步  →  验证功能是否正常
```

---

## GitHub Secrets 完整清单

所有敏感配置都存放在 GitHub 仓库的 Secrets 中，CI/CD 时自动注入，**不会出现在任何代码文件里**。

| Secret 名称 | 说明 | 从哪里获取 |
|---|---|---|
| `CF_API_TOKEN` | Cloudflare API Token（用于 wrangler 部署） | Cloudflare → Profile → API Tokens |
| `CF_ACCOUNT_ID` | Cloudflare 账号 ID | Cloudflare 控制台右侧边栏 |
| `CF_D1_DATABASE_ID` | D1 数据库 ID | 第二步创建数据库后获取 |
| `CF_KV_NAMESPACE_ID` | KV 命名空间 ID | 第三步创建 KV 后获取 |
| `CF_R2_PUBLIC_URL` | R2 公开访问 URL（如 `https://pub-xxx.r2.dev`）| 第四步开启 R2 公开访问后获取 |
| `CF_FRONTEND_URL` | Pages 前端域名（如 `https://rss-plus.pages.dev`）| 第五步部署 Pages 后获取 |
| `CF_VITE_API_URL` | 前端调用的 API 地址（如 `https://rss-plus-api.xxx.workers.dev/api`）| 第六步部署 Workers 后获取 |

---

## 第一步：上传代码到 GitHub

### 1.1 创建 GitHub 仓库

1. 打开 [github.com](https://github.com)，登录账号
2. 点击右上角 **+** → **New repository**
3. 填写仓库信息：
   - **Repository name**：`rss-plus`
   - **Visibility**：选 `Private`（私有，保护你的代码）
   - **不要**勾选 Initialize this repository
4. 点击 **Create repository**

### 1.2 上传项目文件

GitHub 网页上传有单次 100 个文件的限制，推荐使用 **GitHub Desktop** 客户端上传（无需命令行）：

1. 下载安装 [GitHub Desktop](https://desktop.github.com/)
2. 打开 GitHub Desktop → **File** → **Add Local Repository**
3. 选择 `d:\Desktop\Code\rss_plus` 文件夹
4. 点击 **Create a repository here**（如提示）
5. 左侧会列出所有变更文件，在 **Summary** 框填写 `init`
6. 点击 **Commit to main**
7. 点击右上角 **Publish repository**
8. 在弹出窗口：
   - **Name**：`rss-plus`
   - 勾选 **Keep this code private**
   - 点击 **Publish Repository**

上传完成后，在 GitHub 网页刷新即可看到所有文件。

---

## 第二步：创建 D1 数据库并初始化表结构

### 2.1 创建数据库

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com)，登录账号
2. 左侧菜单 → **Workers & Pages** → **D1 SQL Database**
3. 点击右上角 **Create database**
4. 填写：
   - **Database name**：`rss-reader-db`
5. 点击 **Create**
6. 创建成功后，**复制并保存 Database ID**（格式类似 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`），后面要用

### 2.2 初始化数据库表结构

1. 进入刚创建的 `rss-reader-db` 数据库页面
2. 点击顶部 **Console** 标签页
3. 将以下 SQL 完整复制粘贴到输入框中：

```sql
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    email           TEXT,
    avatar_url      TEXT,
    settings        TEXT DEFAULT '{}',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    parent_id       TEXT,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    icon            TEXT,
    color           TEXT,
    sort_order      INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    name            TEXT NOT NULL,
    color           TEXT DEFAULT '#6B7280',
    UNIQUE(user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feeds (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    category_id     TEXT,
    title           TEXT NOT NULL,
    description     TEXT,
    site_url        TEXT,
    feed_url        TEXT NOT NULL,
    favicon_url     TEXT,
    language        TEXT,
    feed_type       TEXT DEFAULT 'rss',
    status          TEXT DEFAULT 'active',
    error_message   TEXT,
    error_count     INTEGER DEFAULT 0,
    fetch_interval  INTEGER DEFAULT 30,
    last_fetched_at DATETIME,
    last_published_at DATETIME,
    article_count   INTEGER DEFAULT 0,
    unread_count    INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS articles (
    id              TEXT PRIMARY KEY,
    feed_id         TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    guid            TEXT NOT NULL,
    title           TEXT NOT NULL,
    author          TEXT,
    summary         TEXT,
    content         TEXT,
    url             TEXT,
    cover_image_url TEXT,
    word_count      INTEGER DEFAULT 0,
    reading_time    INTEGER DEFAULT 0,
    is_read         INTEGER DEFAULT 0,
    is_starred      INTEGER DEFAULT 0,
    is_pinned       INTEGER DEFAULT 0,
    read_progress   REAL DEFAULT 0,
    read_at         DATETIME,
    starred_at      DATETIME,
    published_at    DATETIME,
    fetched_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(feed_id, guid),
    FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS article_tags (
    article_id      TEXT NOT NULL,
    tag_id          TEXT NOT NULL,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS read_history (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    article_id      TEXT NOT NULL,
    action          TEXT NOT NULL,
    duration        INTEGER,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_user_read ON articles(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_articles_user_starred ON articles(user_id, is_starred);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_guid ON articles(feed_id, guid);
CREATE INDEX IF NOT EXISTS idx_feeds_user ON feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_feeds_status ON feeds(status);
CREATE INDEX IF NOT EXISTS idx_feeds_next_fetch ON feeds(status, last_fetched_at);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_read_history_user ON read_history(user_id, created_at DESC);
```

4. 点击 **Execute** 按钮
5. 看到 `Query executed successfully` 即为成功
6. 切换到 **Tables** 标签页，确认能看到 7 张表（users、feeds、articles 等）

---

## 第三步：创建 KV 命名空间

1. 左侧菜单 → **Workers & Pages** → **KV**
2. 点击 **Create a namespace**
3. 填写：
   - **Namespace name**：`RSS_PLUS_KV`
4. 点击 **Add**
5. 创建成功后，**复制并保存 Namespace ID**（32 位十六进制字符串），后面要用

---

## 第四步：创建 R2 存储桶并开启公开访问

### 4.1 创建存储桶

1. 左侧菜单 → **R2 Object Storage**
2. 点击 **Create bucket**
3. 填写：
   - **Bucket name**：`rss-plus-assets`
   - **Location**：选择离你最近的区域（如亚太选 APAC）
4. 点击 **Create bucket**

### 4.2 开启公开访问并获取域名

1. 进入 `rss-plus-assets` 存储桶页面
2. 点击顶部 **Settings** 标签页
3. 找到 **Public access** 部分
4. 点击 **Allow Access**，在弹出确认框中点击 **Allow**
5. 开启后会显示一个公开访问 URL，格式为：
   ```
   https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
   ```
6. **复制并保存这个 URL**，后面配置 `R2_PUBLIC_URL` 要用

---

## 第五步：修改项目配置文件

现在把上面获取的 ID 填入配置文件。在 GitHub 网页上直接编辑文件：

### 5.1 修改 wrangler.toml

1. 打开你的 GitHub 仓库页面
2. 导航到 `workers/wrangler.toml` 文件
3. 点击右上角铅笔图标（Edit this file）
4. 将文件内容**完整替换**为以下内容（替换其中的占位符）：

```toml
name = "rss-plus-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "rss-reader-db"
database_id = "这里填入第二步获取的 Database ID"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "rss-plus-assets"

[[kv_namespaces]]
binding = "KV"
id = "这里填入第三步获取的 KV Namespace ID"

[vars]
R2_PUBLIC_URL = "这里填入第四步获取的 R2 公开 URL，如 https://pub-xxx.r2.dev"
FRONTEND_URL = "这里暂时填 https://rss-plus.pages.dev，第七步部署完 Pages 后再更新"

[triggers]
crons = ["*/15 * * * *", "0 3 * * *"]
```

5. 点击 **Commit changes** → **Commit changes**（直接提交到 main）

### 5.2 创建前端环境变量文件

1. 在 GitHub 仓库页面，导航到 `frontend/` 目录
2. 点击 **Add file** → **Create new file**
3. 文件名填：`.env.production`
4. 内容填（Worker 域名在第六步部署后获取，先填占位符）：
   ```
   VITE_API_URL=https://rss-plus-api.你的子域名.workers.dev/api
   ```
5. 点击 **Commit new file**

> **注意**：Worker 的实际域名要在第六步部署后才能确认，你可以第六步完成后回来更新这个文件。

---

## 第六步：部署 Workers 后端

Cloudflare Workers 可以直接连接 GitHub 仓库，自动构建并部署。

### 6.1 创建 Worker 并连接 GitHub

1. Cloudflare 控制台 → **Workers & Pages** → **Create**
2. 选择 **Pages**（是的，选 Pages，它支持 Git 集成；Workers 单独部署见 6.2）

> **实际上 Workers 部署需要 Wrangler**，但我们可以通过 **GitHub Actions + Cloudflare API Token** 实现全自动，也可以用以下替代方案：

### 6.2 使用 Cloudflare Workers 网页编辑器（简单方案）

由于 Workers 是 TypeScript 需要编译，**推荐通过 GitHub Actions 自动部署**：

1. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Create Worker**
2. Worker 名称填：`rss-plus-api`
3. 点击 **Deploy**（先部署一个占位 Worker）
4. 然后配置 GitHub Actions 来自动部署真实代码（见第十步）

### 6.3 获取 Worker 域名

部署后，在 Worker 详情页能看到域名：
```
https://rss-plus-api.<你的子域名>.workers.dev
```

**复制保存这个域名**，更新到第五步创建的 `.env.production` 文件中。

---

## 第七步：部署前端到 Cloudflare Pages

Pages 支持直接连接 GitHub，这是最简单的方式。

### 7.1 创建 Pages 项目

1. Cloudflare 控制台 → **Workers & Pages** → **Create**
2. 选择 **Pages** → **Connect to Git**
3. 点击 **Connect GitHub**，授权 Cloudflare 访问你的 GitHub 账号
4. 在仓库列表中找到 `rss-plus`，点击 **Begin setup**

### 7.2 配置构建设置

在构建配置页面填写：

| 配置项 | 填写内容 |
|---|---|
| **Project name** | `rss-plus` |
| **Production branch** | `main` |
| **Framework preset** | `None` |
| **Build command** | `cd frontend && npm install && npm run build` |
| **Build output directory** | `frontend/dist` |
| **Root directory** | `/`（保持空或填 `/`）|

### 7.3 添加环境变量

在同一页面下方找到 **Environment variables** 部分，点击 **Add variable**：

| Variable name | Value |
|---|---|
| `VITE_API_URL` | `https://rss-plus-api.你的子域名.workers.dev/api` |
| `NODE_VERSION` | `20` |

### 7.4 开始部署

点击 **Save and Deploy**，等待构建完成（约 2-3 分钟）。

构建日志中可以看到实时输出，出现 `✓ Build completed` 即为成功。

部署完成后获得 Pages 域名，格式为：
```
https://rss-plus.pages.dev
```
或
```
https://rss-plus-xxxx.pages.dev
```

**复制保存这个域名**。

---

## 第八步：配置环境变量与密钥

### 8.1 更新 wrangler.toml 中的 FRONTEND_URL

1. 回到 GitHub 仓库，编辑 `workers/wrangler.toml`
2. 将 `FRONTEND_URL` 更新为第七步获得的实际 Pages 域名：
   ```toml
   FRONTEND_URL = "https://rss-plus.pages.dev"
   ```
3. 提交更改

### 8.2 配置 Worker 绑定（D1 / KV / R2）

通过 GitHub Actions 部署后，Wrangler 会自动读取 `wrangler.toml` 中的绑定配置。

如果你是使用网页编辑器的占位 Worker，需要手动在控制台绑定：

1. Cloudflare 控制台 → **Workers & Pages** → `rss-plus-api` → **Settings** → **Bindings**
2. 点击 **Add** 逐个添加：

**D1 数据库绑定：**
- Type: `D1 Database`
- Variable name: `DB`
- D1 database: 选择 `rss-reader-db`

**KV 绑定：**
- Type: `KV Namespace`
- Variable name: `KV`
- KV namespace: 选择 `RSS_PLUS_KV`

**R2 绑定：**
- Type: `R2 Bucket`
- Variable name: `R2_BUCKET`
- R2 bucket: 选择 `rss-plus-assets`

### 8.3 配置 JWT 密钥

这是最重要的安全配置，**必须设置**。

1. Cloudflare 控制台 → **Workers & Pages** → `rss-plus-api` → **Settings** → **Variables and Secrets**
2. 找到 **Secrets** 部分，点击 **Add** 或 **Edit variables**
3. 添加：
   - **Variable name**：`JWT_SECRET`
   - **Value**：一个随机的长字符串（至少 32 个字符）

   **生成随机密钥的方法**（在浏览器控制台执行，按 F12 打开）：
   ```javascript
   // 在浏览器任意页面按 F12，在 Console 标签执行：
   Array.from(crypto.getRandomValues(new Uint8Array(48)), b => b.toString(16).padStart(2,'0')).join('')
   ```
   复制输出的 96 位十六进制字符串作为密钥。

4. 点击 **Encrypt** 确保加密存储，然后 **Save**

### 8.4 配置 Worker 环境变量

在同一页面 **Environment Variables** 部分添加：

| Variable name | Value |
|---|---|
| `R2_PUBLIC_URL` | `https://pub-xxx.r2.dev`（第四步获取）|
| `FRONTEND_URL` | `https://rss-plus.pages.dev`（第七步获取）|

点击 **Save and deploy** 使配置生效。

---

## 第九步：配置 GitHub Actions 自动部署 Workers

Pages 已经连接 GitHub 会自动部署，但 Workers 需要通过 GitHub Actions 触发。

### 9.1 获取 Cloudflare API Token

1. 打开 [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 **Create Token**
3. 选择 **Edit Cloudflare Workers** 模板
4. 配置权限：
   - **Account** → `Workers Scripts:Edit`
   - **Account** → `D1:Edit`
   - **Account** → `Workers KV Storage:Edit`
   - **Zone Resources**：All zones（或选指定域名）
5. 点击 **Continue to summary** → **Create Token**
6. **立即复制并保存 Token**（只显示一次！）

### 9.2 获取 Account ID

在 Cloudflare 控制台右侧边栏（任意页面）可以看到 **Account ID**，复制保存。

### 9.3 配置 GitHub Secrets

1. 打开 GitHub 仓库页面
2. 点击 **Settings** → 左侧 **Secrets and variables** → **Actions**
3. 点击 **New repository secret**，依次添加：

| Secret 名称 | 值 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 第 9.1 步获取的 Token |
| `CLOUDFLARE_ACCOUNT_ID` | 第 9.2 步获取的 Account ID |

### 9.4 检查 GitHub Actions 工作流文件

确认仓库中存在 `.github/workflows/deploy.yml` 文件。在 GitHub 仓库页面点击 **Actions** 标签页，查看是否有工作流。

如果没有，在仓库中创建 `.github/workflows/deploy.yml`，内容如下：

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy-workers:
    runs-on: ubuntu-latest
    name: Deploy Workers
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - name: Deploy Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: workers
          command: deploy

  deploy-pages:
    runs-on: ubuntu-latest
    name: Deploy Pages
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install
      - run: cd frontend && pnpm build
        env:
          VITE_API_URL: https://rss-plus-api.${{ secrets.CLOUDFLARE_ACCOUNT_ID }}.workers.dev/api
      - name: Deploy to Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy frontend/dist --project-name=rss-plus
```

提交该文件后，推送到 main 分支即会自动触发部署。

---

## 第十步：验证部署是否成功

### 10.1 检查 Workers 部署状态

1. Cloudflare 控制台 → **Workers & Pages** → `rss-plus-api`
2. 点击 **Deployments** 标签页，确认最新部署状态为 ✅ **Success**

### 10.2 检查 Pages 部署状态

1. Cloudflare 控制台 → **Workers & Pages** → `rss-plus`
2. 点击 **Deployments** 标签页，确认最新部署状态为 ✅ **Success**

### 10.3 测试 API 接口

打开浏览器，访问以下地址（替换为你的 Worker 域名），应返回 JSON 数据而非错误：

```
https://rss-plus-api.<子域名>.workers.dev/api/auth/register
```

如果收到如下响应（405 Method Not Allowed 是正常的，说明接口存在）：
```json
{"code":405,"message":"..."}
```
说明 Worker 已正常运行。

### 10.4 测试前端页面

1. 访问你的 Pages 域名：`https://rss-plus.pages.dev`
2. 应该看到登录页面
3. 点击「注册」，创建一个账号
4. 登录成功后进入主界面
5. 点击「添加订阅源」，输入 `https://news.ycombinator.com` 测试 RSS 发现

---

## 常见问题排查

### 问题：Pages 构建失败，报 `Cannot find package`

**原因**：`pnpm install` 在 Pages 环境中可能失败。

**解决**：在 Pages 构建设置中，将 Build command 改为：
```
npm install -g pnpm && pnpm install && cd frontend && pnpm build
```

---

### 问题：前端页面空白或 API 请求失败（CORS 错误）

**原因**：`FRONTEND_URL` 环境变量与实际 Pages 域名不匹配。

**解决**：
1. 在 Worker 的 **Settings → Variables** 中确认 `FRONTEND_URL` 与 Pages 实际域名完全一致
2. 确认没有多余空格或尾部斜杠
3. 保存后需要等 Worker 重新部署才生效（点击 **Save and deploy**）

---

### 问题：登录后刷新页面跳回登录页

**原因**：`VITE_API_URL` 环境变量在构建时未生效。

**解决**：
1. Pages 项目 → **Settings** → **Environment variables**
2. 确认 `VITE_API_URL` 已填写正确的 Worker API 地址
3. 在 **Deployments** 页面点击最新部署 → **Retry deployment** 重新构建

---

### 问题：D1 数据库相关错误（no such table）

**原因**：数据库表结构未初始化。

**解决**：回到第二步，在 D1 Console 重新执行 SQL 建表语句。

---

### 问题：Worker 显示 `Internal Server Error`

**解决**：
1. Worker 详情页 → **Logs** → **Begin log stream**
2. 重新访问出错的页面
3. 查看实时日志中的具体错误信息

最常见原因：`JWT_SECRET` 密钥未配置，在 **Settings → Variables and Secrets** 中检查。

---

## 资源 ID 记录表（部署时填写）

| 资源 | ID / URL | 获取位置 |
|---|---|---|
| D1 Database ID | | 第二步 → D1 控制台 |
| KV Namespace ID | | 第三步 → KV 控制台 |
| R2 Public URL | | 第四步 → R2 Settings |
| Worker 域名 | | 第六步 → Worker 详情页 |
| Pages 域名 | | 第七步 → Pages 部署完成 |
| Cloudflare Account ID | | 控制台右侧边栏 |
| Cloudflare API Token | | 第九步 → Profile → API Tokens |
