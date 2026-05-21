export interface AssetFile {
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'text' | 'other';
  date: string;
  modelName: string;
  size: number;
  path: string;
}

export interface AssetFolder {
  name: string;
  fileCount: number;
  covers: string[];
}

export async function pickSaveDir(): Promise<string | null> {
  if (window.electronAPI) {
    const result = await window.electronAPI.selectFolder();
    if (result.success && result.folder) {
      return result.folder;
    }
    return null;
  }
  return null;
}

export function getSavePath(): string {
  return localStorage.getItem('bizyair_save_path') || '';
}

export async function clearSaveDir() {
  localStorage.removeItem('bizyair_save_path');
  try {
    await fetch('/api/config/save-dir', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir: '' }) });
  } catch {}
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

export async function listFolders(): Promise<AssetFolder[]> {
  try {
    const res = await fetch('/api/gallery');
    const data = await res.json();
    return data.folders || [];
  } catch {
    return [];
  }
}

export async function listFiles(modelName: string): Promise<AssetFile[]> {
  try {
    const res = await fetch(`/api/gallery?app_name=${encodeURIComponent(modelName)}`);
    const data = await res.json();
    return (data.files || []).map((f: AssetFile) => ({ ...f, modelName }));
  } catch {
    return [];
  }
}

export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const res = await fetch('/api/gallery', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export async function downloadFile(file: AssetFile) {
  const a = document.createElement('a');
  a.href = file.url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function revokeBlobUrl(_url: string) {}
