import { useState, useEffect, useMemo, useRef } from 'react';
import { listFolders, listFiles, deleteFile, downloadFile, pickSaveDir, getSavePath, hasSaveDir } from '../api/assetLibrary';
import MediaViewer from './MediaViewer';
import type { AssetFolder, AssetFile } from '../api/assetLibrary';

interface Props {
  onClose: () => void;
}

type View = 'root' | 'folder';

function getThumbUrl(filePath: string): string {
  if (!filePath) return '';
  const normalized = filePath.startsWith('/') ? filePath : '/' + filePath;
  return `/api/thumbnail?path=${encodeURIComponent(normalized)}`;
}

function getMediaType(file: AssetFile): string {
  if (file.type === 'video') return 'video';
  if (file.type === 'audio') return 'audio';
  if (file.type === 'text') return 'text';
  const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
  if (['json', 'txt', 'csv', 'md', 'log', 'html', 'xml'].includes(ext)) return 'text';
  return 'image';
}

const EDGE = 4;
const GAP = 18;

function StackedFolder({ folder, onClick }: { folder: AssetFolder; onClick: () => void }) {
  const coverImages = (folder.covers || []).slice();
  const n = Math.min(coverImages.length, 3);
  const stackN = n === 1 ? 3 : n;
  const startIdx = 3 - n;
  const [glow, setGlow] = useState(false);
  const [imgFail, setImgFail] = useState<Record<string, boolean>>({});

  return (
    <div
      className="al-stacked-folder"
      onClick={onClick}
      onMouseEnter={() => setGlow(true)}
      onMouseLeave={() => setGlow(false)}
      style={{
        filter: glow
          ? 'drop-shadow(0 0 2px rgba(40,100,255,1)) drop-shadow(0 0 10px rgba(50,140,255,0.8))'
          : 'none',
        transition: 'filter 0.25s ease',
      }}
    >
      {Array.from({ length: 3 }).map((_, i) => {
        if (i < startIdx) return null;
        const coverIdx = i - startIdx;
        const cover = coverIdx < coverImages.length ? coverImages[coverIdx] : null;
        const layerIdx = coverIdx;
        const left = EDGE + layerIdx * GAP;
        const right = EDGE + (stackN - 1 - layerIdx) * GAP;
        const t = cover ? (cover.type || (() => { const ext = (cover.path || '').split('.').pop()?.toLowerCase(); if (['mp4','webm','mov','avi'].includes(ext || '')) return 'video'; if (['mp3','wav','ogg','m4a','flac','aac'].includes(ext || '')) return 'audio'; if (['json','txt','csv','md','log','html','xml'].includes(ext || '')) return 'text'; return 'image'; })()) : '';
        const layerStyle = {
          top: EDGE + layerIdx * GAP,
          left,
          right,
          bottom: EDGE,
          transform: `translateY(${layerIdx * GAP}px)`,
          zIndex: 2 - layerIdx,
          ...(t === 'text' ? { overflow: 'visible' } : {}),
        };
        if (!cover) return <div key={i} className="al-stacked-layer" style={layerStyle}><div className="al-stacked-layer-inner"><div className="al-stacked-placeholder" /></div></div>;
        return (
          <div key={i} className="al-stacked-layer" style={layerStyle}>
            <div className="al-stacked-layer-inner" style={t === 'text' ? { overflow: 'visible' } : undefined}>
              {(() => {
                if (t === 'image') {
                  return imgFail[cover.path] ? (
                    <div className="al-thumb-text" style={{width:'100%',height:'100%',borderRadius:'12px'}}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="al-thumb-text-icon">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      <span className="al-thumb-text-label">{(cover.path || '').split('.').pop()?.toUpperCase()}</span>
                    </div>
                  ) : <img src={getThumbUrl(cover.path)} alt="" className="al-stacked-img" loading="eager" onError={() => setImgFail(p => ({ ...p, [cover.path]: true }))} />;
                }
                if (t === 'video') {
                  return (
                    <div className="al-stacked-video-wrap">
                      <video src={cover.path} className="al-stacked-img" preload="auto" muted playsInline />
                      <div className="al-stacked-play-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                    </div>
                  );
                }
                if (t === 'text') {
                  return (
                    <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div className="al-thumb-text al-thumb-text-preview" style={{width:'100%',height:'85%',borderRadius:'12px',flexShrink:0,boxShadow:'inset 0 0 8px 3px rgba(0,0,0,.6)'}}>
                        <span className="al-thumb-text-preview-content">{cover?.preview || '文本'}</span>
                      </div>
                    </div>
                  );
                }
                return <div className="al-stacked-placeholder" />;
              })()}
            </div>
          </div>
        );
      })}
      <div className="al-stacked-badge" style={n < 3 ? { bottom: -4 + n * 6, right: -4 + n * 6 } : {}}>
        {folder.fileCount}
      </div>
    </div>
  );
}

function MediaThumb({ file, onClick }: { file: AssetFile; onClick: () => void }) {
  const mediaType = getMediaType(file);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      className="al-thumb-wrap"
      onClick={onClick}
    >
      {mediaType === 'image' && !imgFailed ? (
        <img
          src={getThumbUrl(file.path)}
          alt={file.name}
          loading="eager"
          className="al-thumb-img"
          onError={() => setImgFailed(true)}
        />
      ) : mediaType === 'video' ? (
        <video
          src={file.path}
          className="al-thumb-img"
          preload="metadata"
          muted
          playsInline
          onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
        />
      ) : mediaType === 'audio' ? (
        <div className="al-thumb-audio">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="al-thumb-audio-icon">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
          <span className="al-thumb-text-label">{file.name.split('.').pop()?.toUpperCase()}</span>
        </div>
      ) : mediaType === 'text' && file.preview ? (
        <div className="al-thumb-text al-thumb-text-preview">
          <span className="al-thumb-text-preview-content">{file.preview}</span>
        </div>
      ) : (
        <div className="al-thumb-text">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="al-thumb-text-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span className="al-thumb-text-label">文本</span>
        </div>
      )}
      {(mediaType === 'video' || (mediaType === 'text' && file.type !== 'text')) && (
        <div className="al-thumb-type-tag">
          {file.name.split('.').pop()?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default function AssetLibrary({ onClose }: Props) {
  const [view, setView] = useState<View>('root');
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [files, setFiles] = useState<AssetFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState('');
  const [loading, setLoading] = useState(true);
  const [savePath, setSavePath] = useState(getSavePath());
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showDirModal, setShowDirModal] = useState(false);
  const [dirModalInput, setDirModalInput] = useState('');
  const foldersLoadedRef = useRef(false);
  const folderCacheRef = useRef<Record<string, AssetFile[]>>({});

  const loadContents = async () => {
    setLoading(true);
    const p = getSavePath();
    setSavePath(p);
    const [f] = await Promise.all([
      listFolders(),
      fetch('/api/config/save-dir').then(r => r.json()).then(d => {
        if (d.saveDir && d.saveDir !== p) {
          localStorage.setItem('bizyair_save_path', d.saveDir);
          setSavePath(d.saveDir);
        }
      }).catch(() => {})
    ]);
    setFolders(f);
    setLoading(false);
  };

  useEffect(() => {
    hasSaveDir().then(h => {
      if (h) loadContents();
      else setLoading(false);
    });
  }, []);

  const openFolder = async (name: string) => {
    if (folderCacheRef.current[name]) {
      setFiles(folderCacheRef.current[name]);
      setCurrentFolder(name);
      setView('folder');
      return;
    }
    setLoading(true);
    setCurrentFolder(name);
    const fl = await listFiles(name);
    folderCacheRef.current[name] = fl;
    setFiles(fl);
    setView('folder');
    setLoading(false);
  };

  const goBack = () => {
    setView('root');
    setCurrentFolder('');
    foldersLoadedRef.current = false;
    loadContents();
  };

  const handleDelete = async (file: AssetFile) => {
    if (!confirm(`确定删除 "${file.name}"？`)) return;
    const ok = await deleteFile(file.path);
    if (ok) {
      setFiles(prev => prev.filter(f => f.name !== file.name));
      if (currentFolder) delete folderCacheRef.current[currentFolder];
    }
  };

  const saveDirToBackend = (p: string) => {
    setSavePath(p);
    localStorage.setItem('bizyair_save_path', p);
    fetch('/api/config/save-dir', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dir: p }),
    }).catch(() => {});
    loadContents();
  };

  const handleSelectDir = async () => {
    const p = await pickSaveDir();
    if (p) { saveDirToBackend(p); return; }
    setDirModalInput(savePath || '');
    setShowDirModal(true);
  };

  const confirmDirModal = () => {
    const v = dirModalInput.trim();
    if (v) saveDirToBackend(v);
    setShowDirModal(false);
  };

  const viewerItems = useMemo(() => {
    if (view !== 'folder') return [];
    return files.map(f => ({
      url: f.url,
      name: f.name,
      type: getMediaType(f) as 'image' | 'video' | 'audio' | 'text',
    }));
  }, [files, view]);

  const imageFiles = useMemo(() => {
    return files.filter(f => {
      const t = getMediaType(f);
      return t === 'image' || t === 'video' || t === 'audio' || t === 'text';
    });
  }, [files]);

  return (
    <div className="al-overlay" onClick={onClose}>
      <div className="al-panel" onClick={e => e.stopPropagation()}>
        <div className="al-header-bar">
          <div className="al-header-left">
            {view === 'folder' ? (
              <div className="al-header-left">
                <span className="al-hdr-title">{currentFolder}</span>
                <span className="al-hdr-count">· {imageFiles.length} 个文件</span>
              </div>
            ) : (
              <div className="al-header-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="al-hdr-folder-icon">
                  <rect x="3" y="5" width="18" height="14" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                </svg>
                <span className="al-hdr-title">资产库</span>
                <span className="al-hdr-count">· {folders.length} 个文件夹</span>
              </div>
            )}
          </div>

          {view === 'root' && (
            <div className="al-hdr-center">
              <button className="al-hdr-select-btn" onClick={handleSelectDir}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
                <span>选择</span>
              </button>
              <div className="al-hdr-path-box">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="al-hdr-path-icon">
                  <rect x="3" y="5" width="18" height="14" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                </svg>
                <input
                  type="text"
                  value={savePath}
                  readOnly
                  className="al-hdr-path-input"
                  title={savePath || '未设置保存目录'}
                />
              </div>
            </div>
          )}

          <div className="al-header-right">
            <button className="al-hdr-close-btn" onClick={view === 'folder' ? goBack : onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="al-body">
          {loading ? (
            <div className="al-loading">
              <div className="al-loading-spinner" />
              <span className="al-loading-text">加载中...</span>
            </div>
          ) : view === 'root' ? (
            folders.length === 0 ? (
              <div className="al-empty">
                <p>暂无资产</p>
              </div>
            ) : (
              <div className="al-folder-grid">
                {folders.map(f => (
                  <div key={f.name} className="al-folder-item">
                    <StackedFolder folder={f} onClick={() => openFolder(f.name)} />
                    <div className="al-folder-item-label">{f.name}</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            imageFiles.length === 0 ? (
              <div className="al-empty">
                <p>此文件夹为空</p>
              </div>
            ) : (
              <div className="al-file-grid">
                {imageFiles.map((f, i) => (
                  <MediaThumb
                    key={f.path}
                    file={f}
                    onClick={() => setViewerIndex(i)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {viewerIndex !== null && viewerItems.length > 0 && (
        <MediaViewer
          items={viewerItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {showDirModal && (
        <div className="al-dir-overlay" onClick={() => setShowDirModal(false)}>
          <div className="al-dir-modal" onClick={e => e.stopPropagation()}>
            <h3>设置保存目录</h3>
            <p>输入保存目录的完整路径：</p>
            <input
              value={dirModalInput}
              onChange={e => setDirModalInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmDirModal(); }}
              autoFocus
              placeholder="例如：D:\AI Studio\BizyAirAPI调用"
            />
            <div className="al-dir-actions">
              <button className="al-dir-btn al-dir-btn-cancel" onClick={() => setShowDirModal(false)}>取消</button>
              <button className="al-dir-btn al-dir-btn-confirm" onClick={confirmDirModal}>确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
