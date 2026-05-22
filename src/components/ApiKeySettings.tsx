import { useState, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface BalanceData {
  gift_balance_amount?: number;
  gift_balance?: number;
  charge_balance_amount?: number;
  charge_balance?: number;
}

export default function ApiKeySettings({ open, onClose }: Props) {
  const [key, setKey] = useState(() => localStorage.getItem('bizyair_api_key') || '');
  const [saved, setSaved] = useState(false);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBalanceError(null);
    const k = localStorage.getItem('bizyair_api_key');
    setKey(k || '');
    if (k) queryBalance(k);
    else setBalance(null);
  }, [open]);

  const queryBalance = async (apiKey: string) => {
    setBalanceLoading(true);
    setBalance(null);
    setBalanceError(null);
    try {
      const res = await fetch(`/api/balance?key=${encodeURIComponent(apiKey)}`);
      const json = await res.json();
      if (json.success) {
        setBalance(json.data?.data || null);
      } else {
        setBalanceError(json.error || '查询失败');
      }
    } catch (e) {
      console.error('Balance query error:', e);
      setBalanceError(e instanceof Error ? e.message : '网络错误');
    }
    setBalanceLoading(false);
  };

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

  if (!open) return null;

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
        {key && (
          <div className="balance-row">
            <button className="btn btn-ghost balance-query-btn" onClick={() => queryBalance(key)} disabled={balanceLoading}>
              {balanceLoading ? '查询中...' : '查询余额'}
            </button>
            {balance && (
              <div className="balance-display">
                <span className="balance-item">
                  <img src="/icons/yinbi.webp" className="balance-icon" alt="" />
                  <span className="balance-label">银币</span>
                  <span className="balance-val">{balance.gift_balance_amount ?? balance.gift_balance ?? '?'}</span>
                </span>
                <span className="balance-item">
                  <img src="/icons/jinbi.webp" className="balance-icon" alt="" />
                  <span className="balance-label">金币</span>
                  <span className="balance-val">{balance.charge_balance_amount ?? balance.charge_balance ?? '?'}</span>
                </span>
              </div>
            )}
            {balanceError && <p className="balance-error">{balanceError}</p>}
          </div>
        )}
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
