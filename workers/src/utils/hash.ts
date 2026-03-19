/**
 * ID生成工具 - 使用crypto.randomUUID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 生成URL的哈希值，用于R2缓存key
 */
export async function hashUrl(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

/**
 * 对密码进行哈希（使用Web Crypto API）
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}
