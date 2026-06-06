declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      selectFolder: () => Promise<{ success: boolean; folder?: string; error?: string }>;
    };
  }
}

export async function pickSaveDir(): Promise<string | null> {
  if (window.electronAPI) {
    const result = await window.electronAPI.selectFolder();
    if (result.success && result.folder) {
      localStorage.setItem('bizyair_save_path', result.folder);
      return result.folder;
    }
    return null;
  }
  return null;
}

export async function saveOutputs(outputs: Record<string, string[]>, modelName: string): Promise<{ saved: number; localOutputs: Record<string, string[]> }> {
  try {
    const res = await fetch('/api/save-outputs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputs, app_name: modelName }),
    });
    const data = await res.json();
    const localOutputs: Record<string, string[]> = {};
    if (data.results) {
      let idx = 0;
      for (const [key, urls] of Object.entries(outputs)) {
        localOutputs[key] = [];
        for (const url of urls) {
          localOutputs[key].push(data.results[idx]?.success && data.results[idx]?.url ? data.results[idx].url : url);
          idx++;
        }
      }
    }
    return { saved: data.saved || 0, localOutputs: Object.keys(localOutputs).length ? localOutputs : outputs };
  } catch {
    return { saved: 0, localOutputs: outputs };
  }
}

export function getSavePath(): string {
  return localStorage.getItem('bizyair_save_path') || '';
}

export async function hasSaveDir(): Promise<boolean> {
  try {
    const res = await fetch('/api/config/save-dir');
    const data = await res.json();
    return !!data.saveDir;
  } catch {
    return false;
  }
}

export async function clearSaveDir() {
  localStorage.removeItem('bizyair_save_path');
  try {
    await fetch('/api/config/save-dir', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir: '' }) });
  } catch {}
}
