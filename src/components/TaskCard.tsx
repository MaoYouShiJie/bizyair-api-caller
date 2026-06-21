import { useState, useEffect, useRef } from 'react';
import { createTask, pollTask } from '../api/modelzoo';
import { saveOutputs } from '../api/saveOutput';
import { saveHistory } from '../api/history';
import type { ModelDetail } from '../types';

interface TaskCardProps {
  detail: ModelDetail;
  endpoint: string;
  formValues: Record<string, unknown>;
  onRemove: () => void;
  onViewMedia: (items: { url: string; name?: string; type?: string }[], index: number) => void;
}

function isUrl(v: string) { return /^https?:\/\//i.test(v); }

function jsonForDisplay(taskResponse: Record<string, unknown> | null, outputs: Record<string, string[]> | null, example: Record<string, string[]> | null) {
  if (taskResponse) return taskResponse;
  const out = outputs || example;
  if (!out) return {};
  return { request_id: '', status: 'Success', message: null, outputs: out };
}

function mdToHtml(text: string) {
  const lines = text.split('\n');
  let html = '';
  let inList = false;
  for (const raw of lines) {
    let line = raw
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    if (/^###\s+(.*)/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${line.replace(/^###\s+/, '')}</h3>`;
    } else if (/^[\d]+\.\s+(.*)/.test(line)) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${line.replace(/^[\d]+\.\s+/, '')}</li>`;
    } else if (/^\*\*\*/.test(line)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<hr>';
    } else if (raw.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${line}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

export default function TaskCard({ detail, endpoint, formValues, onRemove, onViewMedia }: TaskCardProps) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('提交中...');
  const [outputs, setOutputs] = useState<Record<string, string[]> | null>(null);
  const [taskResponse, setTaskResponse] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | { message: string; detail?: string; logs?: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [outputViewMode, setOutputViewMode] = useState<'preview' | 'json'>('preview');
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    async function run() {
      try {
        const result = await createTask(endpoint, formValues);
        if (cancelledRef.current) return;
        const tid = result.request_id;
        setTaskId(tid);
        setStatus('排队中');

        const statuses = ['Queuing', 'Preparing', 'Running'];
        while (true) {
          await new Promise(r => setTimeout(r, 2000));
          if (cancelledRef.current) return;
          const data = await pollTask(tid);
          if (cancelledRef.current) return;
          setStatus(data.status);

          if (data.status === 'Success') {
            setOutputs(data.outputs || null);
            setTaskResponse(data as unknown as Record<string, unknown>);

            const out = data.outputs || {};
            let historyOutputs = out;
            if (Object.keys(out).length) {
              setSaveStatus('正在保存...');
              try {
                const result = await saveOutputs(out, detail.display_name);
                if (!cancelledRef.current) {
                  setSaveStatus(result.saved > 0 ? `已保存 ${result.saved} 个文件` : '');
                  historyOutputs = result.localOutputs;
                }
              } catch {
                if (!cancelledRef.current) setSaveStatus('保存失败');
              }
            }
            saveHistory(endpoint, formValues, historyOutputs, tid).catch(() => {});
            break;
          }
          if (data.status === 'Failed') {
            setError({
              message: data.message || data.error_msg || '任务执行失败',
              detail: data.error_detail,
              logs: data.logs
            });
            break;
          }
          if (data.status === 'Canceled') {
            setError('任务已取消');
            break;
          }
          if (!statuses.includes(data.status)) break;
        }
      } catch (e: unknown) {
        if (!cancelledRef.current) {
          setError(e instanceof Error ? e.message : '调用失败');
        }
      }
    }
    run();
    return () => { cancelledRef.current = true; };
  }, []);

  const done = status === 'Success' || (status !== '提交中...' && status !== '排队中' && status !== 'Queuing' && status !== 'Preparing' && status !== 'Running' && !!error);

  return (
    <div className="task-card">
      {(taskId || done) && (
        <div className="task-card-header">
          {taskId && <span className="task-id">任务ID: {taskId}</span>}
          {done && (
            <button className="task-card-close" onClick={onRemove} title="关闭">×</button>
          )}
        </div>
      )}

      {status && (
        <div className="task-status">
          <div className={`status-badge ${status === 'Success' ? 'success' : status === 'Failed' ? 'failed' : ''}`}>
            {status === 'Queuing' && '排队中'}
            {status === 'Preparing' && '准备中'}
            {status === 'Running' && '运行中...'}
            {status === 'Success' && '已完成 ✓'}
            {status === 'Failed' && '失败 ✗'}
            {status === '提交中...' && '提交中...'}
            {status === 'Canceled' && '已取消'}
            {!['Queuing', 'Preparing', 'Running', 'Success', 'Failed', 'Canceled', '提交中...'].includes(status) && status}
          </div>
          {saveStatus && <span className="save-status">{saveStatus}</span>}
        </div>
      )}

      {status === 'Running' && (
        <div className="progress-bar">
          <div className="progress-fill" />
        </div>
      )}

      {error && (
        <div className="error-message">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{typeof error === 'string' ? error : error.message}</span>
            {typeof error === 'object' && (error.detail || error.logs) && (
              <button
                onClick={() => setShowErrorDetail(!showErrorDetail)}
                style={{
                  padding: '2px 8px', fontSize: 12, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 4, color: 'white',
                }}
              >
                {showErrorDetail ? '收起详情' : '查看详情'}
              </button>
            )}
          </div>
          {showErrorDetail && typeof error === 'object' && (
            <div style={{ marginTop: 8, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
              {error.detail && (
                <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0', padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
                  {error.detail}
                </pre>
              )}
              {error.logs && (
                <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0', padding: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4 }}>
                  {error.logs}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {outputs ? (
        (() => {
          const data = Object.entries(outputs);
          const hasText = data.some(([, urls]) => urls.some(u => !isUrl(u)));
          return hasText ? (
            <div className="output-section">
              <div className="output-view-tabs">
                <button className={`ov-tab ${outputViewMode === 'preview' ? 'active' : ''}`} onClick={() => setOutputViewMode('preview')}>预览</button>
                <button className={`ov-tab ${outputViewMode === 'json' ? 'active' : ''}`} onClick={() => setOutputViewMode('json')}>JSON</button>
                <button className="ov-copy" onClick={() => {
                  const text = outputViewMode === 'json'
                    ? JSON.stringify(jsonForDisplay(taskResponse, outputs, detail.outputs_example), null, 2)
                    : data.map(([, urls]) => urls.join('\n')).join('\n\n');
                  navigator.clipboard.writeText(text);
                }}>复制</button>
              </div>
              <div className="output-json-wrap">
                {outputViewMode === 'json' ? (
                  <pre className="output-json">{JSON.stringify(jsonForDisplay(taskResponse, outputs, detail.outputs_example), null, 2)}</pre>
                ) : (
                  <div className="outputs">
                    {data.map(([key, urls]) => {
                      const isText = !urls.some(u => isUrl(u));
                      return (
                        <div key={key} className="output-group">
                          <div className={isText ? 'output-text-block' : 'output-grid'}>
                            {urls.map((url, i) => (
                              <div key={i} className="output-item">
                                {key.includes('image') || key.includes('img') ? (
                                  <img src={url} alt={`output ${i}`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      const items = data.flatMap(([, us]) => (us as string[]).map(u => ({ url: u, name: '' })));
                                      const idx = items.findIndex(it => it.url === url);
                                      onViewMedia(items, idx);
                                    }}
                                  />
                                ) : key.includes('video') ? (
                                  <video src={url} controls
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                      const items = data.flatMap(([, us]) => (us as string[]).map(u => ({ url: u })));
                                      const idx = items.findIndex(it => it.url === url);
                                      onViewMedia(items, idx);
                                    }}
                                  />
                                ) : key.includes('audio') ? (
                                  <audio src={url} controls />
                                ) : isUrl(url) ? (
                                  <a href={url} target="_blank" rel="noopener noreferrer">下载文件 {i + 1}</a>
                                ) : (
                                  <div className="output-text-content" dangerouslySetInnerHTML={{ __html: mdToHtml(url) }} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="outputs">
              {data.map(([key, urls]) => (
                <div key={key} className="output-grid">
                  {urls.map((url, i) => (
                    <div key={i} className="output-item">
                      {key.includes('image') || key.includes('img') ? (
                        <img src={url} alt={`output ${i}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const items = data.flatMap(([, us]) => (us as string[]).map(u => ({ url: u, name: '' })));
                            const idx = items.findIndex(it => it.url === url);
                            onViewMedia(items, idx);
                          }}
                        />
                      ) : key.includes('video') ? (
                        <video src={url} controls
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            const items = data.flatMap(([, us]) => (us as string[]).map(u => ({ url: u })));
                            const idx = items.findIndex(it => it.url === url);
                            onViewMedia(items, idx);
                          }}
                        />
                      ) : key.includes('audio') ? (
                        <audio src={url} controls />
                      ) : (
                        <a href={url} target="_blank" rel="noopener noreferrer">下载文件 {i + 1}</a>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })()
      ) : status === '提交中...' ? (
        <div className="result-placeholder">
          <p>正在提交任务...</p>
        </div>
      ) : null}
    </div>
  );
}
