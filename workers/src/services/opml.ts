/**
 * OPML 导入导出服务
 */

import type { OPMLOutline } from '@rss-plus/shared';

/**
 * 解析 OPML 文件内容
 */
export function parseOPML(xml: string): OPMLOutline[] {
  const bodyMatch = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return [];

  return parseOutlines(bodyMatch[1]);
}

function parseOutlines(xml: string): OPMLOutline[] {
  const results: OPMLOutline[] = [];
  // 匹配顶层 outline（非嵌套）
  const pattern = /<outline([^>]*?)(?:\/>|>([\s\S]*?)<\/outline>)/gi;
  const matches = [...xml.matchAll(pattern)];

  for (const match of matches) {
    const attrs = match[1];
    const innerXml = match[2] || '';

    const outline: OPMLOutline = {
      title: extractAttr(attrs, 'title') || extractAttr(attrs, 'text') || '',
      text: extractAttr(attrs, 'text') || extractAttr(attrs, 'title') || '',
      type: extractAttr(attrs, 'type') || undefined,
      xmlUrl: extractAttr(attrs, 'xmlUrl') || undefined,
      htmlUrl: extractAttr(attrs, 'htmlUrl') || undefined,
    };

    if (innerXml.trim()) {
      outline.children = parseOutlines(innerXml);
    }

    results.push(outline);
  }

  return results;
}

function extractAttr(attrs: string, name: string): string {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  const match = attrs.match(pattern);
  return match ? match[1] : '';
}

/**
 * 生成 OPML 文件内容
 */
export function generateOPML(
  outlines: OPMLOutline[],
  title = 'RSS Plus 订阅列表'
): string {
  const date = new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
    <dateCreated>${date}</dateCreated>
    <dateModified>${date}</dateModified>
  </head>
  <body>
${renderOutlines(outlines, 2)}
  </body>
</opml>`;
}

function renderOutlines(outlines: OPMLOutline[], indent: number): string {
  const spaces = ' '.repeat(indent);
  return outlines
    .map(o => {
      const attrs = [
        `text="${escapeXml(o.text)}"`,
        `title="${escapeXml(o.title)}"`,
        o.type ? `type="${escapeXml(o.type)}"` : '',
        o.xmlUrl ? `xmlUrl="${escapeXml(o.xmlUrl)}"` : '',
        o.htmlUrl ? `htmlUrl="${escapeXml(o.htmlUrl)}"` : '',
      ]
        .filter(Boolean)
        .join(' ');

      if (o.children && o.children.length > 0) {
        return `${spaces}<outline ${attrs}>\n${renderOutlines(o.children, indent + 2)}\n${spaces}</outline>`;
      }
      return `${spaces}<outline ${attrs}/>`;
    })
    .join('\n');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
