/**
 * JWT 认证中间件
 */

import type { Context, Next } from 'hono';
import type { Env } from '../types/env';
import { fail } from '../utils/response';

/**
 * 解析并验证 JWT Token
 */
async function verifyJWT(token: string, secret: string): Promise<{ userId: string; username: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // 验证签名
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlDecode(signatureB64);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify('HMAC', key, signature, data);
    if (!valid) return null;

    // 解析 payload
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

    // 检查过期时间
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { userId: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

/**
 * 生成 JWT Token
 */
export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn = 7 * 24 * 3600 // 默认7天
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  const signatureB64 = base64UrlEncode(new Uint8Array(signature));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

function base64UrlEncode(data: string | Uint8Array): string {
  let binary: string;
  if (typeof data === 'string') {
    binary = btoa(unescape(encodeURIComponent(data)));
  } else {
    binary = btoa(String.fromCharCode(...data));
  }
  return binary.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * 认证中间件 - 验证 JWT Token
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next
) {
  const authorization = c.req.header('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return c.json(fail(401, '未认证，请先登录'), 401);
  }

  const token = authorization.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json(fail(401, 'Token无效或已过期'), 401);
  }

  c.set('userId', payload.userId);
  c.set('username', payload.username);
  await next();
}
