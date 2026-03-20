/**
 * RSS源自动发现服务
 */

import { parseFeed } from './feed-parser';
import type { DiscoveredFeed } from '../types/shared';

/**
 * 从URL自动发现RSS/Atom源
 */
export async function discoverFeeds(url: string): Promise<DiscoveredFeed[]> {
  // 策略1: 直接尝试解析URL为feed
  const directResult = await tryParseFeedUrl(url);
  if (directResult) return [directResult];

  // 策略2: 抓取HTML页面，查找<link rel="alternate">
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RSSPlus/1.0 Feed Discoverer' },
      redirect: 'follow',
    });
    const html = await response.text();
    const linkFeeds = await extractFeedLinksFromHtml(html, url);
    if (linkFeeds.length > 0) return linkFeeds;
  } catch {
    // 忽略错误，继续探测
  }

  // 策略3: 常见路径探测
  const commonPaths = [
    '/feed',
    '/rss',
    '/atom.xml',
    '/feed.xml',
    '/rss.xml',
    '/index.xml',
    '/feed.json',
    '/feeds/posts/default', // Blogger
    '/?feed=rss2',          // WordPress
    '/wp-json/wp/v2/posts', // WordPress REST API（不是真正的RSS，仅探测）
  ];

  const results: DiscoveredFeed[] = [];
  for (const path of commonPaths) {
    try {
      const feedUrl = new URL(path, url).href;
      const discovered = await tryParseFeedUrl(feedUrl);
      if (discovered) {
        results.push(discovered);
        break; // 找到一个就停止
      }
    } catch {
      // 继续下一个
    }
  }

  return results;
}

/**
 * 尝试解析URL为Feed
 */
async function tryParseFeedUrl(url: string): Promise<DiscoveredFeed | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RSSPlus/1.0 Feed Discoverer' },
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    const isFeedContentType =
      contentType.includes('application/rss+xml') ||
      contentType.includes('application/atom+xml') ||
      contentType.includes('application/feed+json') ||
      contentType.includes('application/json') ||
      contentType.includes('text/xml') ||
      contentType.includes('application/xml');

    if (!isFeedContentType) return null;

    const text = await response.text();
    const parsed = parseFeed(text, contentType);

    // 验证是否有文章
    if (parsed.items.length === 0 && !parsed.title) return null;

    return {
      title: parsed.title,
      feed_url: url,
      site_url: parsed.site_url,
      description: parsed.description,
      feed_type: parsed.feed_type,
    };
  } catch {
    return null;
  }
}

/**
 * 从HTML中提取Feed链接
 */
async function extractFeedLinksFromHtml(
  html: string,
  baseUrl: string
): Promise<DiscoveredFeed[]> {
  const results: DiscoveredFeed[] = [];

  // 匹配 <link rel="alternate" type="application/rss+xml" ...>
  const linkPattern = /<link[^>]+rel\s*=\s*["']alternate["'][^>]+>/gi;
  const matches = [...html.matchAll(linkPattern)];

  for (const match of matches) {
    const linkTag = match[0];
    const typeMatch = linkTag.match(/type\s*=\s*["']([^"']+)["']/i);
    const hrefMatch = linkTag.match(/href\s*=\s*["']([^"']+)["']/i);
    const titleMatch = linkTag.match(/title\s*=\s*["']([^"']+)["']/i);

    if (!hrefMatch) continue;

    const type = typeMatch?.[1] || '';
    const isFeedType =
      type.includes('rss') ||
      type.includes('atom') ||
      type.includes('feed+json');

    if (!isFeedType) continue;

    const feedUrl = new URL(hrefMatch[1], baseUrl).href;
    const feedType = type.includes('atom') ? 'atom' : type.includes('json') ? 'json' : 'rss';

    results.push({
      title: titleMatch?.[1] || '发现的订阅源',
      feed_url: feedUrl,
      site_url: baseUrl,
      feed_type: feedType,
    });
  }

  return results;
}
