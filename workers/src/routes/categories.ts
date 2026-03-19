/**
 * 分类路由
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { success, fail } from '../utils/response';
import { generateId } from '../utils/hash';

export const categoryRoutes = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

// 获取分类树（含未读数）
categoryRoutes.get('/', async (c) => {
  const userId = c.get('userId');

  const categories = await c.env.DB.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM feeds f WHERE f.category_id = c.id) as feed_count,
           (SELECT SUM(f.unread_count) FROM feeds f WHERE f.category_id = c.id) as unread_count
    FROM categories c
    WHERE c.user_id = ?
    ORDER BY c.sort_order ASC, c.name ASC
  `).bind(userId).all<Record<string, string | number>>();

  // 构建树形结构
  const map = new Map<string, Record<string, string | number | unknown[]>>();
  const roots: Record<string, unknown>[] = [];

  for (const cat of categories.results) {
    const node = { ...cat, children: [] as unknown[] };
    map.set(cat.id as string, node);
  }

  for (const cat of categories.results) {
    if (cat.parent_id) {
      const parent = map.get(cat.parent_id as string);
      if (parent) {
        (parent.children as unknown[]).push(map.get(cat.id as string));
      }
    } else {
      roots.push(map.get(cat.id as string)!);
    }
  }

  return c.json(success(roots));
});

// 创建分类
categoryRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { name, parent_id, icon, color } = await c.req.json();

  if (!name) return c.json(fail(400, '分类名称不能为空'), 400);

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  const id = generateId();

  // 获取最大排序值
  const maxOrder = await c.env.DB.prepare(
    'SELECT MAX(sort_order) as max_order FROM categories WHERE user_id = ?'
  ).bind(userId).first<{ max_order: number }>();

  await c.env.DB.prepare(`
    INSERT INTO categories (id, user_id, parent_id, name, slug, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, userId, parent_id || null, name, slug,
    icon || null, color || null,
    (maxOrder?.max_order || 0) + 1
  ).run();

  const category = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE id = ?'
  ).bind(id).first();

  return c.json(success(category, '分类创建成功'), 201);
});

// 更新分类
categoryRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();
  const { name, parent_id, icon, color } = await c.req.json();

  const cat = await c.env.DB.prepare(
    'SELECT id FROM categories WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!cat) return c.json(fail(404, '分类不存在'), 404);

  await c.env.DB.prepare(`
    UPDATE categories SET
      name = COALESCE(?, name),
      parent_id = COALESCE(?, parent_id),
      icon = COALESCE(?, icon),
      color = COALESCE(?, color)
    WHERE id = ?
  `).bind(name || null, parent_id ?? null, icon || null, color || null, id).run();

  const updated = await c.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first();
  return c.json(success(updated, '更新成功'));
});

// 删除分类
categoryRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  const cat = await c.env.DB.prepare(
    'SELECT id FROM categories WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!cat) return c.json(fail(404, '分类不存在'), 404);

  // 将该分类下的订阅源移到未分类
  await c.env.DB.prepare(
    'UPDATE feeds SET category_id = NULL WHERE category_id = ?'
  ).bind(id).run();

  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return c.json(success(null, '分类已删除'));
});

// 批量排序
categoryRoutes.put('/reorder', async (c) => {
  const userId = c.get('userId');
  const { orders } = await c.req.json(); // [{ id, sort_order }]

  if (!Array.isArray(orders)) {
    return c.json(fail(400, '参数格式错误'), 400);
  }

  const stmts = orders.map((item: { id: string; sort_order: number }) =>
    c.env.DB.prepare(
      'UPDATE categories SET sort_order = ? WHERE id = ? AND user_id = ?'
    ).bind(item.sort_order, item.id, userId)
  );

  await c.env.DB.batch(stmts);
  return c.json(success(null, '排序已更新'));
});
