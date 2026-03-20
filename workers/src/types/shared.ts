// 从 shared 包内联的类型，避免 workspace 依赖

export type FeedType = 'rss' | 'atom' | 'json';

export interface DiscoveredFeed {
  title: string;
  feed_url: string;
  site_url?: string;
  description?: string;
  feed_type: FeedType;
}

export interface OPMLOutline {
  title: string;
  text: string;
  type?: string;
  xmlUrl?: string;
  htmlUrl?: string;
  children?: OPMLOutline[];
}
