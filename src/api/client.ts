let _cachedKey: string | null = null;

export async function loadApiKeyFromBackend(): Promise<string> {
  if (_cachedKey) return _cachedKey;
  try {
    const res = await fetch('/api/config/api-key');
    const data = await res.json();
    if (data.apiKey) {
      localStorage.setItem('bizyair_api_key', data.apiKey);
      _cachedKey = data.apiKey;
      return data.apiKey;
    }
  } catch {}
  const local = localStorage.getItem('bizyair_api_key');
  if (local) { _cachedKey = local; return local; }
  return '';
}

function getApiKey(): string {
  if (_cachedKey) return _cachedKey;
  const local = localStorage.getItem('bizyair_api_key');
  if (local) { _cachedKey = local; return local; }
  return '';
}

export async function proxyFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  const data = await res.json();
  if (data.code !== 20000) throw new Error(data.message || '请求失败');
  return data;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const apiKey = getApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  const res = await fetch(`https://api.bizyair.cn${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`请求失败 (${res.status})`);
  const data = await res.json();
  if (data.code !== 20000) throw new Error(data.message || '请求失败');
  return data;
}
