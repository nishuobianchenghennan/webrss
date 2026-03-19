/**
 * Workers 主入口
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types/env';
import { authRoutes } from './routes/auth';
import { feedRoutes } from './routes/feeds';
import { articleRoutes } from './routes/articles';
import { categoryRoutes } from './routes/categories';
import { tagRoutes } from './routes/tags';
import { authMiddleware } from './middleware/auth';
import { fetchFeedsCron } from './cron/fetch-feeds';
import { cleanupCron } from './cron/cleanup';
import { fail } from './utils/response';

const app = new Hono<{ Bindings: Env }>();

// ============ 全局中间件 ============
app.use('/api/*', async (c, next) => {
  const corsMiddleware = cors({
    origin: [c.env.FRONTEND_URL, 'http://localhost:5173'],
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
  });
  return corsMiddleware(c, next);
});

// ============ 公开路由 ============
app.route('/api/auth', authRoutes);

// ============ 认证中间件（保护后续路由）============
app.use('/api/*', authMiddleware);


// ============ 受保护路由 ============
app.route('/api/feeds', feedRoutes);
app.route('/api/articles', articleRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/tags', tagRoutes);

// 用户设置
app.put('/api/settings', async (c) => {
  const userId = c.get('userId');
  const settings = await c.req.json();

  await c.env.DB.prepare(
    'UPDATE users SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(JSON.stringify(settings), userId).run();

  return c.json({ code: 200, message: '设置已保存', data: settings, timestamp: Date.now() });
});

// 统计信息
app.get('/api/stats', async (c) => {
  const userId = c.get('userId');

  const [feedStats, articleStats] = await Promise.all([
    c.env.DB.prepare(`
      SELECT
        COUNT(*) as total_feeds,
        SUM(unread_count) as total_unread,
        SUM(article_count) as total_articles
      FROM feeds WHERE user_id = ? AND status = 'active'
    `).bind(userId).first(),
    c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN is_starred = 1 THEN 1 ELSE 0 END) as starred,
        SUM(CASE WHEN is_pinned = 1 THEN 1 ELSE 0 END) as pinned
      FROM articles WHERE user_id = ?
    `).bind(userId).first(),
  ]);

  return c.json({ code: 200, message: '获取成功', data: { feeds: feedStats, articles: articleStats }, timestamp: Date.now() });
});

// 全局404
app.notFound((c) =>
  c.json(fail(404, '接口不存在'), 404)
);

// 全局错误处理
app.onError((err, c) => {
  console.error('未处理的错误:', err);
  return c.json(fail(500, '服务器内部错误'), 500);
});

// ============ Workers 导出 ============
export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    switch (event.cron) {
      case '*/15 * * * *':
        await fetchFeedsCron(env, ctx);
        break;
      case '0 3 * * *':
        await cleanupCron(env);
        break;
      default:
        console.log('未知cron任务:', event.cron);
    }
  },
};
