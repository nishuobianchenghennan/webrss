/**
 * 客户端 HTML 清洗工具
 * 在浏览器 DOM 中解析并清洗文章 HTML，去除微信等来源的推广/噪声内容
 */

// 需要完整移除的 class 或 id（微信公众号常见噪声元素）
const REMOVE_SELECTORS = [
  '.mp_profile_iframe_wrp',  // 公众号关注卡片
  '.media_tool_meta',        // 原文链接区域
  'p[style*="display: none"]', // 隐藏段落
  'p[style*="display:none"]',
];

// 需要移除的文本内容特征（结尾推广文案）
const REMOVE_TEXT_PATTERNS = [
  /⭐.*?⭐/s,
  /星标.*?不错过/,
  /觉得好看.*?在看/,
  /本文不构成个人投资建议/,
];

/**
 * 清洗文章 HTML，返回净化后的 HTML 字符串
 * 利用浏览器内置 DOMParser，不依赖第三方库
 */
export function cleanArticleHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html;

  // 使用 DOMParser 在沙箱中解析，不会执行脚本
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const body = doc.body;

  // 1. 移除已知噪声选择器
  REMOVE_SELECTORS.forEach(selector => {
    body.querySelectorAll(selector).forEach(el => el.remove());
  });

  // 2. 移除包含推广文本的段落/section
  body.querySelectorAll('p, section, div').forEach(el => {
    const text = el.textContent || '';
    if (REMOVE_TEXT_PATTERNS.some(p => p.test(text))) {
      el.remove();
    }
  });

  // 3. 移除尾部跟踪图片（1x1 像素）
  body.querySelectorAll('img').forEach(img => {
    const w = img.getAttribute('width');
    const h = img.getAttribute('height');
    const style = img.getAttribute('style') || '';
    if (
      (w === '1' || w === '1px') ||
      (h === '1' || h === '1px') ||
      style.includes('width: 1px') ||
      style.includes('display: none')
    ) {
      img.remove();
    }
  });

  // 4. 移除空的 section/div（只剩 <br> 或纯空白）
  body.querySelectorAll('section, div').forEach(el => {
    const inner = el.innerHTML.replace(/<br\s*\/?>/gi, '').trim();
    if (!inner) el.remove();
  });

  return body.innerHTML;
}
