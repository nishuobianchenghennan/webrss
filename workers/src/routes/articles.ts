/**
 * 文章路由
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { success, fail, paginated } from '../utils/response';

export const articleRoutes = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

// 获取文章列表
articleRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const {
    feed_id, category_id, tag_id,
    status = 'all', search, sort = 'newest',
    page = '1', limit = '20', since,
  } = c.req.query();

  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * pageSize;

  let query = `
    SELECT a.*, f.title as feed_title, f.favicon_url as feed_favicon
    FROM articles a
    JOIN feeds f ON a.feed_id = f.id
    WHERE a.user_id = ?
  `;
  const params: (string | number)[] = [userId];

  if (feed_id) {
    query += ' AND a.feed_id = ?';
    params.push(feed_id);
  }

  if (category_id) {
    query += ' AND f.category_id = ?';
    params.push(category_id);
  }

  if (tag_id) {
    query += ' AND EXISTS (SELECT 1 FROM article_tags at WHERE at.article_id = a.id AND at.tag_id = ?)';
    params.push(tag_id);
  }

  switch (status) {
    case 'unread':  query += ' AND a.is_read = 0'; break;
    case 'read':    query += ' AND a.is_read = 1'; break;
    case 'starred': query += ' AND a.is_starred = 1'; break;
    case 'pinned':  query += ' AND a.is_pinned = 1'; break;
  }

  if (search) {
    query += ' AND (a.title LIKE ? OR a.summary LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // 时间周期筛选
  if (since) {
    query += ' AND a.published_at >= ?';
    params.push(since);
  }

  // 计算总数（在追加 ORDER BY 和 LIMIT 之前执行）
  const countQuery = query.replace(
    'SELECT a.*, f.title as feed_title, f.favicon_url as feed_favicon',
    'SELECT COUNT(*) as total'
  );
  const countResult = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
  const total = countResult?.total || 0;

  // 追加排序
  switch (sort) {
    case 'oldest': query += ' ORDER BY a.published_at ASC'; break;
    case 'feed':   query += ' ORDER BY f.title ASC, a.published_at DESC'; break;
    default:       query += ' ORDER BY a.published_at DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const result = await c.env.DB.prepare(query).bind(...params).all();

  return c.json(paginated(result.results, total, pageNum, pageSize));
});

// 批量操作（必须在 /:id 之前注册）
articleRoutes.post('/batch', async (c) => {
  const userId = c.get('userId');
  const { article_ids, action } = await c.req.json();

  if (!article_ids?.length || !action) {
    return c.json(fail(400, '请提供文章ID和操作类型'), 400);
  }

  const placeholders = article_ids.map(() => '?').join(',');

  switch (action) {
    case 'read':
      await c.env.DB.prepare(`
        UPDATE articles SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders}) AND user_id = ?
      `).bind(...article_ids, userId).run();
      break;
    case 'unread':
      await c.env.DB.prepare(`
        UPDATE articles SET is_read = 0, read_at = NULL
        WHERE id IN (${placeholders}) AND user_id = ?
      `).bind(...article_ids, userId).run();
      break;
    case 'star':
      await c.env.DB.prepare(`
        UPDATE articles SET is_starred = 1, starred_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders}) AND user_id = ?
      `).bind(...article_ids, userId).run();
      break;
    case 'unstar':
      await c.env.DB.prepare(`
        UPDATE articles SET is_starred = 0, starred_at = NULL
        WHERE id IN (${placeholders}) AND user_id = ?
      `).bind(...article_ids, userId).run();
      break;
    default:
      return c.json(fail(400, '不支持的操作类型'), 400);
  }

  return c.json(success(null, '批量操作成功'));
});

// 全文搜索（必须在 /:id 之前注册）
articleRoutes.get('/search', async (c) => {
  const userId = c.get('userId');
  const { q, page = '1', limit = '20' } = c.req.query();

  if (!q) return c.json(fail(400, '请输入搜索关键词'), 400);

  const pageNum = Math.max(1, parseInt(page));
  const pageSize = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * pageSize;

  const [result, countResult] = await Promise.all([
    c.env.DB.prepare(`
      SELECT a.id, a.title, a.summary, a.url, a.published_at, a.is_read, a.is_starred,
             f.title as feed_title, f.favicon_url as feed_favicon
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      WHERE a.user_id = ?
        AND (a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, `%${q}%`, `%${q}%`, `%${q}%`, pageSize, offset).all(),

    c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM articles
      WHERE user_id = ? AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)
    `).bind(userId, `%${q}%`, `%${q}%`, `%${q}%`).first<{ total: number }>(),
  ]);

  return c.json(paginated(result.results, countResult?.total || 0, pageNum, pageSize));
});

// 获取文章详情
articleRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  const article = await c.env.DB.prepare(`
    SELECT a.*, f.title as feed_title, f.favicon_url as feed_favicon, f.site_url as feed_site_url
    FROM articles a
    JOIN feeds f ON a.feed_id = f.id
    WHERE a.id = ? AND a.user_id = ?
  `).bind(id, userId).first();

  if (!article) return c.json(fail(404, '文章不存在'), 404);

  const tags = await c.env.DB.prepare(`
    SELECT t.* FROM tags t
    JOIN article_tags at ON t.id = at.tag_id
    WHERE at.article_id = ?
  `).bind(id).all();

  return c.json(success({ ...article, tags: tags.results }));
});

// 标记已读
articleRoutes.put('/:id/read', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  await c.env.DB.prepare(`
    UPDATE articles SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?
  `).bind(id, userId).run();

  await c.env.DB.prepare(`
    UPDATE feeds SET unread_count = MAX(0, unread_count - 1)
    WHERE id = (SELECT feed_id FROM articles WHERE id = ?)
  `).bind(id).run();

  return c.json(success(null, '已标记为已读'));
});

// 标记未读
articleRoutes.put('/:id/unread', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  await c.env.DB.prepare(`
    UPDATE articles SET is_read = 0, read_at = NULL WHERE id = ? AND user_id = ?
  `).bind(id, userId).run();

  await c.env.DB.prepare(`
    UPDATE feeds SET unread_count = unread_count + 1
    WHERE id = (SELECT feed_id FROM articles WHERE id = ?)
  `).bind(id).run();

  return c.json(success(null, '已标记为未读'));
});

// 收藏/取消收藏
articleRoutes.put('/:id/star', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  const article = await c.env.DB.prepare(
    'SELECT is_starred FROM articles WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first<{ is_starred: number }>();

  if (!article) return c.json(fail(404, '文章不存在'), 404);

  const newStarred = article.is_starred ? 0 : 1;
  await c.env.DB.prepare(`
    UPDATE articles SET is_starred = ?, starred_at = ?
    WHERE id = ? AND user_id = ?
  `).bind(newStarred, newStarred ? new Date().toISOString() : null, id, userId).run();

  return c.json(success({ is_starred: newStarred }, newStarred ? '已收藏' : '已取消收藏'));
});

// 置顶/取消置顶
articleRoutes.put('/:id/pin', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  const article = await c.env.DB.prepare(
    'SELECT is_pinned FROM articles WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first<{ is_pinned: number }>();

  if (!article) return c.json(fail(404, '文章不存在'), 404);

  const newPinned = article.is_pinned ? 0 : 1;
  await c.env.DB.prepare(
    'UPDATE articles SET is_pinned = ? WHERE id = ? AND user_id = ?'
  ).bind(newPinned, id, userId).run();

  return c.json(success({ is_pinned: newPinned }, newPinned ? '已置顶' : '已取消置顶'));
});

// 保存阅读进度
articleRoutes.put('/:id/progress', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();
  const { progress } = await c.req.json();

  if (typeof progress !== 'number' || progress < 0 || progress > 1) {
    return c.json(fail(400, '进度值必须在0~1之间'), 400);
  }

  await c.env.DB.prepare(
    'UPDATE articles SET read_progress = ? WHERE id = ? AND user_id = ?'
  ).bind(progress, id, userId).run();

  return c.json(success(null, '进度已保存'));
});
