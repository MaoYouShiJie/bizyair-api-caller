const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');

let BACKEND_PORT = 3004;
let ELECTRON_PORT = 30002;
const isDev = !!process.env.VITE_DEV_SERVER_URL;
const VITE_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

let mainWindow;
let electronServer;
let backendServer;
let lastSavePath = '';

function createWindow() {
  app.commandLine.appendSwitch('disable-features', 'msNetworkCost');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'BizyAirAPI 调用',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    show: false,
    backgroundColor: '#020617',
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; ` +
          `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}; ` +
          `style-src 'self' 'unsafe-inline'; ` +
          `img-src 'self' data: https://*.aliyuncs.com https://bizyair.cn https://api.bizyair.cn https://storage.bizyair.cn; ` +
          `media-src 'self' https://*.aliyuncs.com https://bizyair.cn https://api.bizyair.cn https://storage.bizyair.cn; ` +
          `connect-src 'self' https://*.aliyuncs.com https://bizyair.cn https://api.bizyair.cn https://storage.bizyair.cn ws://localhost:5173 ws://localhost:5174; ` +
          `font-src 'self' data:`
        ]
      }
    });
  });

  mainWindow.loadURL(isDev ? VITE_URL : `http://localhost:${ELECTRON_PORT}`).catch(err => {
    mainWindow.loadURL(`data:text/html,<h2>Error: ${err.message}</h2>`);
    mainWindow.show();
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('http://localhost')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('select-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择图片保存目录',
      defaultPath: lastSavePath,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false };
    }
    lastSavePath = result.filePaths[0];
    return { success: true, folder: lastSavePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

function proxyRequest(req, res, targetHost, targetPort, useTls) {
  const mod = useTls ? https : http;
  const options = {
    hostname: targetHost,
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: targetHost },
  };

  const proxyReq = mod.request(options, (proxyRes) => {
    const responseHeaders = { ...proxyRes.headers };
    delete responseHeaders['transfer-encoding'];
    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502);
      res.end('Proxy error');
    }
  });

  req.pipe(proxyReq, { end: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveStaticFile(filePath, req, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

async function startElectronServer() {
  const distDir = path.join(__dirname, '..', 'dist');
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = ELECTRON_PORT + attempt;
    try {
      await new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
          const url = req.url.split('?')[0];

          if (url.startsWith('/api/gallery') || url.startsWith('/api/save-outputs') ||
              url.startsWith('/api/thumbnail') || url.startsWith('/api/config') ||
              url.startsWith('/api/history') || url.startsWith('/api/upload-input') ||
              url.startsWith('/api/balance')) {
            return proxyRequest(req, res, 'localhost', BACKEND_PORT, false);
          }

          if (url.startsWith('/api/x')) {
            return proxyRequest(req, res, 'bizyair.cn', 443, true);
          }

          if (url.startsWith('/api/w')) {
            return proxyRequest(req, res, 'api.bizyair.cn', 443, true);
          }

          if (url.startsWith('/x')) {
            return proxyRequest(req, res, 'api.bizyair.cn', 443, true);
          }

          if (url.startsWith('/w')) {
            return proxyRequest(req, res, 'api.bizyair.cn', 443, true);
          }

          if (url.startsWith('/输出') || url.startsWith('/%E8%BE%93%E5%87%BA')) {
            return proxyRequest(req, res, 'localhost', BACKEND_PORT, false);
          }

          const decodedUrl = (() => { try { return decodeURIComponent(url); } catch { return url; } })();
          const distExt = path.extname(decodedUrl);
          if (distExt && distExt !== '/') {
            return serveStaticFile(path.join(distDir, decodedUrl), req, res);
          }

          serveStaticFile(path.join(distDir, 'index.html'), req, res);
        });

        server.listen(port, () => {
          electronServer = server;
          console.log(`Electron server on http://localhost:${port}`);
          ELECTRON_PORT = port;
          resolve();
        });

        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} in use, trying ${port + 1}...`);
            reject(err);
          } else {
            reject(err);
          }
        });
      });
      return;
    } catch (e) {
      if (e.code !== 'EADDRINUSE') throw e;
    }
  }
  throw new Error('All Electron ports in use');
}

async function startBackend(userDataPath) {
  const backendPath = path.join(__dirname, '..', 'backend', 'server.cjs');
  const mod = require(backendPath);
  const ports = [BACKEND_PORT, BACKEND_PORT + 1, BACKEND_PORT + 2];
  for (const port of ports) {
    try {
      const server = await mod.startServer({ userDataPath, port, persistDir: app.getPath('userData') });
      BACKEND_PORT = port;
      return server;
    } catch (e) {
      if (e.code !== 'EADDRINUSE') throw e;
      console.log(`Port ${port} in use, trying ${port + 1}`);
    }
  }
  throw new Error('All backend ports in use');
}

let isQuitting = false;
function cleanup() {
  if (isQuitting) return;
  isQuitting = true;
  if (electronServer) electronServer.close();
  if (backendServer) backendServer.close();
  app.quit();
}

app.whenReady().then(async () => {
  const userDataPath = app.isPackaged
    ? (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath))
    : path.join(__dirname, '..');

  if (isDev) {
    createWindow();
    mainWindow.webContents.openDevTools();
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') mainWindow.webContents.toggleDevTools();
    });
  } else {
    backendServer = await startBackend(userDataPath);
    await new Promise(r => setTimeout(r, 2000));
    await startElectronServer();
    createWindow();
    if (mainWindow) {
      mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') mainWindow.webContents.toggleDevTools();
      });
    }
  }
});

app.on('window-all-closed', cleanup);
app.on('before-quit', cleanup);
