/**
 * 客户端 HTML 清洗工具
 * 在浏览器 DOM 中解析并清洗文章 HTML，去除微信等来源的推广/噪声内容
 */

// 需要完整移除的选择器（微信公众号常见噪声元素）
const REMOVE_SELECTORS = [
  '.mp_profile_iframe_wrp',          // 公众号关注卡片
  '.media_tool_meta',                // 原文链接区域（旧版 class）
  'a.media_tool_meta',               // 原文链接 <a> 变体
  '[class*="media_tool_meta"]',      // class 含 media_tool_meta 的任意元素
  'p[style*="display: none"]',       // 隐藏段落
  'p[style*="display:none"]',
  '[style*="display: none"]',
  '[style*="display:none"]',
];

// 需要移除的文本内容特征（结尾推广文案）
// 仅对短文本节点（< 200 字）生效，避免误删包含全文的容器
const REMOVE_TEXT_PATTERNS: RegExp[] = [
  /\u2b50/,
  /\u26a1/,
  /星标.*?不错过/s,
  /觉得好看.*?在看/s,
  /本文不构成个人投资建议/,
  /点.{0,4}在看/,
];

/**
 * 解码 HTML 实体（客户端版本，用于数据库内容二次编码的场景）
 */
function decodeEntities(str: string): string {
  if (!str || typeof document === 'undefined') return str;
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

/**
 * 构造 iframe srcdoc 内容，将文章 HTML 包裹为完整页面
 * iframe 拥有独立 document，原始行内样式和微信 CSS 完全生效
 */
export function buildIframeSrcDoc(html: string, darkMode = false): string {
  // 数据库存储时内容可能被二次 HTML 实体编码，先解码还原为真实 HTML
  const decoded = decodeEntities(html);
  const cleaned = cleanArticleHtml(decoded);
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: ${darkMode ? '#16130f' : '#faf9f7'};
    color: ${darkMode ? '#f5f3ef' : '#1a1714'};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif;
    font-size: 15px;
    line-height: 1.75;
    word-break: break-word;
  }
  body { padding: 0 4px 32px; }
  img { max-width: 100%; height: auto; border-radius: 6px; }
  a { color: ${darkMode ? '#818cf8' : '#444ce7'}; }
  pre, code {
    background: ${darkMode ? '#27231b' : '#f3f1ec'};
    border-radius: 4px;
    padding: 2px 5px;
    font-size: 0.9em;
  }
  pre { padding: 12px; overflow-x: auto; }
  blockquote {
    margin: 0; padding-left: 1em;
    border-left: 3px solid ${darkMode ? '#3a3328' : '#d6d0c4'};
    color: ${darkMode ? '#9a8f7e' : '#7d7060'};
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid ${darkMode ? '#3a3328' : '#d6d0c4'}; padding: 6px 10px; }
  /* 修正微信常见的 margin/padding 过大问题 */
  section { margin: 0 !important; padding: 0 !important; }
</style>
</head>
<body>${cleaned}</body>
</html>`;
}

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
    try {
      body.querySelectorAll(selector).forEach(el => el.remove());
    } catch {
      // 忽略无效选择器
    }
  });

  // 2. 移除包含推广文本的短文本节点
  // 限制在 < 200 字的叶子级节点，防止误删包含全文内容的容器
  body.querySelectorAll('p, li, span, section, div').forEach(el => {
    if (!el.isConnected) return;
    const text = (el.textContent || '').trim();
    if (text.length > 0 && text.length < 200 && REMOVE_TEXT_PATTERNS.some(p => p.test(text))) {
      el.remove();
    }
  });

  // 3. 移除尾部跟踪图片（1x1 像素或隐藏图片）
  body.querySelectorAll('img').forEach(img => {
    const w = img.getAttribute('width');
    const h = img.getAttribute('height');
    const style = img.getAttribute('style') || '';
    const src = img.getAttribute('src') || '';
    if (
      (w === '1' || w === '1px') ||
      (h === '1' || h === '1px') ||
      style.includes('width: 1px') ||
      style.includes('height: 1px') ||
      style.includes('display: none') ||
      style.includes('display:none') ||
      // 常见统计像素路径特征
      /\/rss_static\/|tracking|pixel|beacon/i.test(src)
    ) {
      img.remove();
    }
  });

  // 4. 移除空的 section/div（只剩 <br> 或纯空白）
  body.querySelectorAll('section, div').forEach(el => {
    if (!el.isConnected) return;
    const inner = el.innerHTML.replace(/<br\s*\/?>/gi, '').trim();
    if (!inner) el.remove();
  });

  return body.innerHTML;
}
