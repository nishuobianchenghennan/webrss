/**
 * 统一响应工具
 */

export function success<T>(data: T, message = '操作成功') {
  return {
    code: 200,
    message,
    data,
    timestamp: Date.now(),
  };
}

export function fail(code: number, message: string, data: unknown = null) {
  return {
    code,
    message,
    data,
    timestamp: Date.now(),
  };
}

export function paginated<T>(
  records: T[],
  total: number,
  pageNum: number,
  pageSize: number
) {
  return success({ records, total, pageNum, pageSize });
}
