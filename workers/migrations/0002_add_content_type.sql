-- ==========================================
-- Migration: 0002_add_content_type.sql
-- 向 articles 表添加 content_type 列
-- 取值：'full'（有完整正文）| 'summary'（仅摘要）| 'empty'（无内容）
-- ==========================================

ALTER TABLE articles ADD COLUMN content_type TEXT DEFAULT 'empty';

-- 对已有数据按实际情况回填
UPDATE articles
  SET content_type = CASE
    WHEN content IS NOT NULL AND length(content) > 200 THEN 'full'
    WHEN summary IS NOT NULL AND length(summary) > 0 THEN 'summary'
    ELSE 'empty'
  END;
