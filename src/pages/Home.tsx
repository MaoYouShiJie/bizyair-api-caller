import { useState, useEffect, useRef, useCallback } from 'react';
import { proxyFetch } from '../api/client';
import { Link } from 'react-router-dom';
import type { ModelItem, Category } from '../types';

const zhCategory: Record<string, string> = {
  'Text to Image': '文生图', 'Image to Image': '图生图',
  'Text to Video': '文生视频', 'Image to Video': '图生视频',
  'Reference to Video': '参考生视频', 'Video Edit': '视频编辑',
  'Video Extend': '视频延长', 'Text to Speech': '语音合成',
  'Large Language Models': '大语言模型', 'Vision': '视觉',
  'FLF to Video': '首尾帧生视频',
};

function getModelIcon(model: ModelItem): string {
  if (model.model_name?.startsWith('bza-image-b')) return '/icons/nano-banana.png';
  if (model.model_name?.startsWith('bza-vision-g') || model.model_name?.startsWith('bza-chat-g')) return '/icons/gemini.png';
  return model.icon_url || model.background_url || '';
}

function CardImage({ model: m, failedImages, markFailed }: { model: ModelItem; failedImages: Set<number>; markFailed: (id: number) => void }) {
    const src = getModelIcon(m);
    if (failedImages.has(m.id) || !src) {
      const letter = (m.manufacturer || m.display_name)[0].toUpperCase();
      return (
        <div className="model-card-placeholder">{letter}</div>
      );
    }
    return (
      <img
        src={src}
        alt={m.display_name}
        onError={() => markFailed(m.id)}
      />
    );
}

const FILTER_KEY = 'home_filters';

function loadFilter(key: string, fallback: string) {
  try { return JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}')[key] ?? fallback; }
  catch { return fallback; }
}
function saveFilter(key: string, val: string) {
  try {
    const data = JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}');
    data[key] = val;
    sessionStorage.setItem(FILTER_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export default function Home({ onOpenSettings, onOpenAssetLibrary }: { onOpenSettings?: () => void; onOpenAssetLibrary?: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState(() => loadFilter('category', ''));
  const [activeTag, setActiveTag] = useState(() => loadFilter('tag', ''));
  const [keyword, setKeyword] = useState(() => loadFilter('keyword', ''));
  const [searchInput, setSearchInput] = useState(() => loadFilter('searchInput', ''));
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recently_add');
  const pageSize = 200;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { saveFilter('category', activeCategory); }, [activeCategory]);
  useEffect(() => { saveFilter('tag', activeTag); }, [activeTag]);
  useEffect(() => { saveFilter('keyword', keyword); }, [keyword]);
  useEffect(() => { saveFilter('searchInput', searchInput); }, [searchInput]);

  useEffect(() => {
    proxyFetch<{ data: { list: Category[] } }>('/x/v1/modelzoo/categories')
      .then(r => setCategories(r.data.list || []))
      .catch(() => {});
    proxyFetch<{ data: { tags: string[] } }>('/x/v1/modelzoo/tags')
      .then(r => setTags(r.data.tags || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setKeyword(searchInput);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    const body: Record<string, unknown> = { page_size: pageSize, sort: sortBy, current: 1 };
    if (activeCategory) body.categories = [activeCategory];
    if (activeTag) body.tags = [activeTag];
    if (keyword.trim()) body.keyword = keyword.trim();

    proxyFetch<{ data: { list: ModelItem[]; total: number } }>('/x/v1/modelzoo/list', {
      method: 'POST',
      body: JSON.stringify(body),
    })
      .then(r => { setModels(r.data.list || []); setTotal(r.data.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCategory, activeTag, keyword, sortBy]);

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(activeCategory === cat ? '' : cat);
  };

  const handleTagClick = (tag: string) => {
    setActiveTag(activeTag === tag ? '' : tag);
  };

  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const markFailed = useCallback((id: number) => {
    setFailedImages(prev => new Set(prev).add(id));
  }, []);

  return (
    <div className="home-page">
        <div className="page-header">
          <div className="page-header-top">
            <img src="/logo.png" alt="BizyAir" className="page-logo" />
            <span style={{fontSize:'11px',color:'var(--text-muted)',marginLeft:'4px',alignSelf:'flex-end',marginBottom:'3px'}}>v0.0.1</span>
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
          </div>
          <p>选择模型并在线调用，输入参数即可获得生成结果</p>
        </div>

      <div className="home-layout">
        <aside className="sidebar">
          <div className="sidebar-title">筛选</div>
          <button
            className={`sidebar-item ${activeCategory === '' ? 'active' : ''}`}
            onClick={() => setActiveCategory('')}
          >
            全部
          </button>
          {categories.map(c => (
            <button
              key={c.category}
              className={`sidebar-item ${activeCategory === c.category ? 'active' : ''}`}
              onClick={() => handleCategoryClick(c.category)}
            >
              <span>{zhCategory[c.category] || c.category}</span>
              <span className="sidebar-count">{c.api_count}</span>
            </button>
          ))}
        </aside>

        <div className="content-area">
          <div className="search-bar">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="搜索模型名称、关键词..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className="search-clear" onClick={() => { setSearchInput(''); setKeyword(''); }}>
                ×
              </button>
            )}
          </div>

          <div className="filter-tags">
            <button
               className={`tag ${activeTag === '' ? 'active' : ''}`}
               onClick={() => setActiveTag('')}
            >
               全部
             </button>
            {tags.map(tag => (
              <button
                key={tag}
                className={`tag ${activeTag === tag ? 'active' : ''}`}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="content-toolbar">
            <div className="toolbar-left">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="网格视图"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="列表视图"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="14" height="3" rx="1" />
                  <rect x="1" y="6.5" width="14" height="3" rx="1" />
                  <rect x="1" y="12" width="14" height="3" rx="1" />
                </svg>
              </button>
            </div>
            <div className="toolbar-right">
              <select
                className="sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="recently_add">最近添加</option>
                <option value="most_popular">最多调用</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner" />
              <p>加载模型中...</p>
            </div>
          ) : models && models.length > 0 ? (
            <>
              <div className="model-count">{total} 个模型</div>
              {viewMode === 'grid' ? (
                <div className="model-grid">
                  {models.map(model => (
                    <Link
                      key={model.id}
                      to={`/model/${model.endpoint}`}
                      className="model-card"
                    >
                      <div className="model-card-img">
                        <CardImage model={model} failedImages={failedImages} markFailed={markFailed} />
                        {model.new_tag && <span className="badge-new">NEW</span>}
                      </div>
                      <div className="model-card-body">
                        <h3>{model.display_name}</h3>
                        <p>{model.description}</p>
                        <div className="model-card-footer">
                          <span className="model-manufacturer">{model.manufacturer}</span>
                          <span className="model-category">{zhCategory[model.category] || model.category}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="model-list">
                  {models.map(model => (
                    <Link
                      key={model.id}
                      to={`/model/${model.endpoint}`}
                      className="model-list-card"
                    >
                      <div className="model-list-thumb">
                        <CardImage model={model} failedImages={failedImages} markFailed={markFailed} />
                        {model.new_tag && <span className="badge-new">NEW</span>}
                      </div>
                      <div className="model-list-body">
                        <h3>{model.display_name}</h3>
                        <div className="model-list-meta">
                          <span className="model-manufacturer">{model.manufacturer}</span>
                          <span className="model-category">{zhCategory[model.category] || model.category}</span>
                        </div>
                        <p>{model.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">没有找到匹配的模型</div>
          )}
        </div>
      </div>
    </div>
  );
}
