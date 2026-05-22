import { useState, useRef, useCallback, useEffect } from 'react';

interface MediaItem {
  url: string;
  name?: string;
  type?: 'image' | 'video' | 'audio' | 'text';
}

interface Props {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (url: string) => void;
}

export default function MediaViewer({ items, initialIndex, onClose, onDelete }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const item = items[index];
  const isImage = item.type === 'image' || (!item.type && /\.(jpe?g|png|gif|webp|bmp|svg)/i.test(item.url));
  const isVideo = item.type === 'video' || (!item.type && /\.(mp4|webm|mov|avi)/i.test(item.url));
  const isAudio = item.type === 'audio' || (!item.type && /\.(mp3|wav|ogg|flac)/i.test(item.url));
  const isText = item.type === 'text' || (!item.type && /\.(txt|json|csv|md|log|html|xml)/i.test(item.url));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  const [copyOk, setCopyOk] = useState(false);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const baseZoomRef = useRef(1);
  const displaySizeRef = useRef({ w: 0, h: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoaded(false);
    displaySizeRef.current = { w: 0, h: 0 };
  }, [index]);

  useEffect(() => {
    if (!isText) { setTextContent(''); return; }
    setTextLoading(true);
    fetch(item.url)
      .then(r => r.ok ? r.text() : '')
      .then(t => { setTextContent(t); setTextLoading(false); })
      .catch(() => { setTextContent('(无法加载内容)'); setTextLoading(false); });
  }, [item?.url, isText]);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const ratio = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      zoomAtPoint(ratio, mx, my);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowLeft') { goPrev(); return; }
      if (e.key === 'ArrowRight') { goNext(); return; }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          zoomAtPoint(1.3, rect.width / 2, rect.height / 2);
        }
        return;
      }
      if (e.key === '-') {
        e.preventDefault();
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          zoomAtPoint(0.77, rect.width / 2, rect.height / 2);
        }
        return;
      }
      if (e.key === '0') { resetView(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index]);

  const zoomAtPoint = (ratio: number, mx: number, my: number) => {
    const { w: nw, h: nh } = displaySizeRef.current;
    const container = containerRef.current;
    const oldZoom = zoomRef.current;
    const newZoom = Math.max(baseZoomRef.current * 0.1, Math.min(baseZoomRef.current * 10, oldZoom * ratio));
    const scale = newZoom / oldZoom;
    let newPanX = panRef.current.x * scale + mx * (1 - scale);
    let newPanY = panRef.current.y * scale + my * (1 - scale);
    if (container && nw > 0 && nh > 0) {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      let xMin: number, xMax: number, yMin: number, yMax: number;
      if (nw * newZoom > cw) {
        xMin = cw - nw * newZoom;
        xMax = 0;
      } else {
        xMin = xMax = (cw - nw * newZoom) / 2;
      }
      if (nh * newZoom > ch) {
        yMin = ch - nh * newZoom;
        yMax = 0;
      } else {
        yMin = yMax = (ch - nh * newZoom) / 2;
      }
      newPanX = Math.max(xMin, Math.min(xMax, newPanX));
      newPanY = Math.max(yMin, Math.min(yMax, newPanY));
    }
    zoomRef.current = newZoom;
    panRef.current = { x: newPanX, y: newPanY };
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const resetView = () => {
    const { w: nw, h: nh } = displaySizeRef.current;
    const container = containerRef.current;
    let initZoom = 1, cx = 0, cy = 0;
    if (container && nw > 0 && nh > 0) {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      initZoom = Math.min(cw / nw, ch / nh, 1);
      cx = (cw - nw * initZoom) / 2;
      cy = (ch - nh * initZoom) / 2;
    }
    setZoom(initZoom);
    zoomRef.current = initZoom;
    setPan({ x: cx, y: cy });
    panRef.current = { x: cx, y: cy };
  };

  const goPrev = () => setIndex(i => (i > 0 ? i - 1 : items.length - 1));
  const goNext = () => setIndex(i => (i < items.length - 1 ? i + 1 : 0));

  const onMouseDown = (e: React.MouseEvent) => {
    const { w: nw, h: nh } = displaySizeRef.current;
    const container = containerRef.current;
    if (container && nw * zoomRef.current <= container.clientWidth && nh * zoomRef.current <= container.clientHeight) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const container = containerRef.current;
    if (!container) return;
    const z = zoomRef.current;
    const { w: nw, h: nh } = displaySizeRef.current;
    const newX = e.clientX - panStartRef.current.x;
    const newY = e.clientY - panStartRef.current.y;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    let xMin: number, xMax: number, yMin: number, yMax: number;
    if (nw * z > cw) {
      xMin = cw - nw * z;
      xMax = 0;
    } else {
      xMin = xMax = (cw - nw * z) / 2;
    }
    if (nh * z > ch) {
      yMin = ch - nh * z;
      yMax = 0;
    } else {
      yMin = yMax = (ch - nh * z) / 2;
    }
    const clampedX = Math.max(xMin, Math.min(xMax, newX));
    const clampedY = Math.max(yMin, Math.min(yMax, newY));
    setPan({ x: clampedX, y: clampedY });
    panRef.current = { x: clampedX, y: clampedY };
  };

  const onMouseUp = () => setIsPanning(false);

  return (
    <div className="mv-overlay" ref={overlayRef} onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="mv-toolbar">
        <div className="mv-toolbar-left">
          {items.length > 1 && <span className="mv-counter">{index + 1} / {items.length}</span>}
          {item.name && <span className="mv-name">{item.name}</span>}
        </div>
        <div className="mv-toolbar-right">
          {isImage && (
            <>
              <button className="mv-btn" onClick={() => { const c = containerRef.current; if (!c) return; const r = c.getBoundingClientRect(); zoomAtPoint(1.3, r.width/2, r.height/2); }} title="放大 (+)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
              <button className="mv-btn" onClick={() => { const c = containerRef.current; if (!c) return; const r = c.getBoundingClientRect(); zoomAtPoint(0.77, r.width/2, r.height/2); }} title="缩小 (-)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
              <span className="mv-zoom-pct">{Math.round(zoom / baseZoomRef.current * 100)}%</span>
              <button className="mv-btn" onClick={resetView} title="重置 (0)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <div className="mv-toolbar-divider" />
            </>
          )}
          {isText && (
            <>
              <button className="mv-btn" onClick={async () => { try { await navigator.clipboard.writeText(textContent); setCopyOk(true); setTimeout(() => setCopyOk(false), 1500); } catch {} }} title="复制内容">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
              {copyOk && <span className="mv-copy-ok">已复制</span>}
              <div className="mv-toolbar-divider" />
            </>
          )}
          {onDelete && (
            <>
              <button className="mv-btn mv-btn-del" onClick={() => onDelete(item.url)} title="删除文件">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
              <div className="mv-toolbar-divider" />
            </>
          )}
          <button className="mv-btn" onClick={onClose} title="关闭 (Esc)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div className="mv-body" ref={containerRef} onClick={e => e.stopPropagation()}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          cursor: isImage && loaded ? ((() => {
            const { w: nw, h: nh } = displaySizeRef.current;
            const c = containerRef.current;
            if (!c) return 'default';
            if (nw * zoom > c.clientWidth || nh * zoom > c.clientHeight) {
              return isPanning ? 'grabbing' : 'grab';
            }
            return 'zoom-out';
          })()) : 'default'
        }}
      >
        {items.length > 1 && (
          <button className="mv-nav mv-prev" onClick={e => { e.stopPropagation(); goPrev(); }} title="上一个 (←)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}

        {isImage ? (
          <img
            ref={imgRef}
            src={item.url}
            alt=""
            draggable={false}
            className={loaded ? 'mv-img-pan' : 'mv-img-fit'}
            style={loaded ? {
              transformOrigin: '0 0',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            } : undefined}
            onClick={e => e.stopPropagation()}
            onLoad={(e) => {
              const img = e.currentTarget;
              const container = containerRef.current;
              if (!container) return;
              const cw = container.clientWidth;
              const ch = container.clientHeight;
              const nw = img.naturalWidth || 1;
              const nh = img.naturalHeight || 1;
              const initZoom = Math.min(cw / nw, ch / nh, 1);
              const cx = (cw - nw * initZoom) / 2;
              const cy = (ch - nh * initZoom) / 2;
              displaySizeRef.current = { w: nw, h: nh };
              baseZoomRef.current = initZoom;
              zoomRef.current = initZoom;
              panRef.current = { x: cx, y: cy };
              setZoom(initZoom);
              setPan({ x: cx, y: cy });
              setLoaded(true);
            }}
          />
        ) : isVideo ? (
          <video src={item.url} controls className="mv-media" onClick={e => e.stopPropagation()} />
        ) : isAudio ? (
          <div className="mv-audio-wrap" onClick={e => e.stopPropagation()}>
            <audio src={item.url} controls />
          </div>
        ) : isText ? (
          <div className="mv-text-wrap" onClick={e => e.stopPropagation()}>
            {textLoading ? <div className="mv-text-loading">加载中...</div> : <pre className="mv-text-content">{textContent}</pre>}
          </div>
        ) : (
          <div className="mv-media" onClick={e => e.stopPropagation()}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="mv-download-link">打开文件</a>
          </div>
        )}

        {items.length > 1 && (
          <button className="mv-nav mv-next" onClick={e => { e.stopPropagation(); goNext(); }} title="下一个 (→)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
