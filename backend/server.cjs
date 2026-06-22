const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3004;
const upload = multer({ storage: multer.memoryStorage() });

let dataDir = path.join(__dirname, '..');
if (dataDir.includes('app.asar')) {
  try { dataDir = require('electron')?.app?.getPath?.('userData') || path.join(__dirname, '..', '..'); } catch {}
}
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
    historyPath = path.join(dataDir, 'history.json');
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

function extType(ext, filePath) {
  const e = ext.toLowerCase();
  if (['.jpg','.jpeg','.png','.gif','.webp','.bmp','.svg'].includes(e)) {
    if (filePath) {
      try {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(8);
        fs.readSync(fd, buf, 0, 8, 0);
        fs.closeSync(fd);
        if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image';
        if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image';
        if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image';
        return 'text';
      } catch { return 'text'; }
    }
    return 'image';
  }
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

function needsDownload(url) {
  return /^https?:\/\//i.test(url) || url.startsWith('data:');
}

async function downloadOutputs(outputs, appName) {
  const today = new Date().toISOString().split('T')[0];
  const name = appName || '未知应用';
  const baseDir = path.join(saveDir, name, today);
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
  const localOutputs = {};

  for (const [mimeKey, urls] of Object.entries(outputs)) {
    if (!Array.isArray(urls)) continue;
    localOutputs[mimeKey] = [];
    for (const url of urls) {
      if (!needsDownload(url)) {
        results.push({ success: true, url });
        localOutputs[mimeKey].push(url);
        continue;
      }

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

      const fileName = `${name}-${today}-${String(counter).padStart(5, '0')}${ext}`;
      const fp = path.join(baseDir, fileName);

      try {
        let buffer;
        if (url.startsWith('data:')) {
          buffer = Buffer.from(url.split(',')[1], 'base64');
        } else {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          buffer = Buffer.from(await resp.arrayBuffer());
        }
        if (!buffer || buffer.length === 0) continue;
        fs.writeFileSync(fp, buffer);
        const localUrl = `/输出/${encodeURIComponent(name)}/${today}/${encodeURIComponent(fileName)}`;
        results.push({ success: true, fileName, filePath: fp, url: localUrl });
        localOutputs[mimeKey].push(localUrl);
      } catch (e) {
        results.push({ success: false, error: e.message, url });
        localOutputs[mimeKey].push(url);
      }
    }
  }

  return {
    saved: results.filter(r => r.success).length,
    results,
    localOutputs,
  };
}

app.post('/api/save-outputs', async (req, res) => {
  try {
    const { outputs, app_name } = req.body;
    if (!outputs) return res.status(400).json({ error: 'outputs required' });
    const result = await downloadOutputs(outputs, app_name);
    res.json({ success: true, saved: result.saved, results: result.results });
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
          const type = extType(ext, fullPath);
          if (!type || type === 'other') continue;
          const stat = fs.statSync(fullPath);
          let relativePath = item.name;
          if (currentDate) relativePath = `${currentDate}/${relativePath}`;
          if (currentApp) relativePath = `${currentApp}/${relativePath}`;
          const fileUrl = `/输出/${relativePath}`;
          let preview = '';
          if (type === 'text') {
            try {
              preview = fs.readFileSync(fullPath, 'utf8').slice(0, 200).replace(/\n/g, ' ');
            } catch {}
          }
          files.push({
            name: item.name,
            path: fileUrl,
            url: fileUrl,
            app: currentApp || '未分类',
            date: currentDate || '未知日期',
            size: stat.size,
            mtime: stat.mtimeMs,
            type,
            preview,
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
      const covers = appFiles.slice(0, 3).map(f => ({ path: f.path, type: f.type, preview: f.preview || '' }));
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
let historyPath = path.join(dataDir, 'history.json');

function loadHistory() {
  const seed = loadHistoryFile(historyPath);
  return seed;
}

function loadHistoryFile(p) {
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
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
    const records = h[ep] || [];
    res.json({ records });
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

function getApiKey() {
  try {
    const s = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return s.apiKey || '';
  } catch { return ''; }
}

function ossPut(bucket, endpoint, objectKey, fileBuffer, contentType, stsToken, accessKeyId, accessKeySecret) {
  return new Promise((resolve, reject) => {
    const date = new Date().toUTCString();
    const ossHeaders = `x-oss-security-token:${stsToken}`;
    const resource = `/${bucket}/${objectKey}`;
    const stringToSign = `PUT\n\n${contentType}\n${date}\n${ossHeaders}\n${resource}`;
    const signature = crypto.createHmac('sha1', accessKeySecret).update(stringToSign).digest('base64');
    const auth = `OSS ${accessKeyId}:${signature}`;

    const host = `${bucket}.${endpoint}`;
    const options = {
      hostname: host, port: 443, path: '/' + objectKey, method: 'PUT',
      headers: {
        'Content-Type': contentType, 'Content-Length': fileBuffer.length,
        'Date': date, 'Authorization': auth, 'x-oss-security-token': stsToken,
      }
    };
    const req = require('https').request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'GET', headers };
    const req = require('https').request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(body); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const opts = {
      hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = require('https').request(opts, (res) => {
      let resp = '';
      res.on('data', c => resp += c);
      res.on('end', () => {
        try { resolve(JSON.parse(resp)); } catch { resolve(resp); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

app.get('/api/balance', async (req, res) => {
  try {
    const apiKey = req.query.key || getApiKey();
    if (!apiKey) return res.status(400).json({ error: 'API Key not provided' });
    const data = await httpsGet('https://api.bizyair.cn/y/v1/wallet',
      { 'Authorization': `Bearer ${apiKey}` });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/upload-input', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const apiKey = req.body.api_key || getApiKey();
    if (!apiKey) return res.status(400).json({ error: 'API Key not configured' });

    const fileName = req.body.name || req.file.originalname;
    const fileBuffer = req.file.buffer;
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    // Step 1: Get STS upload token
    const tokenResp = await httpsGet(`https://api.bizyair.cn/x/v1/upload/token?file_name=${encodeURIComponent(fileName)}&file_type=inputs`,
      { 'Authorization': `Bearer ${apiKey}` });

    if (!tokenResp?.data?.file) throw new Error('Failed to get upload token: ' + JSON.stringify(tokenResp));
    const { object_key, access_key_id, access_key_secret, security_token } = tokenResp.data.file;
    const { endpoint: ossEndpoint, bucket } = tokenResp.data.storage;

    // Step 2: Upload to OSS
    const uploadResult = await ossPut(bucket, ossEndpoint, object_key, fileBuffer, contentType, security_token, access_key_id, access_key_secret);
    if (uploadResult.status !== 200) throw new Error(`OSS upload failed: ${uploadResult.status} ${uploadResult.body}`);

    // Step 3: Commit the resource
    const commitResp = await httpsPost('https://api.bizyair.cn/x/v1/input_resource/commit',
      { 'Authorization': `Bearer ${apiKey}` },
      { name: fileName, object_key });

    if (!commitResp?.data?.url) throw new Error('Failed to commit: ' + JSON.stringify(commitResp));

    res.json({ success: true, url: commitResp.data.url });
  } catch (e) {
    console.error('Upload error:', e.message);
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
