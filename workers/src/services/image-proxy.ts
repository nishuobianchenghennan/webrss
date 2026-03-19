/**
 * 图片代理与R2缓存服务
 */

import type { Env } from '../types/env';
import { hashUrl } from '../utils/hash';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
]);

/**
 * 代理并缓存图片到R2
 * 返回R2公开URL，失败则返回原始URL
 */
export async function proxyAndCacheImage(
  imageUrl: string,
  env: Env
): Promise<string> {
  if (!imageUrl || !imageUrl.startsWith('http')) return imageUrl;

  try {
    const urlHash = await hashUrl(imageUrl);
    const key = `images/${urlHash}`;

    // 检查R2是否已缓存
    const existing = await env.R2_BUCKET.head(key);
    if (existing) {
      return `${env.R2_PUBLIC_URL}/${key}`;
    }

    // 下载图片
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'RSSPlus/1.0 Image Proxy' },
    });

    if (!response.ok) return imageUrl;

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // 只缓存图片类型
    const baseContentType = contentType.split(';')[0].trim();
    if (!IMAGE_CONTENT_TYPES.has(baseContentType)) return imageUrl;

    const body = await response.arrayBuffer();

    // 限制大小
    if (body.byteLength > MAX_IMAGE_SIZE) return imageUrl;

    // 上传到R2
    await env.R2_BUCKET.put(key, body, {
      httpMetadata: { contentType: baseContentType },
      customMetadata: {
        originalUrl: imageUrl,
        cachedAt: new Date().toISOString(),
      },
    });

    return `${env.R2_PUBLIC_URL}/${key}`;
  } catch {
    return imageUrl;
  }
}

/**
 * 批量代理图片
 */
export async function proxyImages(
  urls: (string | undefined | null)[],
  env: Env
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const validUrls = urls.filter((url): url is string => Boolean(url));

  await Promise.allSettled(
    validUrls.map(async url => {
      const cached = await proxyAndCacheImage(url, env);
      result.set(url, cached);
    })
  );

  return result;
}

/**
 * 获取favicon并缓存到R2
 */
export async function cacheFavicon(siteUrl: string, env: Env): Promise<string | null> {
  try {
    const url = new URL(siteUrl);
    const faviconUrl = `${url.protocol}//${url.hostname}/favicon.ico`;
    const cached = await proxyAndCacheImage(faviconUrl, env);
    return cached !== faviconUrl ? cached : null;
  } catch {
    return null;
  }
}
