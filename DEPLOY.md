# RSS Plus 手动部署指南

> 全程使用浏览器界面操作，无需命令行。分为两个平台：**GitHub**（代码托管）+ **Cloudflare**（后端 + 前端托管）
>
> **所有敏感信息（ID、名称、URL、密钥）只存放在 GitHub Secrets 中，代码文件里不包含任何真实值。**

---

## 总体流程概览

```
第一步  →  上传代码到 GitHub
第二步  →  Cloudflare 创建 D1 数据库 + 初始化表结构
第三步  →  Cloudflare 创建 KV 命名空间
第四步  →  Cloudflare 创建 R2 存储桶 + 开启公开访问
第五步  →  Cloudflare 创建占位 Worker
第六步  →  Cloudflare Pages 连接 GitHub 部署前端
第七步  →  在 GitHub 仓库配置所有 Secrets（核心步骤）
第八步  →  推送代码触发自动部署
第九步  →  在 Cloudflare 控制台配置 JWT_SECRET
第十步  →  验证功能是否正常
```

---

## GitHub Secrets 完整清单

所有配置都存放在 GitHub 仓库的 Secrets 中，CI/CD 时自动注入，**代码文件里不出现任何真实值**。

| Secret 名称 | 说明 | 从哪里获取 |
|---|---|---|
| `CF_API_TOKEN` | Cloudflare API Token | 第七步 → Cloudflare → Profile → API Tokens |
| `CF_ACCOUNT_ID` | Cloudflare 账号 ID | Cloudflare 控制台右侧边栏 |
| `CF_WORKER_NAME` | 你给 Worker 取的名称 | 第五步创建 Worker 时自己填写的名称 |
| `CF_D1_DB_NAME` | D1 数据库名称 | 第二步创建数据库时自己填写的名称 |
| `CF_D1_DATABASE_ID` | D1 数据库 ID | 第二步创建数据库后获取 |
| `CF_R2_BUCKET_NAME` | R2 存储桶名称 | 第四步创建存储桶时自己填写的名称 |
| `CF_KV_NAMESPACE_ID` | KV 命名空间 ID | 第三步创建 KV 后获取 |
| `CF_R2_PUBLIC_URL` | R2 公开访问 URL | 第四步开启 R2 公开访问后获取 |
| `CF_FRONTEND_URL` | Pages 前端域名 | 第六步部署 Pages 后获取 |
| `CF_VITE_API_URL` | 前端调用的 API 地址 | 第五步部署 Worker 后获取（需加 `/api` 后缀） |
| `CF_PAGES_PROJECT_NAME` | Pages 项目名称 | 第六步创建 Pages 项目时自己填写的名称 |

---

## 第一步：上传代码到 GitHub

### 1.1 创建 GitHub 仓库

1. 打开 [github.com](https://github.com)，登录账号
2. 点击右上角 **+** → **New repository**
3. 填写仓库信息：
   - **Repository name**：自定义（如 `rss-plus`）
   - **Visibility**：选 `Private`（私有，保护你的代码）
   - **不要**勾选 Initialize this repository
4. 点击 **Create repository**

### 1.2 上传项目文件

GitHub 网页上传有单次 100 个文件的限制，推荐使用 **GitHub Desktop** 客户端上传（无需命令行）：

1. 下载安装 [GitHub Desktop](https://desktop.github.com/)
2. 打开 GitHub Desktop → **File** → **Add Local Repository**
3. 选择项目文件夹
4. 点击 **Create a repository here**（如提示）
5. 左侧会列出所有变更文件，在 **Summary** 框填写 `init`
6. 点击 **Commit to main**
7. 点击右上角 **Publish repository**
8. 在弹出窗口：
   - **Name**：填你的仓库名
   - 勾选 **Keep this code private**
   - 点击 **Publish Repository**

上传完成后，在 GitHub 网页刷新即可看到所有文件。

---

## 第二步：创建 D1 数据库并初始化表结构

### 2.1 创建数据库

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com)，登录账号
2. 左侧菜单 → **Workers & Pages** → **D1 SQL Database**
3. 点击右上角 **Create database**
4. 填写 **Database name**（自取，**只能用小写字母、数字和连字符**，如 `my-rss-db`，记住这个名称，后面要填入 `CF_D1_DB_NAME`）
5. 点击 **Create**
6. 创建成功后，**复制并保存 Database ID**（格式类似 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`），后面填入 `CF_D1_DATABASE_ID`

### 2.2 初始化数据库表结构

1. 进入刚创建的数据库页面
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
6. 切换到 **Tables** 标签页，确认能看到 7 张表

---

## 第三步：创建 KV 命名空间

1. 左侧菜单 → **Workers & Pages** → **KV**
2. 点击 **Create a namespace**
3. 填写 **Namespace name**（自取，**只能用小写字母、数字和连字符**，如 `my-rss-kv`）
4. 点击 **Add**
5. 创建成功后，**复制并保存 Namespace ID**（32 位十六进制字符串），后面填入 `CF_KV_NAMESPACE_ID`

---

## 第四步：创建 R2 存储桶并开启公开访问

### 4.1 创建存储桶

1. 左侧菜单 → **R2 Object Storage**
2. 点击 **Create bucket**
3. 填写 **Bucket name**（自取，**只能用小写字母、数字和连字符**，如 `my-rss-assets`，记住这个名称，后面填入 `CF_R2_BUCKET_NAME`）
4. **Location**：选择离你最近的区域
5. 点击 **Create bucket**

### 4.2 开启公开访问并获取域名

1. 进入刚创建的存储桶页面
2. 点击顶部 **Settings** 标签页
3. 找到 **Public access** 部分
4. 点击 **Allow Access**，在弹出确认框中点击 **Allow**
5. 开启后会显示一个公开访问 URL，格式为：
   ```
   https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
   ```
6. **复制并保存这个 URL**，后面填入 `CF_R2_PUBLIC_URL`

---

## 第五步：创建占位 Worker

Worker 的真实代码通过 GitHub Actions 自动部署，这里只需先创建一个占位 Worker 以获取域名。

1. Cloudflare 控制台 → **Workers & Pages** → **Create**
2. 点击 **Create Worker**
3. **Worker name** 填写你想要的名称（**只能用小写字母、数字和连字符**，如 `my-rss-api`，记住，后面填入 `CF_WORKER_NAME`）
4. 点击 **Deploy**（部署占位代码即可）
5. 部署成功后，在 Worker 详情页可以看到访问域名，格式为：
   ```
   https://<你的worker名称>.<子域名>.workers.dev
   ```
6. **复制并保存这个域名**，加上 `/api` 后缀填入 `CF_VITE_API_URL`，例如：
   ```
   https://<你的worker名称>.<子域名>.workers.dev/api
   ```

---

## 第六步：部署前端到 Cloudflare Pages

### 6.1 创建 Pages 项目

1. Cloudflare 控制台 → **Workers & Pages** → **Create**
2. 选择 **Pages** → **Connect to Git**
3. 点击 **Connect GitHub**，授权 Cloudflare 访问你的 GitHub 账号
4. 在仓库列表中找到你的仓库，点击 **Begin setup**

### 6.2 配置构建设置

在构建配置页面填写：

| 配置项 | 填写内容 |
|---|---|
| **Project name** | 自取（**只能用小写字母、数字和连字符**，如 `my-rss-reader`，记住，后面填入 `CF_PAGES_PROJECT_NAME`） |
| **Production branch** | `main` |
| **Root directory** | 留空 |
| **Framework preset** | `None` |
| **Build command** | `cd frontend && npm install --legacy-peer-deps && npm run build` |
| **Build output directory** | `frontend/dist` |

### 6.3 添加环境变量

在同一页面下方找到 **Environment variables** 部分，点击 **Add variable**：

| Variable name | Value |
|---|---|
| `VITE_API_URL` | 第五步获取的 Worker 域名加 `/api`（如 `https://xxx.workers.dev/api`）|
| `NODE_VERSION` | `20` |

### 6.4 开始部署并获取域名

1. 点击 **Save and Deploy**，等待构建完成（约 2-3 分钟）
2. 部署完成后获得 Pages 域名，格式为：
   ```
   https://<项目名>.pages.dev
   ```
3. **复制并保存这个域名**，后面填入 `CF_FRONTEND_URL`

---

## 第七步：配置 GitHub Secrets（核心步骤）

### 7.1 获取 Cloudflare API Token

1. 打开 Cloudflare 控制台 → 右上角头像 → **Profile** → **API Tokens**
2. 点击 **Create Token**
3. 选择 **Edit Cloudflare Workers** 模板
4. 确认权限包含：
   - **Account** → `Workers Scripts:Edit`
   - **Account** → `D1:Edit`
   - **Account** → `Workers KV Storage:Edit`
5. 点击 **Continue to summary** → **Create Token**
6. **立即复制并保存 Token**（只显示一次！），填入 `CF_API_TOKEN`

### 7.2 获取 Account ID

在 Cloudflare 控制台任意页面的右侧边栏可以看到 **Account ID**，复制填入 `CF_ACCOUNT_ID`。

### 7.3 在 GitHub 添加所有 Secrets

1. 打开 GitHub 仓库页面
2. 点击 **Settings** → 左侧 **Secrets and variables** → **Actions**
3. 点击 **New repository secret**，依次添加以下所有 Secret：

| Secret 名称 | 值来源 |
|---|---|
| `CF_API_TOKEN` | 第 7.1 步获取 |
| `CF_ACCOUNT_ID` | 第 7.2 步获取 |
| `CF_WORKER_NAME` | 第五步创建 Worker 时填写的名称 |
| `CF_D1_DB_NAME` | 第二步创建数据库时填写的名称 |
| `CF_D1_DATABASE_ID` | 第二步获取的 Database ID |
| `CF_R2_BUCKET_NAME` | 第四步创建存储桶时填写的名称 |
| `CF_KV_NAMESPACE_ID` | 第三步获取的 Namespace ID |
| `CF_R2_PUBLIC_URL` | 第四步获取的 R2 公开 URL |
| `CF_FRONTEND_URL` | 第六步获取的 Pages 域名 |
| `CF_VITE_API_URL` | 第五步获取的 Worker 域名 + `/api` |
| `CF_PAGES_PROJECT_NAME` | 第六步创建 Pages 项目时填写的名称 |

---

## 第八步：推送代码触发自动部署

所有 Secrets 配置完成后，向仓库 main 分支推送任意提交即可触发自动部署：

- 使用 GitHub Desktop：在 **Summary** 框填写任意提交信息，**Commit to main** → **Push origin**
- 或在 GitHub 网页上随意编辑任意文件并提交

GitHub Actions 会自动：
1. 将所有占位符替换为真实的 Secret 值
2. 运行 D1 数据库迁移
3. 部署 Worker 后端
4. 构建并部署前端到 Pages

查看部署进度：GitHub 仓库 → **Actions** 标签页

---

## 第九步：配置 JWT 密钥

这是最重要的安全配置，**必须设置**。

1. Cloudflare 控制台 → **Workers & Pages** → 你的 Worker → **Settings** → **Variables and Secrets**
2. 找到 **Secrets** 部分，点击 **Add**
3. 添加：
   - **Variable name**：`JWT_SECRET`
   - **Value**：一个随机的长字符串（至少 32 个字符）

   **生成随机密钥的方法**（在浏览器控制台执行，按 F12 打开）：
   ```javascript
   Array.from(crypto.getRandomValues(new Uint8Array(48)), b => b.toString(16).padStart(2,'0')).join('')
   ```
   复制输出的 96 位十六进制字符串作为密钥。

4. 点击 **Encrypt** 确保加密存储，然后 **Save**

---

## 第十步：验证部署是否成功

### 10.1 检查 Workers 部署状态

Cloudflare 控制台 → **Workers & Pages** → 你的 Worker → **Deployments** 标签页，确认最新部署状态为 ✅ **Success**

### 10.2 检查 Pages 部署状态

Cloudflare 控制台 → **Workers & Pages** → 你的 Pages 项目 → **Deployments** 标签页，确认最新部署状态为 ✅ **Success**

### 10.3 测试 API 接口

打开浏览器，访问：
```
https://<你的worker域名>/api/auth/register
```

如果收到如下响应（405 是正常的，说明接口存在）：
```json
{"code":405,"message":"..."}
```
说明 Worker 已正常运行。

### 10.4 测试前端页面

1. 访问你的 Pages 域名
2. 应该看到登录页面
3. 点击「注册」，创建一个账号
4. 登录成功后进入主界面
5. 点击「添加订阅源」，输入 `https://news.ycombinator.com` 测试 RSS 发现

---

## 常见问题排查

### 问题：Pages 构建失败，报 `Cannot find package`

**解决**：在 Pages 构建设置中，将 Build command 改为：
```
npm install -g pnpm && pnpm install && cd frontend && pnpm build
```

---

### 问题：前端页面空白或 API 请求失败（CORS 错误）

**原因**：`CF_FRONTEND_URL` 与实际 Pages 域名不匹配。

**解决**：
1. 在 GitHub Secrets 中确认 `CF_FRONTEND_URL` 与 Pages 实际域名完全一致
2. 确认没有多余空格或尾部斜杠
3. 重新触发一次 GitHub Actions 部署

---

### 问题：登录后刷新页面跳回登录页

**原因**：`CF_VITE_API_URL` 在构建时未生效。

**解决**：
1. 确认 GitHub Secrets 中 `CF_VITE_API_URL` 已正确填写（含 `/api` 后缀）
2. 在 Pages 项目 → **Deployments** 页面点击最新部署 → **Retry deployment** 重新构建

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

### 问题：GitHub Actions 部署失败，报 secrets 相关错误

**原因**：某个 Secret 未配置或值有误。

**解决**：
1. 检查 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions**，确认所有 11 个 Secret 都已添加
2. 检查各 Secret 的值是否正确（特别注意 URL 格式、ID 是否完整复制）
3. 重新运行 GitHub Actions

---

## 资源记录表（部署时填写）

| 资源 | 你填写/获取的值 | 对应 Secret |
|---|---|---|
| Worker 名称 | | `CF_WORKER_NAME` |
| D1 数据库名称 | | `CF_D1_DB_NAME` |
| D1 Database ID | | `CF_D1_DATABASE_ID` |
| R2 存储桶名称 | | `CF_R2_BUCKET_NAME` |
| KV Namespace ID | | `CF_KV_NAMESPACE_ID` |
| R2 Public URL | | `CF_R2_PUBLIC_URL` |
| Worker 域名（含 /api） | | `CF_VITE_API_URL` |
| Pages 项目名称 | | `CF_PAGES_PROJECT_NAME` |
| Pages 域名 | | `CF_FRONTEND_URL` |
| Cloudflare Account ID | | `CF_ACCOUNT_ID` |
| Cloudflare API Token | | `CF_API_TOKEN` |
