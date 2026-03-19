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
  'sup', 'sub', 'small', 'abbr', 'cite', 'q',
]);

// 允许的属性（全局）
const ALLOWED_ATTRS = new Set(['class', 'id', 'title', 'lang']);

// 特定标签允许的额外属性
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  blockquote: new Set(['cite']),
};

/**
 * 净化HTML内容，防止XSS攻击
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // 使用正则表达式处理HTML（Workers环境中没有DOMParser）
  // 移除脚本标签及其内容
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<input[\s\S]*?>/gi, '')
    .replace(/<button[\s\S]*?<\/button>/gi, '');

  // 移除所有on*事件属性
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // 移除javascript:协议
  clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  clean = clean.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, '');

  // 为外部链接添加target="_blank" rel="noopener noreferrer"
  clean = clean.replace(
    /<a\s([^>]*href\s*=\s*["']https?:\/\/[^"']*["'][^>]*)>/gi,
    (match, attrs) => {
      if (!attrs.includes('target=')) {
        return `<a ${attrs} target="_blank" rel="noopener noreferrer">`;
      }
      return match;
    }
  );

  return clean;
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
