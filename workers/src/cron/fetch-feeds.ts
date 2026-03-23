/**
 * 定时抓取 Cron Job
 * 流程：抓取 RSS -> 识别内容类型 -> 清洗 HTML -> 规范化 -> 存储
 */

import type { Env } from '../types/env';
import { parseFeed } from '../services/feed-parser';
import { proxyAndCacheImage } from '../services/image-proxy';
import { generateId } from '../utils/hash';

interface FeedRow {
  id: string;
  user_id: string;
  feed_url: string;
  last_fetched_at: string | null;
  fetch_interval: number;
  error_count: number;
}

// 模板字符串内嵌 SQL 单引号，避免字符串拼接截断问题
const DUE_FEEDS_SQL = `
  SELECT id, user_id, feed_url, last_fetched_at, fetch_interval, error_count
  FROM feeds
  WHERE status = 'active'
    AND (
      last_fetched_at IS NULL
      OR datetime(last_fetched_at, '+' || fetch_interval || ' minutes') <= datetime('now')
    )
  ORDER BY last_fetched_at ASC
  LIMIT 50
`;

const INSERT_ARTICLE_SQL = `
  INSERT OR IGNORE INTO articles
    (id, feed_id, user_id, guid, title, author, summary, content,
     url, cover_image_url, word_count, reading_time, content_type, published_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

/**
 * 定时抓取所有需要更新的订阅源
 */
export async function fetchFeedsCron(env: Env, ctx: ExecutionContext) {
  const feeds = await env.DB.prepare(DUE_FEEDS_SQL).all<FeedRow>();

  const tasks = feeds.results.map((feed: FeedRow) =>
    ctx.waitUntil(fetchAndStoreFeed(feed, env))
  );
  await Promise.allSettled(tasks);
}

async function fetchAndStoreFeed(feed: FeedRow, env: Env): Promise<void> {
  try {
    const response = await fetch(feed.feed_url, {
      headers: {
        'User-Agent': 'RSSPlus/1.0 Feed Fetcher',
        ...(feed.last_fetched_at ? { 'If-Modified-Since': feed.last_fetched_at } : {}),
      },
      signal: AbortSignal.timeout(15000),
    });

    // 内容未变化，只更新抓取时间
    if (response.status === 304) {
      await env.DB
        .prepare('UPDATE feeds SET last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(feed.id)
        .run();
      return;
    }

    if (!response.ok) {
      throw new Error('HTTP ' + String(response.status) + ': ' + response.statusText);
    }

    const text = await response.text();
    // parseFeed: 检测格式 -> 提取字段 -> sanitizeHtml -> identifyContentType -> normalizePubDate
    const parsed = parseFeed(text, response.headers.get('content-type') ?? '');

    for (const item of parsed.items) {
      // 封面图代理缓存到 R2，失败回退原始 URL
      let imgUrl = item.image ?? null;
      if (imgUrl) {
        imgUrl = await proxyAndCacheImage(imgUrl, env);
      }

      // guid 唯一约束，冲突则跳过
      await env.DB
        .prepare(INSERT_ARTICLE_SQL)
        .bind(
          generateId(),
          feed.id,
          feed.user_id,
          item.guid,
          item.title,
          item.author ?? null,
          item.summary ?? null,
          item.content ?? null,
          item.url ?? null,
          imgUrl,
          item.word_count,
          item.reading_time,
          item.content_type,
          item.pubDate,
        )
        .run();
    }

    // 更新 feed 统计与抓取时间，清零错误计数
    await env.DB
      .prepare(
        'UPDATE feeds SET' +
        '  last_fetched_at = CURRENT_TIMESTAMP,' +
        '  error_count = 0,' +
        '  article_count = (SELECT COUNT(*) FROM articles WHERE feed_id = ?),' +
        '  unread_count = (SELECT COUNT(*) FROM articles WHERE feed_id = ? AND is_read = 0)' +
        ' WHERE id = ?'
      )
      .bind(feed.id, feed.id, feed.id)
      .run();

  } catch (err) {
    // 记录错误次数，超过阈值后暂停该 feed
    console.error('抓取失败 feed=' + feed.id + ':', err);
    await env.DB
      .prepare(
        'UPDATE feeds SET' +
        '  error_count = error_count + 1,' +
        '  last_fetched_at = CURRENT_TIMESTAMP,' +
        "  status = CASE WHEN error_count + 1 >= 10 THEN 'error' ELSE status END" +
        ' WHERE id = ?'
      )
      .bind(feed.id)
      .run();
  }
}
