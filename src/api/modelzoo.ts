import { proxyFetch } from './client';
import type { ModelDetail, ModelPrice } from '../types';

function getApiKey(): string {
  return localStorage.getItem('bizyair_api_key') || '';
}

function authHeaders(): Record<string, string> {
  const key = getApiKey();
  return key ? { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export async function fetchModelDetail(endpoint: string): Promise<ModelDetail> {
  return proxyFetch<{ code: number; data: ModelDetail }>(`/x/v1/modelzoo/detail/${endpoint}`)
    .then(r => r.data);
}

export async function fetchModelPrice(endpoint: string): Promise<ModelPrice | null> {
  try {
    const res = await fetch(`/api/x/v1/modelzoo/price_table/${endpoint}`);
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