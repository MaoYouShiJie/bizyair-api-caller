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
  const coverImages = (folder.covers || []).slice().reverse();
  const layers: (string | null)[] = [];
  for (let i = 0; i < 3; i++) layers.push(coverImages[i] || null);
  const hasRealCovers = layers.filter(Boolean).length;
  const [glow, setGlow] = useState(false);

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
      {layers.map((url, i) => {
        const left = EDGE + i * GAP;
        const right = EDGE + (2 - i) * GAP;
        if (i >= hasRealCovers) return null;
        return (
          <div
            key={i}
            className="al-stacked-layer"
            style={{
              top: EDGE,
              left,
              right,
              bottom: EDGE,
              transform: `translateY(${i * GAP}px)`,
              zIndex: 2 - i,
            }}
          >
            <div className="al-stacked-layer-inner">
              {(() => {
                const type = getMediaType({ ...folder, type: (() => { const ext = (url || '').split('.').pop()?.toLowerCase(); if (['mp4','webm','mov','avi'].includes(ext || '')) return 'video'; if (['mp3','wav','ogg','m4a','flac','aac'].includes(ext || '')) return 'audio'; if (['json','txt','csv','md','log','html','xml'].includes(ext || '')) return 'text'; return 'image'; })() });
                if (type === 'image') {
                  return <img src={getThumbUrl(url)} alt="" className="al-stacked-img" loading="eager" />;
                }
                return <div className="al-stacked-placeholder" />;
              })()}
            </div>
          </div>
        );
      })}
      <div className="al-stacked-badge">
        {folder.fileCount}
      </div>
    </div>
  );
}

function MediaThumb({ file, onClick }: { file: AssetFile; onClick: () => void }) {
  const mediaType = getMediaType(file);

  return (
    <div
      className="al-thumb-wrap"
      onClick={onClick}
    >
      {mediaType === 'image' ? (
        <img
          src={getThumbUrl(file.path)}
          alt={file.name}
          loading="eager"
          className="al-thumb-img"
          onError={(e) => { (e.target as HTMLImageElement).style.background = '#334155'; }}
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
      ) : mediaType === 'text' ? (
        <div className="al-thumb-text">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="al-thumb-text-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span className="al-thumb-text-label">{file.name.split('.').pop()?.toUpperCase()}</span>
        </div>
      ) : (
        <div className="al-thumb-audio">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="al-thumb-audio-icon">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
          <span className="al-thumb-text-label">{file.name.split('.').pop()?.toUpperCase()}</span>
        </div>
      )}
      {(mediaType === 'video' || mediaType === 'text') && (
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
              <>
                <button className="al-hdr-btn al-hdr-back" onClick={goBack}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  返回资产库
                </button>
                <span className="al-hdr-title">{currentFolder}</span>
                <span className="al-hdr-count">· {imageFiles.length} 个文件</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="al-hdr-folder-icon">
                  <rect x="3" y="5" width="18" height="14" rx="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                </svg>
                <span className="al-hdr-title">资产库</span>
                <span className="al-hdr-count">· {folders.length} 个文件夹</span>
              </>
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
            <button className="al-hdr-close-btn" onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
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
