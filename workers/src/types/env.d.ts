// Cloudflare Workers 环境变量类型定义
export interface Env {
  // D1 数据库
  DB: D1Database;
  // R2 存储桶
  R2_BUCKET: R2Bucket;
  // KV 命名空间
  KV: KVNamespace;
  // 环境变量
  JWT_SECRET: string;
  R2_PUBLIC_URL: string;
  FRONTEND_URL: string;
}
