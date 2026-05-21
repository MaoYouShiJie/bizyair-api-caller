import { useState, useEffect } from 'react';
import { pickSaveDir, getSavePath, clearSaveDir, hasSaveDir } from '../api/saveOutput';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SaveSettings({ open, onClose }: Props) {
  const [path, setPath] = useState('');
  const [configured, setConfigured] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setPath(getSavePath());
    hasSaveDir().then(setConfigured);
    setMsg('');
  }, [open]);

  const handleSelect = async () => {
    const p = await pickSaveDir();
    if (p) {
      setPath(p);
      setConfigured(true);
      setMsg('已选择保存目录 ✓');
      setTimeout(() => setMsg(''), 2000);
    }
  };

  const handleClear = async () => {
    await clearSaveDir();
    setPath('');
    setConfigured(false);
    setMsg('已清除保存目录');
    setTimeout(() => setMsg(''), 2000);
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>保存设置</h2>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>
          选择生成结果的保存目录。每次生成完成后会自动保存到该目录。
        </p>

        <div className="save-dir-section">
          <div className="save-dir-row">
            <span className="save-dir-label">保存目录</span>
            <button className="btn btn-primary btn-sm" onClick={handleSelect}>
              选择文件夹
            </button>
          </div>

          <div className="save-dir-path">
            {path ? (
              <span className="save-dir-path-text" title={path}>{path}</span>
            ) : (
              <span className="save-dir-path-empty">尚未选择保存目录</span>
            )}
          </div>

          <p className="save-dir-hint">
            保存路径: <code>{path || '(未设置)'}/输出/模型名称/日期/文件</code>
          </p>

          {msg && <p className="save-dir-msg">{msg}</p>}
        </div>

        <div className="modal-actions">
          {configured && <button className="btn btn-secondary" onClick={handleClear}>清除目录</button>}
          <button className="btn btn-primary" onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  );
}
