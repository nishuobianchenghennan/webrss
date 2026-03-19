/**
 * 订阅源路由
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { success, fail, paginated } from '../utils/response';
import { generateId } from '../utils/hash';
import { parseFeed } from '../services/feed-parser';
import { discoverFeeds } from '../services/feed-discovery';
import { proxyAndCacheImage, cacheFavicon } from '../services/image-proxy';
import { parseOPML, generateOPML } from '../services/opml';

export const feedRoutes = new Hono<{
  Bindings: Env;
  Variables: { userId: string };
}>();

// 获取所有订阅源（含分类信息）
feedRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  const { category_id, status } = c.req.query();

  let query = `
    SELECT f.*, c.name as category_name, c.icon as category_icon
    FROM feeds f
    LEFT JOIN categories c ON f.category_id = c.id
    WHERE f.user_id = ?
  `;
  const params: string[] = [userId];

  if (category_id) {
    query += ' AND f.category_id = ?';
    params.push(category_id);
  }
  if (status) {
    query += ' AND f.status = ?';
    params.push(status);
  }

  query += ' ORDER BY f.title ASC';

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(success(result.results));
});

// RSS自动发现（必须在 /:id 之前注册）
feedRoutes.post('/discover', async (c) => {
  const { url } = await c.req.json();
  if (!url) return c.json(fail(400, '请提供URL'), 400);

  const discovered = await discoverFeeds(url);

  if (discovered.length === 0) {
    return c.json(fail(404, '未找到RSS源，请检查URL是否正确'), 404);
  }

  return c.json(success(discovered));
});

// OPML导入（必须在 /:id 之前注册）
feedRoutes.post('/import', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.text();

  let outlines;
  try {
    outlines = parseOPML(body);
  } catch {
    return c.json(fail(400, 'OPML格式错误'), 400);
  }

  let imported = 0;
  let failed = 0;

  async function importOutline(outline: typeof outlines[0], categoryId?: string) {
    if (outline.xmlUrl) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM feeds WHERE user_id = ? AND feed_url = ?'
      ).bind(userId, outline.xmlUrl).first();

      if (!existing) {
        try {
          await c.env.DB.prepare(`
            INSERT INTO feeds (id, user_id, category_id, title, site_url, feed_url, feed_type, status)
            VALUES (?, ?, ?, ?, ?, ?, 'rss', 'active')
          `).bind(
            generateId(), userId, categoryId || null,
            outline.title || outline.text,
            outline.htmlUrl || null,
            outline.xmlUrl
          ).run();
          imported++;
        } catch {
          failed++;
        }
      }
    } else if (outline.children?.length) {
      let catId = categoryId;
      if (outline.text || outline.title) {
        const existingCat = await c.env.DB.prepare(
          'SELECT id FROM categories WHERE user_id = ? AND name = ?'
        ).bind(userId, outline.text || outline.title).first<{ id: string }>();

        if (existingCat) {
          catId = existingCat.id;
        } else {
          catId = generateId();
          await c.env.DB.prepare(`
            INSERT INTO categories (id, user_id, parent_id, name, slug)
            VALUES (?, ?, ?, ?, ?)
          `).bind(
            catId, userId, categoryId || null,
            outline.text || outline.title,
            (outline.text || outline.title).toLowerCase().replace(/\s+/g, '-')
          ).run();
        }
      }

      for (const child of outline.children) {
        await importOutline(child, catId);
      }
    }
  }

  for (const outline of outlines) {
    await importOutline(outline);
  }

  return c.json(success({ imported, failed }, `导入完成：成功${imported}个，失败${failed}个`));
});

// OPML导出（必须在 /:id 之前注册）
feedRoutes.get('/export', async (c) => {
  const userId = c.get('userId');

  const categories = await c.env.DB.prepare(
    'SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order'
  ).bind(userId).all<Record<string, string>>();

  const feeds = await c.env.DB.prepare(
    'SELECT * FROM feeds WHERE user_id = ? AND status != ?'
  ).bind(userId, 'deleted').all<Record<string, string>>();

  const catFeeds = new Map<string, typeof feeds.results>();
  const uncategorized: typeof feeds.results = [];

  for (const feed of feeds.results) {
    if (feed.category_id) {
      const arr = catFeeds.get(feed.category_id) || [];
      arr.push(feed);
      catFeeds.set(feed.category_id, arr);
    } else {
      uncategorized.push(feed);
    }
  }

  const outlines = [
    ...uncategorized.map(f => ({
      text: f.title,
      title: f.title,
      type: 'rss',
      xmlUrl: f.feed_url,
      htmlUrl: f.site_url || undefined,
    })),
    ...categories.results.map(cat => ({
      text: cat.name,
      title: cat.name,
      children: (catFeeds.get(cat.id) || []).map(f => ({
        text: f.title,
        title: f.title,
        type: 'rss',
        xmlUrl: f.feed_url,
        htmlUrl: f.site_url || undefined,
      })),
    })),
  ];

  const opml = generateOPML(outlines);

  return new Response(opml, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="rss-plus-feeds.opml"',
    },
  });
});

// 获取推荐订阅源列表（必须在 /:id 之前注册）
feedRoutes.get('/recommendations', (c) => {
  const recommendations = [
    { title: 'Hacker News', feed_url: 'https://news.ycombinator.com/rss', category: '技术', site_url: 'https://news.ycombinator.com' },
    { title: '阮一峰的网络日志', feed_url: 'https://www.ruanyifeng.com/blog/atom.xml', category: '博客', site_url: 'https://www.ruanyifeng.com/blog/' },
    { title: 'The Verge', feed_url: 'https://www.theverge.com/rss/index.xml', category: '科技新闻', site_url: 'https://www.theverge.com' },
    { title: 'CSS-Tricks', feed_url: 'https://css-tricks.com/feed/', category: '前端', site_url: 'https://css-tricks.com' },
    { title: 'Smashing Magazine', feed_url: 'https://www.smashingmagazine.com/feed/', category: '设计', site_url: 'https://www.smashingmagazine.com' },
    { title: 'GitHub Blog', feed_url: 'https://github.blog/feed/', category: '技术', site_url: 'https://github.blog' },
    { title: 'Netflix TechBlog', feed_url: 'https://netflixtechblog.com/feed', category: '技术', site_url: 'https://netflixtechblog.com' },
  ];

  return c.json(success(recommendations));
});

// 添加订阅源
feedRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  const { feed_url, category_id, title: customTitle } = await c.req.json();

  if (!feed_url) return c.json(fail(400, '请填写Feed URL'), 400);

  const existing = await c.env.DB.prepare(
    'SELECT id FROM feeds WHERE user_id = ? AND feed_url = ?'
  ).bind(userId, feed_url).first();

  if (existing) return c.json(fail(400, '已订阅该Feed'), 400);

  let title = customTitle || '';
  let description = '';
  let site_url = '';
  let feed_type = 'rss';
  let favicon_url: string | null = null;

  try {
    const response = await fetch(feed_url, {
      headers: { 'User-Agent': 'RSSPlus/1.0' },
    });
    const text = await response.text();
    const parsed = parseFeed(text, response.headers.get('content-type') || '');
    title = customTitle || parsed.title;
    description = parsed.description || '';
    site_url = parsed.site_url || '';
    feed_type = parsed.feed_type;

    if (site_url) {
      favicon_url = await cacheFavicon(site_url, c.env);
    }
  } catch (err) {
    if (!title) return c.json(fail(400, `无法访问该Feed: ${(err as Error).message}`), 400);
  }

  const id = generateId();
  await c.env.DB.prepare(`
    INSERT INTO feeds (id, user_id, category_id, title, description, site_url,
                       feed_url, favicon_url, feed_type, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).bind(
    id, userId, category_id || null,
    title, description, site_url,
    feed_url, favicon_url, feed_type
  ).run();

  const feed = await c.env.DB.prepare('SELECT * FROM feeds WHERE id = ?').bind(id).first();
  return c.json(success(feed, '订阅成功'), 201);
});

// 获取单个订阅源
feedRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  const feed = await c.env.DB.prepare(
    'SELECT * FROM feeds WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!feed) return c.json(fail(404, '订阅源不存在'), 404);

  return c.json(success(feed));
});

// 更新订阅源
feedRoutes.put('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();
  const { title, category_id, fetch_interval, status } = await c.req.json();

  const feed = await c.env.DB.prepare(
    'SELECT id FROM feeds WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!feed) return c.json(fail(404, '订阅源不存在'), 404);

  await c.env.DB.prepare(`
    UPDATE feeds SET
      title = COALESCE(?, title),
      category_id = COALESCE(?, category_id),
      fetch_interval = COALESCE(?, fetch_interval),
      status = COALESCE(?, status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(title || null, category_id ?? null, fetch_interval || null, status || null, id).run();

  const updated = await c.env.DB.prepare('SELECT * FROM feeds WHERE id = ?').bind(id).first();
  return c.json(success(updated, '更新成功'));
});

// 删除订阅源
feedRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  const feed = await c.env.DB.prepare(
    'SELECT id FROM feeds WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!feed) return c.json(fail(404, '订阅源不存在'), 404);

  await c.env.DB.prepare('DELETE FROM feeds WHERE id = ?').bind(id).run();
  return c.json(success(null, '删除成功'));
});

// 手动刷新订阅源
feedRoutes.post('/:id/refresh', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();

  const feed = await c.env.DB.prepare(
    'SELECT * FROM feeds WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first<Record<string, string | number>>();

  if (!feed) return c.json(fail(404, '订阅源不存在'), 404);

  try {
    const response = await fetch(feed.feed_url as string, {
      headers: { 'User-Agent': 'RSSPlus/1.0' },
    });
    const text = await response.text();
    const parsed = parseFeed(text, response.headers.get('content-type') || '');

    let newCount = 0;
    for (const item of parsed.items) {
      const imgUrl = item.image ? await proxyAndCacheImage(item.image, c.env) : null;
      const stmt = await c.env.DB.prepare(`
        INSERT INTO articles (id, feed_id, user_id, guid, title, author,
                              summary, content, url, cover_image_url,
                              word_count, reading_time, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(feed_id, guid) DO NOTHING
      `).bind(
        generateId(), id, userId,
        item.guid, item.title, item.author || null,
        item.summary || null, item.content || null,
        item.url || null, imgUrl,
        item.word_count, item.reading_time,
        item.pubDate || null
      ).run();

      if (stmt.meta.changes > 0) newCount++;
    }

    await c.env.DB.prepare(`
      UPDATE feeds SET
        last_fetched_at = CURRENT_TIMESTAMP,
        error_count = 0, error_message = NULL,
        unread_count = unread_count + ?,
        article_count = article_count + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newCount, newCount, id).run();

    return c.json(success({ new_articles: newCount }, `刷新成功，新增${newCount}篇文章`));
  } catch (err) {
    return c.json(fail(500, `刷新失败: ${(err as Error).message}`), 500);
  }
});
