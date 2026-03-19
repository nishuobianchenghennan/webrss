/**
 * 定时抓取 Cron Job
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

/**
 * 定时抓取所有需要更新的订阅源
 */
export async function fetchFeedsCron(env: Env, ctx: ExecutionContext) {
  // 查询需要更新的feeds
  const feeds = await env.DB.prepare(`
    SELECT id, user_id, feed_url, last_fetched_at, fetch_interval, error_count
    FROM feeds
    WHERE status = 'active'
      AND (
        last_fetched_at IS NULL
        OR datetime(last_fetched_at, '+' || fetch_interval || ' minutes') <= datetime('now')
      )
    ORDER BY last_fetched_at ASC
    LIMIT 50
  `).all<FeedRow>();

  const tasks = feeds.results.map(feed =>
    ctx.waitUntil(fetchAndStoreFeed(feed, env))
  );

  await Promise.allSettled(tasks);
}

async function fetchAndStoreFeed(feed: FeedRow, env: Env) {
  try {
    const response = await fetch(feed.feed_url, {
      headers: {
        'User-Agent': 'RSSPlus/1.0 Feed Fetcher',
        ...(feed.last_fetched_at
          ? { 'If-Modified-Since': feed.last_fetched_at }
          : {}),
      },
      signal: AbortSignal.timeout(15000), // 15秒超时
    });

    // 内容未变化
    if (response.status === 304) {
      await env.DB.prepare(
        'UPDATE feeds SET last_fetched_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(feed.id).run();
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    const parsed = parseFeed(text, response.headers.get('content-type') || '');

    let newCount = 0;
    for (const item of parsed.items) {
      // 缓存封面图
      let imgUrl = item.image || null;
      if (imgUrl) {
        imgUrl = await proxyAndCacheImage(imgUrl, env);
      }

      const result = await env.DB.prepare(`
        INSERT INTO articles (
          id, feed_id, user_id, guid, title, author,
          summary, content, url, cover_image_url,
          word_count, reading_time, published_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(feed_id, guid) DO NOTHING
      `).bind(
        generateId(),
        feed.id,
        feed.user_id,
        item.guid,
        item.title,
        item.author || null,
        item.summary || null,
        item.content || null,
        item.url || null,
        imgUrl,
        item.word_count,
        item.reading_time,
        item.pubDate || null
      ).run();

      if (result.meta.changes > 0) newCount++;
    }

    // 更新feed状态
    await env.DB.prepare(`
      UPDATE feeds SET
        last_fetched_at = CURRENT_TIMESTAMP,
        last_published_at = CASE WHEN ? > 0 THEN CURRENT_TIMESTAMP ELSE last_published_at END,
        error_count = 0,
        error_message = NULL,
        fetch_interval = 30,
        unread_count = unread_count + ?,
        article_count = article_count + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newCount, newCount, newCount, feed.id).run();

  } catch (err) {
    const errorMsg = (err as Error).message;
    // 指数退避：连续失败次数越多，间隔越长，最大24小时
    const newInterval = Math.min(
      feed.fetch_interval * Math.pow(2, feed.error_count),
      1440
    );

    await env.DB.prepare(`
      UPDATE feeds SET
        error_count = error_count + 1,
        error_message = ?,
        fetch_interval = ?,
        status = CASE WHEN error_count >= 10 THEN 'error' ELSE status END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(errorMsg, Math.round(newInterval), feed.id).run();
  }
}
