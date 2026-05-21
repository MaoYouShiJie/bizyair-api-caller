const BACKEND = '';

async function api(path: string, opts?: RequestInit) {
  const r = await fetch(BACKEND + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export interface HistoryRecord {
  id: string;
  formValues: Record<string, unknown>;
  outputs: Record<string, string[]>;
  taskId: string;
  timestamp: string;
}

export async function loadHistory(endpoint: string): Promise<HistoryRecord[]> {
  const data = await api(`/api/history/${encodeURIComponent(endpoint)}`);
  return data.records || [];
}

export async function saveHistory(endpoint: string, formValues: Record<string, unknown>, outputs: Record<string, string[]>, taskId: string): Promise<void> {
  await api(`/api/history/${encodeURIComponent(endpoint)}`, {
    method: 'POST',
    body: JSON.stringify({ formValues, outputs, taskId }),
  });
}

export async function deleteHistory(endpoint: string, id: string): Promise<void> {
  await api(`/api/history/${encodeURIComponent(endpoint)}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
