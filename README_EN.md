<p align="center">
  <img src="public/logo002.png" width="200" alt="BizyAir API 工具" />
</p>

<h1 align="center">BizyAir Model Inference <sup><code>v0.0.1</code></sup></h1>

<p align="center">
  <a href="README.md">🇨🇳 中文</a>
</p>

<p align="center">
  <b>An unofficial desktop client for BizyAir API — model browsing, parameter configuration, task submission, asset management, all in one place</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-35-47848F?logo=electron&logoColor=white" alt="Electron 35" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white" alt="Express 4" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
</p>

---

## <img src="icon.png" width="36" height="36" alt="" style="vertical-align:-8px;margin-right:6px"> About BizyAir.cn

**[BizyAir.cn](https://bizyair.cn)** — A ready-to-use cloud AI creation space powered by ComfyUI, operated by Beijing SiliconFlow Technology Co., Ltd. It seamlessly connects cloud GPU resources with local ComfyUI, solving the problem of insufficient local computing power. Built-in with numerous curated models and nodes, ready to use out of the box with no complex configuration required.

> 📖 Docs: [docs.bizyair.cn](https://docs.bizyair.cn)

---

## 🎯 Project Overview

**BizyAir Model Inference** is a desktop client that lets you call BizyAir AI model APIs **without writing any code**.

| Scenario | Traditional Way | With This Tool |
|----------|-----------------|----------------|
| 🖼️ **Text-to-Image / Image-to-Image** | Write JSON, curl API, parse responses | Pick model → fill params → run → view result |
| 🎬 **Image-to-Video / Text-to-Video** | Handle Base64 encoded media data | Drag & drop images, auto upload |
| 🎵 **Audio Clone / Generate** | Manage audio file URLs manually | Upload and use, auto processing |
| 🔄 **Batch Tasks** | Write scripts to loop | Run multiple browser tabs in parallel |

### Core Workflow

```
Pick a BizyAir model → Edit input parameters → Click Run
    ↓
Auto-call API → Real-time polling → Result displayed on completion
    ↓
          Preview / Download / Save to local
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗂️ **Model Zoo** | Browse models, filter by category/tag, search support |
| ⚙️ **Parameter Config** | Dynamic input controls (slider, dropdown, text, image upload) |
| 🚀 **Task Submission** | Submit via API Key, real-time polling for progress |
| 💰 **Price Calculation** | Auto-calculate cost, supports pay-per-use and tiered pricing |
| 🖼️ **Multimedia Preview** | Image/video/audio/text preview, JSON viewer, one-click copy |
| 🔍 **Media Viewer** | Full-screen, zoom-to-center, pan, keyboard navigation |
| 📂 **Asset Library** | Folder-based management by model+date, thumbnail previews |
| 📜 **History** | Archived by date, hover for prompt, click for param details, one-click reuse |
| 🔑 **API Key Persistence** | Keys stored in local `config.json`, persist across restarts |
| 🖥️ **Electron Desktop** | Native file dialogs, packable as Windows installer |

---

## 🚀 Getting Started

### 📋 Prerequisites

| Tool | Version |
|------|---------|
| ⚡ **Node.js** | 18+ |
| 📦 **npm** | 9+ |
| 🪟 **OS** | Windows 10+ |

### ⚡ Install

```bash
git clone https://github.com/MaoYouShiJie/BizyAirAPI调用.git
cd BizyAirAPI调用
npm install
```

### 📁 Project Structure

```
🗄️ backend/          # Express backend (port 3004)
  └── server.cjs
🖥️ electron/         # Electron main process + preload
  ├── main.cjs
  └── preload.cjs
⚛️ src/              # React frontend
  ├── api/           # API client layer
  ├── components/    # Shared components (MediaViewer, AssetLibrary, etc.)
  ├── pages/         # Pages (Home, ModelDetail)
  └── types/         # TypeScript type definitions
📂 public/           # Static assets
📦 dist/             # Vite build output
⚙️ config.json       # Local config (saveDir, apiKey) — auto-generated
📜 vite.config.ts    # Vite config + proxy rules
```

### ▶️ Development

```bash
# Terminal 1: Start Vite dev server (port 5173)
npm run dev

# Terminal 2: Start backend (port 3004)
npm run dev:backend
```

Open http://localhost:5173

### 🖥️ Electron Mode

```bash
npm run electron:prod
```

### 📦 Build for Distribution

```bash
npm run dist
```

Output directory: `release/`

---

## ⚙️ Configuration

### 🔑 API Key

Click **API Settings** in the top-right corner to enter your BizyAir API Key. Keys are persisted in `config.json` and localStorage.

### 📂 Save Directory

Choose a local save directory for output files in the Asset Library. Defaults to `输出/` in the project root.

---

## 🛠️ Tech Stack

<table>
  <tr>
    <th align="center">Frontend</th>
    <th align="center">Backend</th>
    <th align="center">Desktop</th>
  </tr>
  <tr>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/react.svg" width="24" /><br/><b>React 19</b></td>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/express.svg" width="24" /><br/><b>Express 4</b></td>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/electron.svg" width="24" /><br/><b>Electron 35</b></td>
  </tr>
  <tr>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/typescript.svg" width="24" /><br/><b>TypeScript 5</b></td>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/sharp.svg" width="24" /><br/><b>Sharp</b></td>
    <td align="center" rowspan="2">Distribution</td>
  </tr>
  <tr>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/vite.svg" width="24" /><br/><b>Vite 8</b></td>
    <td align="center">Proxy</td>
  </tr>
</table>

### Technical Details

| Item | Description |
|------|-------------|
| **Styling** | Pure CSS dark theme |
| **Ports** | Vite: 5173, Backend: 3004+, Electron HTTP: 30002+ |
| **Port Conflict** | Auto-increment retry (up to 10), supports multiple instances |
| **Thumbnail Cache** | `.thumbcache/` directory |
| **Auto Restart** | Backend auto-restarts on crash, history auto-refreshes every 10s |

### 🌐 API Routes

| Path | Target | Description |
|------|--------|-------------|
| `/api/x/...` | bizyair.cn (public) | Model list, details, pricing |
| `/x/...` | api.bizyair.cn (Bearer) | Create tasks, poll status |
| `/api/gallery` | → backend:3004 | Asset library |
| `/api/history/*` | → backend:3004 | History records |
| `/api/thumbnail` | → backend:3004 | Thumbnail generation |
| `/api/config/*` | → backend:3004 | Config read/write |
| `/api/save-outputs` | → backend:3004 | Save output files |

---

## 📜 License

<p align="center">
  <b>MIT</b> · Made with ❤️ for BizyAir users
</p>
