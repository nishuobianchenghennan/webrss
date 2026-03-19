/**
 * RSS/Atom/JSON Feed 解析服务
 */

import { extractFirstImage, sanitizeHtml, generateSummary, countWords, estimateReadTime } from '../utils/html';

export interface ParsedFeed {
  title: string;
  description?: string;
  site_url?: string;
  language?: string;
  feed_type: 'rss' | 'atom' | 'json';
  items: ParsedItem[];
}

export interface ParsedItem {
  guid: string;
  title: string;
  author?: string;
  summary?: string;
  content?: string;
  url?: string;
  image?: string;
  pubDate?: string;
  word_count: number;
  reading_time: number;
}

/**
 * 解析Feed内容（自动检测RSS/Atom/JSON Feed）
 */
export function parseFeed(text: string, contentType?: string): ParsedFeed {
  // JSON Feed
  if (contentType?.includes('application/json') || text.trim().startsWith('{')) {
    try {
      return parseJsonFeed(text);
    } catch {
      // 回退到XML解析
    }
  }

  // XML Feed (RSS 或 Atom)
  return parseXmlFeed(text);
}

/**
 * 解析 JSON Feed (https://jsonfeed.org/)
 */
function parseJsonFeed(text: string): ParsedFeed {
  const json = JSON.parse(text);

  const items: ParsedItem[] = (json.items || []).map((item: Record<string, string>) => {
    const content = item.content_html || item.content_text || '';
    const summary = item.summary || generateSummary(content);
    const image = item.image || extractFirstImage(content);

    return {
      guid: item.id || item.url || String(Date.now()),
      title: item.title || '无标题',
      author: item.authors?.[0]?.name || item.author?.name,
      summary,
      content: sanitizeHtml(content),
      url: item.url,
      image: image || undefined,
      pubDate: item.date_published || item.date_modified,
      word_count: countWords(content),
      reading_time: estimateReadTime(content),
    };
  });

  return {
    title: json.title || '未命名订阅源',
    description: json.description,
    site_url: json.home_page_url,
    language: json.language,
    feed_type: 'json',
    items,
  };
}

/**
 * 解析 XML Feed（RSS 2.0 / Atom 1.0）
 */
function parseXmlFeed(text: string): ParsedFeed {
  // 检测是 RSS 还是 Atom（兼容带命名空间前缀的情况）
  const isAtom = text.includes('<feed') && (
    text.includes('xmlns="http://www.w3.org/2005/Atom"') ||
    text.includes("xmlns='http://www.w3.org/2005/Atom'") ||
    text.includes('xmlns:atom="http://www.w3.org/2005/Atom"')
  );

  if (isAtom) {
    return parseAtomFeed(text);
  }
  return parseRssFeed(text);
}

/**
 * 提取XML标签内容
 */
function extractTag(xml: string, tag: string): string {
  // 匹配带属性的标签
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) return match[1].trim();
  }
  return '';
}

/**
 * 提取XML属性值
 */
function extractAttr(xml: string, tag: string, attr: string): string {
  const pattern = new RegExp(`<${tag}[^>]*${attr}\\s*=\\s*["']([^"']*)["'][^>]*>`, 'i');
  const match = xml.match(pattern);
  return match ? match[1] : '';
}

/**
 * 解析 RSS 2.0
 */
function parseRssFeed(xml: string): ParsedFeed {
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  const channelXml = channelMatch ? channelMatch[1] : xml;

  // 移除item标签之前的部分来提取频道信息
  const channelInfoXml = channelXml.replace(/<item[\s\S]*?<\/item>/gi, '');

  const title = extractTag(channelInfoXml, 'title') || '未命名订阅源';
  const description = extractTag(channelInfoXml, 'description');
  const site_url = extractTag(channelInfoXml, 'link');
  const language = extractTag(channelInfoXml, 'language');

  // 提取所有 <item>
  const itemMatches = [...channelXml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)];

  const items: ParsedItem[] = itemMatches.map(match => {
    const itemXml = match[1];
    const content = extractTag(itemXml, 'content:encoded') ||
      extractTag(itemXml, 'description') || '';
    const summary = extractTag(itemXml, 'description') || generateSummary(content);

    // 提取图片：优先使用enclosure或media:content
    const enclosureUrl = extractAttr(itemXml, 'enclosure', 'url');
    const mediaUrl = extractAttr(itemXml, 'media:content', 'url');
    const image = enclosureUrl || mediaUrl || extractFirstImage(content);

    // GUID: 优先使用<guid>，其次用<link>，最后用标题哈希（保证稳定性，防止重复插入）
    const rawGuid = extractTag(itemXml, 'guid') || extractTag(itemXml, 'link');
    const guid = rawGuid || `hash:${extractTag(itemXml, 'title')}:${extractTag(itemXml, 'pubDate')}`;

    return {
      guid,
      title: extractTag(itemXml, 'title') || '无标题',
      author: extractTag(itemXml, 'author') ||
        extractTag(itemXml, 'dc:creator'),
      summary: sanitizeHtml(summary),
      content: sanitizeHtml(content),
      url: extractTag(itemXml, 'link'),
      image: image || undefined,
      pubDate: extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'dc:date'),
      word_count: countWords(content),
      reading_time: estimateReadTime(content),
    };
  });

  return {
    title,
    description,
    site_url,
    language,
    feed_type: 'rss',
    items,
  };
}

/**
 * 解析 Atom 1.0
 */
function parseAtomFeed(xml: string): ParsedFeed {
  const title = extractTag(xml, 'title') || '未命名订阅源';
  const description = extractTag(xml, 'subtitle');

  // 提取 <link rel="alternate"> 作为网站地址
  const altLinkMatch = xml.match(/<link[^>]*rel\s*=\s*["']alternate["'][^>]*href\s*=\s*["']([^"']*)["']/i) ||
    xml.match(/<link[^>]*href\s*=\s*["']([^"']*)["'][^>]*rel\s*=\s*["']alternate["']/i);
  const site_url = altLinkMatch ? altLinkMatch[1] : '';

  const language = extractAttr(xml, 'feed', 'xml:lang') || extractTag(xml, 'language');

  // 提取所有 <entry>
  const entryMatches = [...xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi)];

  const items: ParsedItem[] = entryMatches.map(match => {
    const entryXml = match[1];
    const content = extractTag(entryXml, 'content') || extractTag(entryXml, 'summary') || '';
    const summary = extractTag(entryXml, 'summary') || generateSummary(content);
    const image = extractFirstImage(content);

    // 提取链接
    const linkMatch = entryXml.match(/<link[^>]*rel\s*=\s*["']alternate["'][^>]*href\s*=\s*["']([^"']*)["']/i) ||
      entryXml.match(/<link[^>]*href\s*=\s*["']([^"']*)["']/i);
    const url = linkMatch ? linkMatch[1] : '';

    // Atom entry 的 id 是稳定标识符，回退到 url，最后用标题+日期哈希保证稳定性
    const rawId = extractTag(entryXml, 'id') || url;
    const guid = rawId || `hash:${extractTag(entryXml, 'title')}:${extractTag(entryXml, 'published')}`;

    // 提取作者
    const authorXml = entryXml.match(/<author[^>]*>([\s\S]*?)<\/author>/i)?.[1] || '';
    const author = extractTag(authorXml, 'name') || extractTag(entryXml, 'author');

    return {
      guid,
      title: extractTag(entryXml, 'title') || '无标题',
      author,
      summary: sanitizeHtml(summary),
      content: sanitizeHtml(content),
      url,
      image: image || undefined,
      pubDate: extractTag(entryXml, 'published') || extractTag(entryXml, 'updated'),
      word_count: countWords(content),
      reading_time: estimateReadTime(content),
    };
  });

  return {
    title,
    description,
    site_url,
    language,
    feed_type: 'atom',
    items,
  };
}
