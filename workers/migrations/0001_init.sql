-- ==========================================
-- RSS Plus D1 数据库初始化脚本
-- Migration: 0001_init.sql
-- ==========================================

-- 用户表
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

-- 分类表
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

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL,
    name            TEXT NOT NULL,
    color           TEXT DEFAULT '#6B7280',
    UNIQUE(user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- RSS订阅源表
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

-- 文章表
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

-- 文章标签关联表
CREATE TABLE IF NOT EXISTS article_tags (
    article_id      TEXT NOT NULL,
    tag_id          TEXT NOT NULL,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 阅读历史表
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

-- ==========================================
-- 索引
-- ==========================================
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
