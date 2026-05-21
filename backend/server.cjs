const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3004;

let dataDir = path.join(__dirname, '..');
let configPath = path.join(dataDir, 'config.json');
let saveDir = '';
let apiKey = '';

function loadSettings() {
  try {
    if (fs.existsSync(configPath)) {
      const s = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (s.saveDir && fs.existsSync(s.saveDir)) {
        saveDir = s.saveDir;
      } else {
        saveDir = path.join(dataDir, '输出');
      }
      apiKey = s.apiKey || '';
      return s;
    }
  } catch {}
  saveDir = path.join(dataDir, '输出');
  return {};
}

function saveSettings(settings) {
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch {}
  fs.writeFileSync(configPath, JSON.stringify({ ...existing, ...settings }, null, 2), 'utf8');
}

loadSettings();

function startServer(options = {}) {
  return new Promise((resolve, reject) => {
    if (options.userDataPath) dataDir = options.userDataPath;
    configPath = path.join(dataDir, 'config.json');
    const port = options.port || PORT;
    loadSettings();
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    const server = app.listen(port, () => {
      console.log(`Backend server on http://localhost:${port}`);
      console.log(`Save dir: ${saveDir}`);
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') return reject(err);
      reject(err);
    });
  });
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const MIME_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.flac': 'audio/flac', '.aac': 'audio/aac',
  '.txt': 'text/plain', '.json': 'application/json', '.md': 'text/markdown',
};

function extType(ext) {
  const e = ext.toLowerCase();
  if (['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg'].includes(e)) return 'image';
  if (['.mp4','.webm','.mov','.avi','.mkv'].includes(e)) return 'video';
  if (['.mp3','.wav','.ogg','.flac','.aac'].includes(e)) return 'audio';
  if (['.txt','.json','.md'].includes(e)) return 'text';
  return 'other';
}

app.get('/api/config/save-dir', (req, res) => {
  res.json({ saveDir: saveDir || '' });
});

app.put('/api/config/save-dir', (req, res) => {
  const { dir } = req.body;
  if (!dir) return res.status(400).json({ error: 'dir required' });
  const outputDir = path.join(dir, '输出');
  saveDir = fs.existsSync(outputDir) ? outputDir : dir;
  saveSettings({ saveDir });
  res.json({ success: true, saveDir });
});

app.get('/api/config/api-key', (req, res) => {
  res.json({ apiKey: apiKey || '' });
});

app.put('/api/config/api-key', (req, res) => {
  const { apiKey: key } = req.body;
  apiKey = key || '';
  saveSettings({ apiKey });
  res.json({ success: true });
});

app.post('/api/save-outputs', async (req, res) => {
  try {
    const { outputs, app_name } = req.body;
    if (!outputs) return res.status(400).json({ error: 'outputs required' });

    const today = new Date().toISOString().split('T')[0];
    const appName = app_name || '未知应用';
    const baseDir = path.join(saveDir, appName, today);
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    let maxCounter = 0;
    try {
      const existing = fs.readdirSync(baseDir);
      for (const f of existing) {
        const m = f.match(/-(\d{5})\.[^.]+$/);
        if (m) maxCounter = Math.max(maxCounter, parseInt(m[1], 10));
      }
    } catch {}

    const results = [];
    let counter = maxCounter;

    for (const [mimeKey, urls] of Object.entries(outputs)) {
      if (!Array.isArray(urls)) continue;
      for (const url of urls) {
        counter++;
        const isVideo = mimeKey.includes('video');
        const isAudio = mimeKey.includes('audio');
        let ext = '.png';
        if (isVideo) ext = '.mp4';
        else if (isAudio) ext = '.mp3';
        else {
          const u = url.split('?')[0];
          const m = u.match(/\.(\w+)$/);
          if (m) ext = '.' + m[1];
        }

        const fileName = `${appName}-${today}-${String(counter).padStart(5, '0')}${ext}`;
        const fp = path.join(baseDir, fileName);

        try {
          let buffer;
          if (url.startsWith('data:')) {
            buffer = Buffer.from(url.split(',')[1], 'base64');
          } else if (/^https?:\/\//i.test(url)) {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            buffer = Buffer.from(await resp.arrayBuffer());
          } else {
            buffer = Buffer.from(url);
          }
          if (!buffer || buffer.length === 0) continue;
          fs.writeFileSync(fp, buffer);
          results.push({
            success: true,
            fileName,
            filePath: fp,
            url: `/输出/${encodeURIComponent(appName)}/${today}/${encodeURIComponent(fileName)}`,
          });
        } catch (e) {
          results.push({ success: false, error: e.message, url });
        }
      }
    }

    res.json({
      success: true,
      saved: results.filter(r => r.success).length,
      results,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/gallery', (req, res) => {
  try {
    const { app_name, sort_by = 'date', sort_order = 'desc' } = req.query;
    if (!fs.existsSync(saveDir)) return res.json({ files: [], apps: [] });

    const files = [];
    const apps = new Set();
    const dates = new Set();

    const scanDir = (dir, currentApp = '', currentDate = '') => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const item of entries) {
        if (item.name.startsWith('.')) continue;
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(item.name)) {
            scanDir(fullPath, currentApp, item.name);
            dates.add(item.name);
          } else {
            scanDir(fullPath, item.name, currentDate);
            apps.add(item.name);
          }
        } else {
          const ext = path.extname(item.name).toLowerCase();
          const type = extType(ext);
          if (!type || type === 'other') continue;
          const stat = fs.statSync(fullPath);
          let relativePath = item.name;
          if (currentDate) relativePath = `${currentDate}/${relativePath}`;
          if (currentApp) relativePath = `${currentApp}/${relativePath}`;
          const fileUrl = `/输出/${relativePath}`;
          files.push({
            name: item.name,
            path: fileUrl,
            url: fileUrl,
            app: currentApp || '未分类',
            date: currentDate || '未知日期',
            size: stat.size,
            mtime: stat.mtimeMs,
            type,
          });
        }
      }
    };

    scanDir(saveDir);

    let filtered = files;
    if (app_name) filtered = filtered.filter(f => f.app === app_name);

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sort_by === 'date') cmp = a.mtime - b.mtime;
      else if (sort_by === 'name') cmp = a.name.localeCompare(b.name);
      else if (sort_by === 'size') cmp = a.size - b.size;
      return sort_order === 'desc' ? -cmp : cmp;
    });

    if (app_name) {
      return res.json({ files: filtered });
    }

    const folders = [];
    for (const appName of Array.from(apps).sort()) {
      const appFiles = filtered.filter(f => f.app === appName);
      if (appFiles.length === 0) continue;
      const covers = appFiles.filter(f => f.type === 'image').slice(0, 3).map(f => f.path);
      folders.push({ name: appName, fileCount: appFiles.length, covers });
    }

    res.json({ files: filtered, apps: Array.from(apps).sort(), folders });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use((req, res, next) => {
  try {
    const rawPath = req.path;
    const decodedPath = (() => { try { return decodeURIComponent(rawPath); } catch { return rawPath; } })();
    if (!decodedPath.startsWith('/输出') && !rawPath.startsWith('/%E8%BE%93%E5%87%BA')) return next();
    const relativePath = decodedPath.replace('/输出/', '');
    const fp = path.join(saveDir, relativePath);
    if (fp.startsWith(saveDir) && fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      return res.sendFile(fp);
    }
  } catch {}
  next();
});

app.delete('/api/gallery', (req, res) => {
  try {
    const { file_path } = req.body;
    if (!file_path) return res.status(400).json({ error: 'file_path required' });
    const relativePath = file_path.replace(/^\/输出\//, '');
    const fp = path.join(saveDir, relativePath);
    if (!fp.startsWith(saveDir)) return res.status(403).json({ error: 'Forbidden' });
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'not found' });
    fs.unlinkSync(fp);
    const dateDir = path.dirname(fp);
    try {
      if (fs.readdirSync(dateDir).length === 0) fs.rmdirSync(dateDir);
      const modelDir = path.dirname(dateDir);
      if (fs.readdirSync(modelDir).length === 0) fs.rmdirSync(modelDir);
    } catch {}
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/thumbnail', async (req, res) => {
  try {
    const p = req.query.path;
    if (!p) return res.status(400).send('Missing path');
    const decodedPath = decodeURIComponent(p.replace(/^\/输出\//, ''));
    const sourceFile = path.join(saveDir, decodedPath);
    if (!sourceFile.startsWith(saveDir)) return res.status(403).send('Forbidden');
    if (!fs.existsSync(sourceFile)) return res.status(404).send('Not found');

    const imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    if (!imgExts.includes(path.extname(sourceFile).toLowerCase())) {
      return res.status(400).send('Not an image');
    }

    const thumbDir = path.join(dataDir, '.thumbcache');
    if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
    const thumbRel = decodedPath.replace(/[\\\/:]/g, '_');
    const thumbFile = path.join(thumbDir, thumbRel);

    if (fs.existsSync(thumbFile)) {
      return res.sendFile(thumbFile, { maxAge: '7d', cacheControl: true });
    }

    try {
      const sharp = require('sharp');
      await sharp(sourceFile)
        .resize(360, 360, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 60 })
        .toFile(thumbFile);
      res.sendFile(thumbFile, { maxAge: '7d', cacheControl: true });
    } catch {
      res.sendFile(sourceFile);
    }
  } catch (e) {
    res.status(500).send('Thumbnail error');
  }
});

// === History routes ===
const historyPath = path.join(dataDir, 'history.json');

function loadHistory() {
  try {
    if (fs.existsSync(historyPath)) {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch {}
  return {};
}

function saveHistory(h) {
  fs.writeFileSync(historyPath, JSON.stringify(h, null, 2), 'utf8');
}

app.get('/api/history/:endpoint', (req, res) => {
  try {
    const ep = req.params.endpoint;
    const h = loadHistory();
    res.json({ records: h[ep] || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/history/:endpoint', (req, res) => {
  try {
    const ep = req.params.endpoint;
    const { formValues, outputs, taskId } = req.body;
    if (!formValues) return res.status(400).json({ error: 'formValues required' });
    const h = loadHistory();
    if (!h[ep]) h[ep] = [];
    h[ep].unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      formValues,
      outputs: outputs || {},
      taskId: taskId || '',
      timestamp: new Date().toISOString(),
    });
    saveHistory(h);
    res.json({ success: true, count: h[ep].length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/history/:endpoint/:id', (req, res) => {
  try {
    const { endpoint: ep, id } = req.params;
    const h = loadHistory();
    if (h[ep]) {
      h[ep] = h[ep].filter(r => r.id !== id);
      saveHistory(h);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = { startServer };

if (require.main === module && !process.env.ELECTRON_PROD) {
  startServer().catch(e => {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  });
}
