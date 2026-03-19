/**
 * 定时清理 Cron Job
 */

import type { Env } from '../types/env';

/**
 * 清理90天前的已读文章（保留收藏和置顶）
 */
export async function cleanupCron(env: Env) {
  await env.DB.prepare(`
    DELETE FROM articles
    WHERE is_read = 1
      AND is_starred = 0
      AND is_pinned = 0
      AND fetched_at < datetime('now', '-90 days')
  `).run();

  // 同步更新feed的article_count
  await env.DB.prepare(`
    UPDATE feeds SET
      article_count = (SELECT COUNT(*) FROM articles WHERE articles.feed_id = feeds.id),
      updated_at = CURRENT_TIMESTAMP
  `).run();
}
