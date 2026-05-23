import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Home from './pages/Home';
import ModelDetailPage from './pages/ModelDetail';
import ApiKeySettings from './components/ApiKeySettings';
import AssetLibrary from './components/AssetLibrary';
import { loadApiKeyFromBackend } from './api/client';
import './index.css';

function PcModelzooRedirect() {
  const { '*': splat } = useParams();
  if (!splat || splat === '/') return <Navigate to="/" replace />;
  return <Navigate to={`/model/${splat.replace(/^\//, '')}`} replace />;
}

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assetLibOpen, setAssetLibOpen] = useState(false);

  useEffect(() => { loadApiKeyFromBackend(); }, []);

  return (
    <BrowserRouter>
      <div className="app">
        <main className="main">
          <Routes>
            <Route path="/" element={<Home onOpenSettings={() => setSettingsOpen(true)} onOpenAssetLibrary={() => setAssetLibOpen(true)} />} />
            <Route path="/pc/modelzoo" element={<Navigate to="/" replace />} />
            <Route path="/pc/modelzoo/*" element={<PcModelzooRedirect />} />
            <Route path="/model/*" element={<ModelDetailPage onOpenSettings={() => setSettingsOpen(true)} onOpenAssetLibrary={() => setAssetLibOpen(true)} />} />
          </Routes>
        </main>
        <ApiKeySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        {assetLibOpen && <AssetLibrary onClose={() => setAssetLibOpen(false)} />}
      </div>
    </BrowserRouter>
  );
}
