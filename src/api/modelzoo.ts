import type { ModelDetail, ModelPrice } from '../types';

function getApiKey(): string {
  return localStorage.getItem('bizyair_api_key') || '';
}

function authHeaders(): Record<string, string> {
  const key = getApiKey();
  return key ? { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiGet<T>(path: string): Promise<{ code: number; data: T; message?: string }> {
  const res = await fetch(path, { headers: authHeaders() });
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  return res.json();
}

export async function fetchModelDetail(endpoint: string): Promise<ModelDetail> {
  const candidates = [endpoint];
  const parts = endpoint.split('/');
  const modelName = parts[0];
  const suffix = parts.slice(1).join('/');
  // model name only
  if (modelName && modelName !== endpoint) candidates.push(modelName);
  // try with -base suffix (catalog may have stale name)
  if (suffix && !modelName.endsWith('-base')) candidates.push(`${modelName}-base/${suffix}`);
  // deduplicate
  const seen = new Set<string>();
  for (const ep of candidates) {
    if (seen.has(ep)) continue; seen.add(ep);
    try {
      const r = await apiGet<ModelDetail>(`/x/v1/modelzoo/detail/${ep}`);
      if (r.code === 20000) return r.data;
    } catch { /* try next candidate */ }
  }
  throw new Error(`请求失败 (404)`);
}

export async function fetchModelPrice(endpoint: string): Promise<ModelPrice | null> {
  try {
    const res = await fetch(`/x/v1/modelzoo/price_table/${endpoint}`, { headers: authHeaders() });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch { return null; }
}

export async function createTask(endpoint: string, inputValues: Record<string, unknown>) {
  const res = await fetch(`/x/v1/modelzoo/tasks/openapi/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(inputValues),
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  const data = await res.json();
  if (data.code !== 20000) throw new Error(data.message || '请求失败');
  return data.data;
}

export async function pollTask(requestId: string): Promise<TaskResponse> {
  const res = await fetch(`/x/v1/modelzoo/tasks/openapi/${requestId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  const data = await res.json();
  // 不论任务成功还是失败，都返回data.data
  // 调用方需要根据data.data.status判断任务状态
  if (data.code !== 20000) {
    // API返回错误，但可能包含任务信息
    console.error('API返回错误:', data.message);
    throw new Error(data.message || '请求失败');
  }
  return data.data as TaskResponse;
}

export { proxyFetch } from './client';