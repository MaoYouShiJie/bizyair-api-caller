import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ApiKeySettings({ open, onClose }: Props) {
  const [key, setKey] = useState(() => localStorage.getItem('bizyair_api_key') || '');
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  const saveToBackend = async (k: string) => {
    try {
      await fetch('/api/config/api-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: k }),
      });
    } catch {}
  };

  const handleSave = () => {
    localStorage.setItem('bizyair_api_key', key);
    saveToBackend(key);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  };

  const handleClear = () => {
    setKey('');
    localStorage.removeItem('bizyair_api_key');
    saveToBackend('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>API Key 设置</h2>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
          输入你的 BizyAir API Key。可在 BizyAir 控制台获取。
        </p>
        <input
          type="password"
          className="api-key-input"
          placeholder="输入你的 API Key"
          value={key}
          onChange={e => setKey(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={handleClear}>清除</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? '已保存 ✓' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
