/**
 * 标签路由
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { success, fail } from '../utils/response';
import { generateId } from '../utils/hash';

export const tagRoutes = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

// 获取所有标签
tagRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const tags = await c.env.DB.prepare(
    'SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC'
  ).bind(userId).all();
  return c.json(success(tags.results));
});

// 创建标签
tagRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { name, color } = await c.req.json();

  if (!name) return c.json(fail(400, '标签名不能为空'), 400);

  const existing = await c.env.DB.prepare(
    'SELECT id FROM tags WHERE user_id = ? AND name = ?'
  ).bind(userId, name).first();

  if (existing) return c.json(fail(400, '标签已存在'), 400);

  const id = generateId();
  await c.env.DB.prepare(
    'INSERT INTO tags (id, user_id, name, color) VALUES (?, ?, ?, ?)'
  ).bind(id, userId, name, color || '#6B7280').run();

  const tag = await c.env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first();
  return c.json(success(tag, '标签创建成功'), 201);
});

// 删除标签
tagRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  const tag = await c.env.DB.prepare(
    'SELECT id FROM tags WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!tag) return c.json(fail(404, '标签不存在'), 404);

  await c.env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
  return c.json(success(null, '标签已删除'));
});

// 给文章添加标签
tagRoutes.post('/articles/:articleId', async (c) => {
  const userId = c.get('userId');
  const { articleId } = c.req.param();
  const { tag_ids } = await c.req.json();

  // 验证文章归属
  const article = await c.env.DB.prepare(
    'SELECT id FROM articles WHERE id = ? AND user_id = ?'
  ).bind(articleId, userId).first();

  if (!article) return c.json(fail(404, '文章不存在'), 404);

  if (!Array.isArray(tag_ids)) return c.json(fail(400, '参数格式错误'), 400);

  // 删除旧标签关联，重新插入
  await c.env.DB.prepare('DELETE FROM article_tags WHERE article_id = ?').bind(articleId).run();

  if (tag_ids.length > 0) {
    const stmts = tag_ids.map((tagId: string) =>
      c.env.DB.prepare(
        'INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)'
      ).bind(articleId, tagId)
    );
    await c.env.DB.batch(stmts);
  }

  return c.json(success(null, '标签更新成功'));
});
