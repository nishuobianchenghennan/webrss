/**
 * 认证路由
 */

import { Hono } from 'hono';
import type { Env } from '../types/env';
import { success, fail } from '../utils/response';
import { generateId, hashPassword, verifyPassword } from '../utils/hash';
import { signJWT } from '../middleware/auth';

export const authRoutes = new Hono<{ Bindings: Env }>();

// 注册
authRoutes.post('/register', async (c) => {
  const { username, password, email } = await c.req.json();

  if (!username || !password) {
    return c.json(fail(400, '用户名和密码不能为空'), 400);
  }

  if (password.length < 6) {
    return c.json(fail(400, '密码不能少于6位'), 400);
  }

  // 检查用户名是否已存在
  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE username = ?'
  ).bind(username).first();

  if (existing) {
    return c.json(fail(400, '用户名已存在'), 400);
  }

  const id = generateId();
  const passwordHash = await hashPassword(password);
  const defaultSettings = JSON.stringify({
    theme: 'system',
    language: 'zh-CN',
    default_view: 'list',
    articles_per_page: 20,
    mark_read_on_scroll: false,
    show_reading_time: true,
  });

  await c.env.DB.prepare(
    `INSERT INTO users (id, username, password_hash, email, settings)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, username, passwordHash, email || null, defaultSettings).run();

  const token = await signJWT(
    { sub: id, username },
    c.env.JWT_SECRET
  );

  return c.json(success({
    token,
    user: { id, username, email, settings: JSON.parse(defaultSettings) },
  }, '注册成功'), 201);
});

// 登录
authRoutes.post('/login', async (c) => {
  const { username, password } = await c.req.json();

  if (!username || !password) {
    return c.json(fail(400, '用户名和密码不能为空'), 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE username = ?'
  ).bind(username).first<Record<string, string>>();

  if (!user) {
    return c.json(fail(401, '用户名或密码错误'), 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json(fail(401, '用户名或密码错误'), 401);
  }

  const token = await signJWT(
    { sub: user.id, username: user.username },
    c.env.JWT_SECRET
  );

  return c.json(success({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      settings: JSON.parse(user.settings || '{}'),
    },
  }, '登录成功'));
});

// 登出（客户端删除Token即可，服务端可加入黑名单）
authRoutes.post('/logout', (c) => {
  return c.json(success(null, '已退出登录'));
});

// 获取当前用户信息（需要中间件注入 userId）
authRoutes.get('/me', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json(fail(401, '未认证'), 401);

  const user = await c.env.DB.prepare(
    'SELECT id, username, email, avatar_url, settings, created_at FROM users WHERE id = ?'
  ).bind(userId).first<Record<string, string>>();

  if (!user) return c.json(fail(404, '用户不存在'), 404);

  return c.json(success({
    ...user,
    settings: JSON.parse(user.settings || '{}'),
  }));
});

// 修改密码
authRoutes.put('/password', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json(fail(401, '未认证'), 401);

  const { old_password, new_password } = await c.req.json();

  if (!old_password || !new_password) {
    return c.json(fail(400, '请填写旧密码和新密码'), 400);
  }

  if (new_password.length < 6) {
    return c.json(fail(400, '新密码不能少于6位'), 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT password_hash FROM users WHERE id = ?'
  ).bind(userId).first<{ password_hash: string }>();

  if (!user) return c.json(fail(404, '用户不存在'), 404);

  const valid = await verifyPassword(old_password, user.password_hash);
  if (!valid) return c.json(fail(400, '旧密码错误'), 400);

  const newHash = await hashPassword(new_password);
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(newHash, userId).run();

  return c.json(success(null, '密码修改成功'));
});
