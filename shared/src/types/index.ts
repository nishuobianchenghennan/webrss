// 用户相关类型
export interface User {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  settings: UserSettings;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  default_view: 'list' | 'card' | 'magazine' | 'compact';
  articles_per_page: number;
  mark_read_on_scroll: boolean;
  show_reading_time: boolean;
}

// 分类相关类型
export interface Category {
  id: string;
  user_id: string;
  parent_id?: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  sort_order: number;
  created_at: string;
  children?: Category[];
  feed_count?: number;
  unread_count?: number;
}

// 标签相关类型
export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
}

// 订阅源相关类型
export type FeedStatus = 'active' | 'paused' | 'error';
export type FeedType = 'rss' | 'atom' | 'json';

export interface Feed {
  id: string;
  user_id: string;
  category_id?: string;
  title: string;
  description?: string;
  site_url?: string;
  feed_url: string;
  favicon_url?: string;
  language?: string;
  feed_type: FeedType;
  status: FeedStatus;
  error_message?: string;
  error_count: number;
  fetch_interval: number;
  last_fetched_at?: string;
  last_published_at?: string;
  article_count: number;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface FeedWithCategory extends Feed {
  category?: Category;
}

// 文章相关类型
export interface Article {
  id: string;
  feed_id: string;
  user_id: string;
  guid: string;
  title: string;
  author?: string;
  summary?: string;
  content?: string;
  url?: string;
  cover_image_url?: string;
  word_count: number;
  reading_time: number;
  is_read: boolean;
  is_starred: boolean;
  is_pinned: boolean;
  read_progress: number;
  read_at?: string;
  starred_at?: string;
  published_at?: string;
  fetched_at: string;
}

export interface ArticleWithFeed extends Article {
  feed?: Feed;
  tags?: Tag[];
}

// API 请求/响应类型
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  records: T[];
  total: number;
  pageNum: number;
  pageSize: number;
}

// 文章查询参数
export interface ArticleQuery {
  feed_id?: string;
  category_id?: string;
  tag_id?: string;
  status?: 'all' | 'unread' | 'read' | 'starred' | 'pinned';
  search?: string;
  sort?: 'newest' | 'oldest' | 'feed';
  page?: number;
  limit?: number;
  since?: string;
}

// RSS发现类型
export interface DiscoveredFeed {
  title: string;
  feed_url: string;
  site_url?: string;
  description?: string;
  feed_type: FeedType;
}

// 认证类型
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// 批量操作类型
export interface BatchArticleOperation {
  article_ids: string[];
  action: 'read' | 'unread' | 'star' | 'unstar' | 'delete';
}

// OPML 类型
export interface OPMLOutline {
  title: string;
  text: string;
  type?: string;
  xmlUrl?: string;
  htmlUrl?: string;
  children?: OPMLOutline[];
}
