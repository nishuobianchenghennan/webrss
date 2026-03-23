/**
 * 简单的HTML净化工具
 * 移除危险标签和属性，保留安全的HTML结构
 */

// 允许的标签
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span', 'section', 'article', 'aside',
  'sup', 'sub', 'small', 'abbr', 'cite', 'q', 'mark',
]);

// 允许的属性（全局）
const ALLOWED_ATTRS = new Set(['class', 'id', 'title', 'lang', 'style']);

// 危险的 style 属性值模式（CSS 注入 / XSS）
const DANGEROUS_STYLE_PATTERN = /expression|javascript|behaviour|vbscript|@import|binding/gi;

// 特定标签允许的额外属性
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  blockquote: new Set(['cite']),
};

/**
 * 解码 HTML 实体（用于 XML 非 CDATA 包裹的内容）
 * Workers 环境无 DOM，手动处理常见实体
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, '\u00a0')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * 净化HTML内容，防止XSS攻击
 * 先黑名单移除危险标签/属性，再白名单过滤非允许标签（保留内容）
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // 第一步：移除有内容的危险标签（含其内部内容）
  // 同时移除 RSS 文章头部语义标签：address（作者）、time（日期）、footer（文章脚注）
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<input[\s\S]*?>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '')
    .replace(/<canvas[\s\S]*?<\/canvas>/gi, '')
    .replace(/<video[\s\S]*?<\/video>/gi, '')
    .replace(/<audio[\s\S]*?<\/audio>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<template[\s\S]*?<\/template>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<address[\s\S]*?<\/address>/gi, '')
    .replace(/<time[\s\S]*?<\/time>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // 第二步：移除所有 on* 事件属性
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // 第三步：白名单过滤属性
  // 匹配所有 HTML 开始标签，对每个标签进行属性过滤
  clean = clean.replace(/<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g, (match, tagName: string, attrsStr: string) => {
    const tag = tagName.toLowerCase();

    // 非白名单标签：保留内容但移除标签本身（相当于 unwrap）
    if (!ALLOWED_TAGS.has(tag)) {
      return '';
    }

    // 对白名单标签：过滤属性
    const allowedForTag = TAG_ATTRS[tag];
    const filteredAttrs = attrsStr.replace(
      /\s+([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/g,
      (attrMatch, attrName: string, attrValue: string) => {
        const attr = attrName.toLowerCase();
        if (!ALLOWED_ATTRS.has(attr) && !(allowedForTag?.has(attr))) {
          return '';
        }
        // style 属性额外过滤危险值
        if (attr === 'style') {
          const styles = attrValue.replace(/^["']|["']$/g, '');
          if (DANGEROUS_STYLE_PATTERN.test(styles)) {
            DANGEROUS_STYLE_PATTERN.lastIndex = 0;
            return '';
          }
          DANGEROUS_STYLE_PATTERN.lastIndex = 0;
          const cleaned = styles
            .replace(/margin-left\s*:[^;]+;?/gi, '')
            .replace(/margin-right\s*:[^;]+;?/gi, '')
            .trim();
          return cleaned ? ` style="${cleaned}"` : '';
        }
        // href/src 移除 javascript: 协议
        if (attr === 'href' || attr === 'src') {
          const val = attrValue.replace(/^["']|["']$/g, '');
          if (/^javascript:/i.test(val)) return '';
        }
        return attrMatch;
      }
    );

    // 为外部 <a> 链接补充 target 和 rel
    if (tag === 'a' && !filteredAttrs.includes('target=')) {
      const hrefMatch = filteredAttrs.match(/href\s*=\s*["']https?:\/\//i);
      if (hrefMatch) {
        return `<${tag}${filteredAttrs} target="_blank" rel="noopener noreferrer">`;
      }
    }

    return `<${tag}${filteredAttrs}>`;
  });

  // 第四步：清理非白名单的闭合标签
  clean = clean.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g, (match, tagName: string) => {
    return ALLOWED_TAGS.has(tagName.toLowerCase()) ? match : '';
  });

  return clean;
}

/**
 * 识别文章内容类型
 * - 'full'：有完整正文（净化后文本超过 200 字）
 * - 'summary'：仅有摘要/简介
 * - 'empty'：无任何文字内容
 */
export type ContentType = 'full' | 'summary' | 'empty';

export function identifyContentType(content: string | undefined, summary: string | undefined): ContentType {
  if (content) {
    const text = extractText(content);
    if (text.length > 200) return 'full';
  }
  if (summary) {
    const text = extractText(summary);
    if (text.length > 0) return 'summary';
  }
  return 'empty';
}

/**
 * 将各种格式的日期字符串归一化为 ISO 8601 字符串
 * 支持 RFC 2822（RSS）、ISO 8601（Atom/JSON Feed）以及常见变体
 * 解析失败返回 null
 */
export function normalizePubDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 尝试 Date 构造器（覆盖 ISO 8601 和 RFC 2822）
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  // 处理常见非标准格式："DD Mon YYYY HH:MM:SS" 无时区
  const cleanedNoTz = trimmed.replace(/\s*(\+|-)\d{4}$/, '');
  const fallback = new Date(cleanedNoTz);
  if (!isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  return null;
}

/**
 * 从HTML中提取纯文本，用于摘要生成
 */
export function extractText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 从HTML中提取第一张图片URL
 */
export function extractFirstImage(html: string): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/**
 * 计算文章字数（支持中英文混合）
 */
export function countWords(content: string): number {
  const text = extractText(content);
  // 中文字符数
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  // 英文单词数
  const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').trim().split(/\s+/).filter(Boolean).length;
  return chineseChars + englishWords;
}

/**
 * 预估阅读时间（秒）
 * 中文阅读速度约500字/分钟，英文约200词/分钟
 */
export function estimateReadTime(content: string): number {
  const wordCount = countWords(content);
  return Math.ceil((wordCount / 400) * 60); // 综合取400字/分钟
}

/**
 * 生成文章摘要
 */
export function generateSummary(content: string, maxLength = 200): string {
  const text = extractText(content);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}
