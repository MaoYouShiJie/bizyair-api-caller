import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { fetchModelDetail, fetchModelPrice } from '../api/modelzoo';

import { loadHistory, deleteHistory, type HistoryRecord } from '../api/history';
import MediaViewer from '../components/MediaViewer';
import TaskCard from '../components/TaskCard';
import type { ModelDetail, InputParam, ModelPrice } from '../types';
const zhCategory: Record<string, string> = {
  'Text to Image': '文生图', 'Image to Image': '图生图',
  'Text to Video': '文生视频', 'Image to Video': '图生视频',
  'Reference to Video': '参考生视频', 'Video Edit': '视频编辑',
  'Video Extend': '视频延长', 'Text to Speech': '语音合成',
  'Large Language Models': '大语言模型', 'Vision': '视觉',
  'FLF to Video': '首尾帧生视频',
};

function InputRenderer({ param, value, onChange }: {
  param: InputParam;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const ft = param.field_type;

  if (ft === 'boolean') {
    return (
      <label className="field-boolean">
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
        {param.field_label}
      </label>
    );
  }

  if (ft === 'seed') {
    const min = (param.field_options?.min as number) ?? 0;
    const max = (param.field_options?.max as number) ?? 2147483647;
    const step = (param.field_options?.step as number) ?? 1;
    if (max - min <= 100) {
      return (
        <div className="field-slider-wrap">
          <input type="range" className="field-slider" min={min} max={max} step={step}
            value={value as number ?? min} onChange={e => onChange(Number(e.target.value))} />
          <input type="number" className="field-slider-val field-slider-input" min={min} max={max} step={step}
            value={Number(value ?? min)} onChange={e => {
              const raw = e.target.value;
              if (raw === '') onChange(min);
              else { const v = Number(raw); if (!isNaN(v)) onChange(v); }
            }} onBlur={e => {
              const v = Number(e.target.value);
              if (!isNaN(v)) { const clamped = Math.min(max, Math.max(min, v)); if (clamped !== v) onChange(clamped); }
            }} />
        </div>
      );
    }
    const nv = Number(value);
    return (
      <div className="field-seed-wrap">
        <div className="field-seed-input-wrap">
          <input type="text" className="field-input field-seed-input"
            value={value as number ?? ''} onChange={e => {
              const v = e.target.value.replace(/[^0-9-]/g, '');
              onChange(v === '' || v === '-' ? v : Number(v));
            }} placeholder="-1" title={`范围 0-${max}；-1 表示由系统自动生成`} />
          <div className="field-seed-btns">
            <button className="field-seed-btn" title="+1" onClick={() => onChange((nv || 0) + 1)}>
              <svg width="10" height="10" viewBox="0 0 10 6" fill="currentColor"><path d="M0 5l5-5 5 5z"/></svg>
            </button>
            <button className="field-seed-btn" title="-1" onClick={() => onChange(Math.max(-1, (nv || 0) - 1))}>
              <svg width="10" height="10" viewBox="0 0 10 6" fill="currentColor"><path d="M0 1l5 5 5-5z"/></svg>
            </button>
          </div>
        </div>
        <button className="field-seed-random" title="自动随机" onClick={() => onChange(Math.floor(Math.random() * max))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
        </button>
        <p className="field-seed-hint">范围 0-{max}；-1 表示由系统自动生成</p>
      </div>
    );
  }

  if (ft === 'combo' && param.field_options?.values) {
    return (
      <select
        className="field-select"
        value={value as string ?? ''}
        onChange={e => onChange(e.target.value)}
      >
        {(param.field_options.values as string[]).map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    );
  }

  if (ft === 'number') {
    const fo = param.field_options || {};
    const numMin = (fo as any).min;
    const numMax = (fo as any).max;
    const numStep = (fo as any).step ?? 1;
    if (numMin !== undefined && numMax !== undefined && numMax - numMin <= 100 && numStep >= 1) {
      // small range → slider (existing logic)
    } else {
      const nv = value ?? param.field_value;
      return (
        <input type="number" className="field-input" min={numMin} max={numMax} step={numStep}
          value={nv as number ?? ''}
          onChange={e => { const v = e.target.value === '' ? '' : Number(e.target.value); if (v !== '' && !isNaN(v)) onChange(v); }} />
      );
    }
  }

  if (ft === 'image_size') {
    const fo = param.field_options || {};
    const wStep = (fo as any).width_step || 64;
    const hStep = (fo as any).height_step || 64;
    const raw = (value as string) || '2048x2048';
    const sepIdx = raw.search(/[x×]/i);
    const initW = sepIdx >= 0 ? parseInt(raw.slice(0, sepIdx), 10) || 2048 : 2048;
    const initH = sepIdx >= 0 ? parseInt(raw.slice(sepIdx + 1), 10) || 2048 : 2048;
    const [w, setW] = useState(initW);
    const [h, setH] = useState(initH);
    const clampW = (v: number) => Math.round(Math.max(64, v) / wStep) * wStep;
    const clampH = (v: number) => Math.round(Math.max(64, v) / hStep) * hStep;
    const emit = (nw: number, nh: number) => {
      onChange(`${nw}\u00D7${nh}`);
    };
    useEffect(() => {
      const sep = raw.search(/[x×]/i);
      const nw = sep >= 0 ? parseInt(raw.slice(0, sep), 10) || 2048 : 2048;
      const nh = sep >= 0 ? parseInt(raw.slice(sep + 1), 10) || 2048 : 2048;
      setW(nw); setH(nh);
    }, [value]);
    return (
      <div className="field-image-size">
        <input type="number" className="field-input field-size-input"
          min={64} step={wStep} value={w}
          onChange={e => { const v = clampW(Number(e.target.value) || 64); setW(v); emit(v, h); }} />
        <span className="field-size-sep">×</span>
        <input type="number" className="field-input field-size-input"
          min={64} step={hStep} value={h}
          onChange={e => { const v = clampH(Number(e.target.value) || 64); setH(v); emit(w, v); }} />
        <span className="field-size-pixels">{(w * h).toLocaleString()} 像素</span>
      </div>
    );
  }

  if (ft === 'customtext') {
    const taRef = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
      const el = taRef.current;
      if (el) {
        el.style.height = 'auto';
        const lh = parseInt(window.getComputedStyle(el).lineHeight) || 20;
        el.style.height = (el.scrollHeight + lh * 2) + 'px';
      }
    }, [value]);
    return (
      <textarea
        ref={taRef}
        className="field-textarea"
        value={value as string ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={(param.field_options?.placeholder as string) || ''}
        maxLength={(param.field_options?.max_length as number) || undefined}
        rows={4}
      />
    );
  }

  if (ft === 'slider') {
    const min = (param.field_options?.min as number) ?? 0;
    const max = (param.field_options?.max as number) ?? 100;
    const step = (param.field_options?.step as number) ?? 1;
    return (
      <div className="field-slider-wrap">
        <input type="range" className="field-slider" min={min} max={max} step={step}
          value={Number(value ?? min)} onChange={e => onChange(Number(e.target.value))} />
        <input type="number" className="field-slider-val field-slider-input" min={min} max={max} step={step}
          value={Number(value ?? min)} onChange={e => {
            const raw = e.target.value;
            if (raw === '') onChange(min);
            else { const v = Number(raw); if (!isNaN(v)) onChange(v); }
          }} onBlur={e => {
            const v = Number(e.target.value);
            if (!isNaN(v)) { const clamped = Math.min(max, Math.max(min, v)); if (clamped !== v) onChange(clamped); }
          }} />
      </div>
    );
  }

  if (ft === 'images' || ft === 'videos') {
    const files = Array.isArray(value) ? (value as string[]) : [];
    const isImage = ft === 'images';
    const exts = (param.field_options?.supported_exts as string[]) || [];
    const maxSize = (param.field_options?.supported_max_file_size as number) || 0;
    const acceptExts = exts.map(e => e.startsWith('.') ? e : `.${e}`).join(',');
    const [dragOver, setDragOver] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const readFile = (file: File, cb: (url: string) => void) => {
      if (maxSize && file.size > maxSize) {
        alert(`文件大小超过限制 (${(maxSize / 1024 / 1024).toFixed(0)}MB)`);
        return;
      }
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('api_key', localStorage.getItem('bizyair_api_key') || '');
      fetch('/api/upload-input', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(d => {
          if (d.url) { cb(d.url); } else { alert(d.error || '上传失败'); }
        })
        .catch(() => alert('上传失败'))
        .finally(() => setLoading(false));
    };

    const addFile = (file: File) => {
      readFile(file, (dataUrl) => onChange([...files, dataUrl]));
    };

    const replaceFile = (index: number, file: File) => {
      readFile(file, (dataUrl) => {
        const next = [...files];
        next[index] = dataUrl;
        onChange(next);
      });
    };

    const removeFile = (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = files.filter((_, i) => i !== index);
      onChange(next);
    };

    const openPicker = (index?: number) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = acceptExts || (isImage ? 'image/*' : 'video/*');
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          if (index !== undefined) replaceFile(index, file);
          else addFile(file);
        }
        document.body.removeChild(input);
      };
      input.click();
    };

    const renderSlot = (slotIndex: number, content: React.ReactNode, key?: number | string) => (
      <div key={key}
        className={`mu-slot ${dragOver === slotIndex ? 'mu-dragover' : ''} ${loading ? 'mu-loading' : ''}`}
        onDragEnter={e => { e.preventDefault(); setDragOver(slotIndex); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={e => {
          e.preventDefault(); e.stopPropagation(); setDragOver(null);
          const file = e.dataTransfer.files[0];
          if (file) {
            const idx = slotIndex < files.length ? slotIndex : undefined;
            idx !== undefined ? replaceFile(idx, file) : addFile(file);
          }
        }}
      >
        {content}
        {loading && <div className="mu-loading-overlay"><div className="mu-spinner" /></div>}
      </div>
    );

    return (
      <div className="field-media">
        <div className="mu-slots">
          {files.map((url, i) => renderSlot(i,
            <div className="mu-preview group" onClick={() => openPicker(i)}>
              {isImage ? (
                <img src={url} alt="" />
              ) : (
                <video src={url} controls />
              )}
              <div className="mu-overlay"><span>点击替换</span></div>
              <button className="mu-clear" onClick={(e) => removeFile(i, e)}>×</button>
            </div>, i
          ))}
          {renderSlot(files.length,
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>, 'add'
          )}
        </div>
        <p className="field-hint">
          支持格式: {exts.join(', ')}{maxSize > 0 && `，最大 ${(maxSize / 1024 / 1024).toFixed(0)}MB`}
        </p>
      </div>
    );
  }

  const optsMin = param.field_options?.min as number | undefined;
  const optsMax = param.field_options?.max as number | undefined;
  if (optsMin !== undefined && optsMax !== undefined && optsMax - optsMin <= 100) {
    const step = (param.field_options?.step as number) ?? 1;
    return (
      <div className="field-slider-wrap">
        <input type="range" className="field-slider" min={optsMin} max={optsMax} step={step}
          value={Number(value ?? optsMin)} onChange={e => onChange(Number(e.target.value))} />
        <input type="number" className="field-slider-val field-slider-input" min={optsMin} max={optsMax} step={step}
          value={Number(value ?? optsMin)} onChange={e => {
            const raw = e.target.value;
            if (raw === '') onChange(optsMin);
            else { const v = Number(raw); if (!isNaN(v)) onChange(v); }
          }} onBlur={e => {
            const v = Number(e.target.value);
            if (!isNaN(v)) { const clamped = Math.min(optsMax, Math.max(optsMin, v)); if (clamped !== v) onChange(clamped); }
          }} />
      </div>
    );
  }
  return (
    <input
      type="text"
      className="field-input"
      value={value as string ?? ''}
      onChange={e => onChange(e.target.value)}
    />
  );
}

export default function ModelDetailPage({ onOpenSettings, onOpenAssetLibrary }: { onOpenSettings?: () => void; onOpenAssetLibrary?: () => void }) {
  const { '*': endpointPath, modelName, endpointSuffix } = useParams();
  const endpoint = endpointPath || (modelName && endpointSuffix ? `${modelName}/${endpointSuffix}` : modelName || '');

  const [detail, setDetail] = useState<ModelDetail | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskCardKeys, setTaskCardKeys] = useState<number[]>([]);
  const nextCardId = useRef(0);
  const [modelPrice, setModelPrice] = useState<ModelPrice | null>(null);
  const [defaultValues, setDefaultValues] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState('invoke');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerItems, setViewerItems] = useState<import('../components/MediaViewer').MediaItem[]>([]);
  const [, setSearchParams] = useSearchParams();
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [resultTab, setResultTab] = useState<'output' | 'history'>('output');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<{ url: string; prompt: string; rec: HistoryRecord; index: number; isVideo: boolean; isAudio: boolean; isText: boolean; list: { url: string; prompt: string; rec: HistoryRecord; isVideo: boolean; isAudio: boolean; isText: boolean }[] } | null>(null);
  const [historyTextContent, setHistoryTextContent] = useState('');
  const [, setHistoryLoading] = useState(false);
  const [historyTextLoading, setHistoryTextLoading] = useState(false);

  useEffect(() => {
    if (!historyModal?.isText) { setHistoryTextContent(''); return; }
    setHistoryTextLoading(true);
    fetch(historyModal.url)
      .then(r => r.ok ? r.text() : '')
      .then(t => { setHistoryTextContent(t); setHistoryTextLoading(false); })
      .catch(() => { setHistoryTextContent('(无法加载内容)'); setHistoryTextLoading(false); });
  }, [historyModal?.url, historyModal?.isText]);

  function groupByDate(records: HistoryRecord[]): Record<string, HistoryRecord[]> {
    const groups: Record<string, HistoryRecord[]> = {};
    for (const r of records) {
      const d = r.timestamp.split('T')[0];
      if (!groups[d]) groups[d] = [];
      groups[d].push(r);
    }
    for (const date of Object.keys(groups)) {
      groups[date].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)));
  }

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'price') setSearchParams({ tab: 'price' });
    else if (tab === 'history') setSearchParams({ tab: 'history' });
    else setSearchParams({});
    if (tab === 'history' && endpoint) {
      setHistoryLoading(true);
      loadHistory(endpoint, detail?.display_name).then(r => setHistoryRecords(r)).catch(() => {}).finally(() => setHistoryLoading(false));
    }
  };

  useEffect(() => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    fetchModelDetail(endpoint)
      .then(data => {
        setDetail(data);
        const dv: Record<string, unknown> = {};
        data.input_params?.forEach(p => {
          const isWatermark = p.field_type === 'boolean' && (
            p.field_name.toLowerCase().includes('watermark') || p.field_name.toLowerCase().includes('water_mark') ||
            p.field_name.includes('水印') || p.field_label.includes('水印')
          );
          if (isWatermark) {
            dv[p.field_name] = false;
          } else if (p.field_value !== undefined && p.field_value !== null) {
            dv[p.field_name] = p.field_value;
          }
        });
        setFormValues(dv);
        setDefaultValues(dv);
        return fetchModelPrice(endpoint);
      })
      .then(pd => {
        if (pd) setModelPrice(pd);
      })
      .catch(e => {
        setError('加载模型详情失败: ' + e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [endpoint]);

  const handleSubmit = useCallback(() => {
    if (!detail) return;
    if (!localStorage.getItem('bizyair_api_key')) {
      setApiKeyMissing(true);
      return;
    }
    const id = ++nextCardId.current;
    setTaskCardKeys(prev => [id, ...prev]);
  }, [detail]);

  const updateValue = (name: string, val: unknown) => {
    setFormValues(prev => ({ ...prev, [name]: val }));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>加载模型详情...</p>
      </div>
    );
  }

  if (error && !detail) {
    return <div className="error-message">{error}</div>;
  }

  if (!detail) return null;

  return (
    <div className="model-detail">
      <button className="btn btn-ghost api-key-btn" onClick={onOpenSettings}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        {localStorage.getItem('bizyair_api_key') ? '已配置' : 'API设置'}
      </button>
      <button className="btn btn-ghost settings-btn" onClick={onOpenAssetLibrary}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
        资产库
      </button>
      <div className="detail-header">
        <Link to="/" className="back-link">← 返回模型列表</Link>
        <div className="detail-title-row">
          <h1>{detail.display_name}</h1>
          <div className="detail-tags-inline">
            <span className="tag">{detail.manufacturer}</span>
            <span className="tag">{zhCategory[detail.category] || detail.category}</span>
            {detail.tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
          {(() => {
            const forms = detail.related_categories.length > 0
              ? detail.related_categories
              : [{ id: detail.id, category: detail.category, endpoint: detail.endpoint }];
            const sorted = [...forms].sort((a, b) =>
              (zhCategory[a.category] || a.category).localeCompare(zhCategory[b.category] || b.category)
            );
            return (
              <select
                className="form-switcher"
                value={detail.endpoint}
                onChange={e => { window.location.href = `/model/${e.target.value}`; }}
              >
                {sorted.map(f => (
                  <option key={f.endpoint} value={f.endpoint}>{zhCategory[f.category] || f.category}</option>
                ))}
              </select>
            );
          })()}
        </div>
        <p className="detail-desc">{detail.description}</p>
        <div className="detail-tabs">
          <button className={`dt-tab ${activeTab === 'invoke' ? 'active' : ''}`} onClick={() => switchTab('invoke')}>调用</button>
          <button className={`dt-tab ${activeTab === 'price' ? 'active' : ''}`} onClick={() => switchTab('price')}>价格</button>
        </div>
      </div>

      {activeTab === 'price' ? (
        <div className="price-page">
          {modelPrice?.price_table && (
            <div className="price-page-section">
              <h3>价格表</h3>
              {modelPrice.price_table.cells?.length ? (
                <table className="price-table">
                  <thead>
                    <tr>
                      {modelPrice.price_table.columns.map(col => (
                        <th key={col.variable_name}>{col.field_label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modelPrice.price_table.cells.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => {
                          if (cell.variable_name === 'price') {
                            return <td key={ci}>🟡 {cell.value_str}/{cell.unit_name || '次'}</td>;
                          }
                          return <td key={ci}>{cell.value_str}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : modelPrice.price_table.simple_price_text ? (
                <p className="price-simple-text">{modelPrice.price_table.simple_price_text}</p>
              ) : null}
            </div>
          )}
          {modelPrice?.benefit && (
            <div className="price-page-section">
              <h3>权益</h3>
              <p className="price-page-subtitle">(免费版套餐)</p>
              <table className="price-table">
                <tbody>
                  <tr><td className="benefit-row-label">API并发数</td><td className="benefit-row-val">-</td></tr>
                  <tr><td className="benefit-row-label">RPD</td><td className="benefit-row-val">{modelPrice.benefit.rpd}</td></tr>
                  <tr><td className="benefit-row-label">RPH</td><td className="benefit-row-val">{modelPrice.benefit.rph}</td></tr>
                  <tr><td className="benefit-row-label">RPM</td><td className="benefit-row-val">{modelPrice.benefit.rpm === -1 ? '∞' : modelPrice.benefit.rpm}</td></tr>
                </tbody>
              </table>
            </div>
          )}
          {!modelPrice && (
            <div className="price-page-section">
              <p className="text-muted">暂无价格信息</p>
            </div>
          )}
        </div>
      ) : (
        <div className="detail-content">
        <div className="input-panel">
          <h3>输入参数</h3>
          <div className="input-fields">
            {detail.input_params.map(param => (
              <div key={param.field_name} className="field-group">
                <label className="field-label">
                  {param.field_label}
                  {param.required && <span className="required">*</span>}
                  {param.billing_dim && <span className="billing-tag">计费维度</span>}
                </label>
                {param.field_tooltip && <p className="field-tooltip">{param.field_tooltip}</p>}
                <InputRenderer
                  param={param}
                  value={formValues[param.field_name]}
                  onChange={val => updateValue(param.field_name, val)}
                />
              </div>
            ))}
          </div>

          {(() => {
            let priceNum: number | undefined;
            let priceUnit = '';
            const pt = modelPrice?.price_table;

            // 1) Calculate from billing_dim params with price_rate (live update)
            let hasBilling = false;
            if (detail.input_params) {
              let total = 0;
              detail.input_params.forEach(p => {
                if (p.billing_dim && p.field_options) {
                  const rate = (p.field_options as any).price_rate ?? (p.field_options as any).unit_price ?? (p.field_options as any).cost_per_unit;
                  if (rate) {
                    hasBilling = true;
                    total += (Number(formValues[p.field_name]) || 0) * Number(rate);
                  }
                }
              });
              if (hasBilling) { priceNum = total; priceUnit = detail.billing_unit === 'CALL' ? '次' : '秒'; }
            }

            // 2) Parse simple_price_text (e.g. "50金币/秒") with billing_dim field
            if (!hasBilling && !priceNum && pt?.simple_price_text) {
              const m = pt.simple_price_text.match(/^(\d+(?:\.\d+)?)/);
              if (m) {
                const unitRate = Number(m[1]);
                let dimValue: number | undefined;
                detail.input_params?.forEach(p => {
                  if (!p.billing_dim) return;
                  const fv = formValues[p.field_name];
                  if (fv === null || fv === undefined) return;
                  const n = Number(fv);
                  if (!isNaN(n)) dimValue = n;
                });
                if (dimValue !== undefined) {
                  priceNum = dimValue * unitRate;
                  priceUnit = '';
                } else {
                  priceNum = unitRate;
                  priceUnit = pt.simple_price_text.match(/\/秒/) ? '秒' : '次';
                }
              }
            }

            // 3) If no billing_dim rates, match form values to price_table rows
            if (!hasBilling && !priceNum && pt?.cells?.length) {
              // Build map: price_table variable_name → form value (only in-scope fields)
              const varValues: Record<string, string> = {};
              detail.input_params?.forEach(p => {
                const v = formValues[p.field_name];
                if (v !== null && v !== undefined) varValues[p.variable_name] = String(v);
              });
              const totalPx = Number(formValues.width) * Number(formValues.height);
              let bestRow = -1, bestScore = -1;
              for (let ri = 0; ri < pt.cells.length; ri++) {
                let score = 0;
                for (const cell of pt.cells[ri]) {
                  if (cell.variable_name === 'price' || !cell.value_str) continue;
                  const fv = varValues[cell.variable_name];
                  if (fv === undefined) {
                    // Column not in form — skip
                    continue;
                  }
                  const cv = cell.value_str.trim();
                  // Pixel-range expression like ">2560*1440" or "<=1920*1080"
                  const isPixelRange = /[<>]/.test(cv) && /\d+\s*\*\s*\d+/.test(cv);
                  if (isPixelRange && totalPx > 0) {
                    const parts = cv.split('且').map(s => s.trim());
                    if (parts.every(p => {
                      const m = p.match(/([<>]=?)\s*(\d+)\s*\*\s*(\d+)/);
                      if (!m) return false;
                      const op = m[1], threshold = Number(m[2]) * Number(m[3]);
                      return op === '>' ? totalPx > threshold
                           : op === '>=' ? totalPx >= threshold
                           : op === '<' ? totalPx < threshold
                           : op === '<=' ? totalPx <= threshold : false;
                    })) score += 10;
                    continue;
                  }
                  // Numeric range "X-Y"
                  const rangeMatch = cv.match(/^(\d+(?:\.\d+)?)\s*[-~]\s*(\d+(?:\.\d+)?)$/);
                  if (rangeMatch) {
                    const fvNum = Number(fv);
                    if (!isNaN(fvNum)) {
                      const lo = Number(rangeMatch[1]), hi = Number(rangeMatch[2]);
                      if (fvNum >= lo && fvNum <= hi) score += 10;
                    }
                    continue;
                  }
                  // Comparison ">X", ">=X", "<X", "<=X"
                  const compMatch = cv.match(/^([<>]=?)\s*(\d+(?:\.\d+)?)$/);
                  if (compMatch) {
                    const fvNum = Number(fv);
                    if (!isNaN(fvNum)) {
                      const threshold = Number(compMatch[2]);
                      const op = compMatch[1];
                      if (op === '>' ? fvNum > threshold
                        : op === '>=' ? fvNum >= threshold
                        : op === '<' ? fvNum < threshold
                        : op === '<=' ? fvNum <= threshold : false) score += 10;
                    }
                    continue;
                  }
                  // Exact numeric match
                  const fvNum = Number(fv);
                  const cvNum = Number(cv);
                  if (!isNaN(fvNum) && !isNaN(cvNum) && fvNum === cvNum) {
                    score += 10;
                    continue;
                  }
                  // Fallback: exact string match
                  if (cv === fv) score += 10;
                }
                if (score > bestScore) { bestScore = score; bestRow = ri; }
              }
              if (bestRow >= 0) {
                const pc = pt.cells[bestRow].find(c => c.variable_name === 'price');
                if (pc) { priceNum = Number(pc.value_str) || pc.amount; priceUnit = pc.unit_name || '次'; }
              }
            }

            // 4) Fallback: detail billing_price
            if (!priceNum) {
              priceNum = detail.billing_price ?? detail.billing_price_total;
              priceUnit = detail.billing_unit === 'CALL' ? '次' : '';
            }

            return (
              <div className="btn-row">
                <button className="btn btn-primary btn-submit" onClick={handleSubmit}>
                  <span className="btn-label">
                    运行
                    {priceNum !== undefined && priceNum > 0 ? <span className="btn-price"> 🟡 {priceNum}{priceUnit ? `/${priceUnit}` : ''}</span> : pt?.simple_price_text ? <span className="btn-price"> 🟡 按量计费</span> : <span className="btn-price"> 🟡 ?</span>}
                  </span>
                </button>
                <button className="btn btn-ghost btn-reset" onClick={() => defaultValues && setFormValues({ ...defaultValues })}>
                  重置
                </button>
              </div>
            );
          })()}

          {apiKeyMissing && (
            <p className="error-text">请先在右上角「API设置」中配置 API Key</p>
          )}
        </div>

        <div className="result-panel">
          <div className="result-panel-tabs">
            <button className={`rpt-tab ${resultTab === 'output' ? 'active' : ''}`} onClick={() => setResultTab('output')}>生成结果</button>
            <button className={`rpt-tab ${resultTab === 'history' ? 'active' : ''}`} onClick={() => { setResultTab('history'); loadHistory(endpoint, detail?.display_name).then(r => setHistoryRecords(r)).catch(() => {}); }}>历史记录</button>
          </div>

          <div className="result-panel-body" style={{ display: resultTab === 'history' ? 'none' : '' }}>
            {taskCardKeys.map(id => (
              <TaskCard
                key={id}
                detail={detail}
                endpoint={endpoint}
                formValues={formValues}
                onRemove={() => setTaskCardKeys(prev => prev.filter(k => k !== id))}
                onViewMedia={(items, index) => { setViewerItems(items as unknown as import('../components/MediaViewer').MediaItem[]); setViewerIndex(index); }}
              />
            ))}
            {taskCardKeys.length === 0 && (
              <div className="result-placeholder">
                <p>填写参数后点击「调用模型」开始运行</p>
              </div>
            )}
          </div>
          <div className="result-panel-body" style={{ display: resultTab === 'history' ? '' : 'none' }}>
            {historyRecords.length === 0 ? (
              <div className="result-placeholder"><p>暂无历史记录</p></div>
            ) : selectedDate ? (
              <div className="history-open-view">
                <button className="al-hdr-back" onClick={() => setSelectedDate(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  全部日期
                </button>
                <div className="al-file-grid">
                  {(() => {
                    const items = groupByDate(historyRecords)[selectedDate] || [];
                    const allItems: { url: string; prompt: string; rec: HistoryRecord; isVideo: boolean; isAudio: boolean; isText: boolean }[] = [];
                    for (const rec of items) {
                      const prompt = Object.entries(rec.formValues)
                        .filter(([, v]) => !Array.isArray(v) && typeof v === 'string')
                        .map(([, v]) => v).join(' | ');
                      const urls = Object.values(rec.outputs).flat();
                      for (const url of urls) {
                        const isText = !/^(https?:\/\/|\/)/i.test(url);
                        allItems.push({ url, prompt, rec, isVideo: !isText && /\.(mp4|webm|mov|avi|mkv)$/i.test(url), isAudio: !isText && /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i.test(url), isText });
                      }
                    }
                    return allItems.map((item, i) => (
                      <div key={i} className="al-thumb-wrap history-img-wrap" onClick={() => setHistoryModal({ ...item, index: i, list: allItems })}>
                        {item.isText ? (
                          <div className="al-thumb-text al-thumb-text-preview">
                            <span className="al-thumb-text-preview-content">{item.url.slice(0, 200)}</span>
                          </div>
                        ) : item.isVideo ? (
                          <video src={item.url} className="al-thumb-img" preload="metadata" muted playsInline />
                        ) : item.isAudio ? (
                          <div className="al-thumb-audio-wrap"><audio src={item.url} controls preload="none" /></div>
                        ) : (
                          <img src={item.url} alt="" className="al-thumb-img" loading="eager" />
                        )}
                        <div className="history-tooltip">{item.prompt || '无提示词'}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <div className="al-folder-grid" style={{ paddingTop: 16, paddingLeft: 12 }}>
                {Object.entries(groupByDate(historyRecords)).map(([date, items]) => {
                  const allCovers = items.flatMap(r => Object.values(r.outputs).flat()).filter(u => /\.(png|jpg|jpeg|gif|webp|mp4|webm|mov|avi|mkv)$/i.test(u));
                  const covers = allCovers.slice(0, 3).reverse();
                  const hasTextOnly = covers.length === 0 && items.some(r => Object.values(r.outputs).flat().some(u => !/^(https?:\/\/|\/)/i.test(u)));
                  return (
                    <div key={date} className="al-folder-item">
                        {hasTextOnly ? (
                          <div className="al-stacked-folder" onClick={() => setSelectedDate(date)}>
                            {[0, 1, 2].map(i => {
                              const edge = 4; const gap = 18;
                              return (
                                  <div key={i} className="al-stacked-layer"
                                       style={{ top: edge + i * gap, left: edge + i * gap, right: edge + (2 - i) * gap, bottom: edge, transform: `translateY(${i * gap}px)`, zIndex: 2 - i, overflow: 'visible' }}>
                                    <div className="al-stacked-layer-inner" style={{ overflow: 'visible' }}>
                                      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                        <div className="al-thumb-text al-thumb-text-preview" style={{width:'100%',height:'85%',borderRadius:'12px',flexShrink:0,boxShadow:'inset 0 0 8px 3px rgba(0,0,0,.6)'}}>
                                          <span className="al-thumb-text-preview-content">{(Object.values(items[0]?.outputs || {}).flat().find(u => !/^(https?:\/\/|\/)/i.test(u)) || '文本').slice(0, 200)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                              );
                            })}
                            <div className="al-stacked-badge">{items.length}</div>
                          </div>
                        ) : (
                          <div className="al-stacked-folder" onClick={() => setSelectedDate(date)}>
                            {[0, 1, 2].map(i => {
                              const edge = 4; const gap = 18;
                              const coverIdx = 2 - i;
                              if (!covers[coverIdx]) return null;
                              const isVideo = /\.(mp4|webm|mov|avi|mkv)$/i.test(covers[coverIdx]);
                              return (
                                <div key={i} className="al-stacked-layer" style={{ top: edge, left: edge + i * gap, right: edge + (2 - i) * gap, bottom: edge, transform: `translateY(${i * gap}px)`, zIndex: 2 - i }}>
                                  <div className="al-stacked-layer-inner">
                                    {isVideo ? (
                                      <div className="al-stacked-video-wrap">
                                        <video src={covers[coverIdx]} className="al-stacked-img" preload="metadata" muted playsInline />
                                        <div className="al-stacked-play-icon">
                                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                        </div>
                                      </div>
                                    ) : (
                                      <img src={covers[coverIdx]} alt="" className="al-stacked-img" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            <div className="al-stacked-badge">{items.length}</div>
                          </div>
                        )}
                      <div className="al-folder-item-label">{date}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {viewerIndex !== null && viewerItems.length > 0 && (
        <MediaViewer
          items={viewerItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {historyModal && (
        <div className="history-modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="history-modal" onClick={e => e.stopPropagation()}>
            <div className="history-modal-left">
              {historyModal.isText ? (
                <div className="history-modal-text-wrap">
                  <button className="history-modal-text-copy-btn" onClick={() => { navigator.clipboard.writeText(historyTextContent); }}>复制</button>
                  {historyTextLoading ? <div className="history-modal-text-loading">加载中...</div> : <pre className="history-modal-text">{historyTextContent}</pre>}
                </div>
              ) : historyModal.isVideo ? (
                <video src={historyModal.url} controls className="history-modal-img" />
              ) : historyModal.isAudio ? (
                <div className="history-modal-audio-wrap"><audio src={historyModal.url} controls /></div>
              ) : (
                <img src={historyModal.url} alt="" className="history-modal-img" />
              )}
            </div>
            <div className="history-modal-right">
              <div className="history-modal-header">
                <div className="history-modal-info">
                  {historyModal.isText ? '文本' : historyModal.isVideo ? '视频' : historyModal.isAudio ? '音频' : '图片'} {historyModal.index + 1} / {historyModal.list.length}
                </div>
                <div className="history-modal-actions">
                  <button className="btn btn-ghost btn-reuse" onClick={() => { setFormValues({ ...historyModal.rec.formValues }); setHistoryModal(null); }}>一键复用</button>
                  <button className="btn btn-ghost btn-del" onClick={async () => {
                    await deleteHistory(endpoint, historyModal.rec.id);
                    setHistoryRecords(prev => prev.filter(r => r.id !== historyModal.rec.id));
                    const remaining = historyModal.list.filter(x => x.rec.id !== historyModal.rec.id);
                    if (remaining.length === 0) { setHistoryModal(null); setSelectedDate(null); }
                    else if (historyModal.index >= remaining.length) setHistoryModal({ ...remaining[remaining.length - 1], index: remaining.length - 1, list: remaining });
                    else { const newIdx = remaining.findIndex(x => x.url === historyModal.url && x.rec.id === historyModal.rec.id); setHistoryModal({ ...remaining[newIdx >= 0 ? newIdx : 0], index: newIdx >= 0 ? newIdx : 0, list: remaining }); }
                  }}>删除</button>
                  <button className="history-modal-close" onClick={() => setHistoryModal(null)}>×</button>
                </div>
              </div>
              <div className="history-modal-body">
                {Object.entries(historyModal.rec.formValues).filter(([, v]) => v !== null && v !== undefined && v !== '').map(([key, val]) => {
                  const p = detail?.input_params?.find(p => p.field_name === key);
                  const display = Array.isArray(val) ? `[${val.length} 个文件]` : String(val);
                  return (
                    <div key={key} className="history-modal-field">
                      <span className="history-modal-field-label">{p?.field_label || key}</span>
                      <span className="history-modal-field-value">{display}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
