<p align="center">
  <img src="public/logo002.png" width="200" alt="BizyAir API 工具" />
</p>

<h1 align="center">BizyAir 模型调用 <sup><code>v0.0.1</code></sup></h1>

<p align="center">
  <a href="README_EN.md">🇺🇸 English</a>
</p>

<p align="center">
  <b>BizyAir API 的非官方桌面客户端 — 模型浏览、参数配置、任务提交、资产管理，一站式搞定</b>
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

## <img src="icon.png" width="36" height="36" alt="" style="vertical-align:-8px;margin-right:6px"> 关于 BizyAir.cn

**[BizyAir.cn](https://bizyair.cn)** — 基于 ComfyUI 的即开即用云端 AI 创作空间，由北京硅基流动科技有限公司（SiliconFlow）运营。它将云端 GPU 资源与本地 ComfyUI 无缝连接，解决本地算力不足问题，内置众多精选模型与节点，无需复杂配置，开箱即用。

> 📖 文档中心：[docs.bizyair.cn](https://docs.bizyair.cn)

---

## 🎯 项目介绍

**BizyAir 模型调用** 是一个桌面客户端，让你**无需编写代码**即可调用 BizyAir 上的 AI 模型 API。

| 场景 | 传统方式 | 使用本工具 |
|------|----------|-----------|
| 🖼️ **文生图 / 图生图** | 手写 JSON，curl 调 API，解析返回结果 | 选模型 → 填参数 → 点运行 → 出结果 |
| 🎬 **图生视频 / 文生视频** | 处理 Base64 编码的图像/视频数据 | 直接拖入图片，自动上传 |
| 🎵 **音频克隆 / 生成** | 手动管理音频文件的 URL | 上传即用，自动处理 |
| 🔄 **批量任务** | 写脚本循环调用 | 开多个浏览器 Tab 并行运行 |

### 核心工作流

```
选择一个 BizyAir 模型 → 编辑输入参数 → 点击运行
    ↓
自动调用 API → 实时轮询进度 → 完成后展示结果
    ↓
           可预览 / 下载 / 保存到本地
```

---

## ✨ 功能特性

| 特性 | 说明 |
|------|------|
| 🗂️ **模型市场** | 浏览模型列表，按分类/标签筛选，支持搜索 |
| ⚙️ **参数配置** | 动态渲染输入控件（滑块、下拉框、文本、图片上传） |
| 🚀 **任务提交** | 通过 API Key 提交推理任务，实时轮询进度 |
| 💰 **价格计算** | 根据参数自动算价，支持按量计费和阶梯定价 |
| 🖼️ **多媒体预览** | 图片/视频/音频/文本直接预览，JSON 查看，一键复制 |
| 🔍 **媒体查看器** | 全屏看图，鼠标居中缩放/平移，键盘左右导航 |
| 📂 **资产管理** | 按模型+日期组织的文件夹管理已保存的输出，缩略图预览 |
| 📜 **历史记录** | 按日期归档，悬停显示提示词，点击弹出参数详情，一键复用 |
| 🔑 **API Key 持久化** | Key 存储在本地 `config.json`，重启不丢失 |
| 🖥️ **Electron 桌面端** | 原生文件对话框，可打包为 Windows 安装程序 |

---

## 🚀 开始使用

### 📋 前置要求

| 工具 | 版本 |
|------|------|
| ⚡ **Node.js** | 18+ |
| 📦 **npm** | 9+ |
| 🪟 **OS** | Windows 10+ |

### ⚡ 安装

```bash
git clone https://github.com/MaoYouShiJie/BizyAirAPI调用.git
cd BizyAirAPI调用
npm install
```

### 📁 目录结构

```
🗄️ backend/          # Express 后端 (端口 3004)
  └── server.cjs
🖥️ electron/         # Electron 主进程 + preload
  ├── main.cjs
  └── preload.cjs
⚛️ src/              # React 前端
  ├── api/           # API 客户端层
  ├── components/    # 通用组件 (MediaViewer, AssetLibrary 等)
  ├── pages/         # 页面 (Home, ModelDetail)
  └── types/         # TypeScript 类型定义
📂 public/           # 静态资源
📦 dist/             # Vite 构建输出
⚙️ config.json       # 本地配置 (saveDir, apiKey) — 自动生成
📜 vite.config.ts    # Vite 配置 + 代理规则
```

### ▶️ 开发模式

```bash
# 终端 1：启动 Vite 开发服务器 (端口 5173)
npm run dev

# 终端 2：启动后端 (端口 3004)
npm run dev:backend
```

浏览器打开 http://localhost:5173

### 🖥️ Electron 模式

```bash
npm run electron:prod
```

### 📦 打包分发

```bash
npm run dist
```

输出目录：`release/`

---

## ⚙️ 配置

### 🔑 API Key

点击右上角「API 设置」输入你的 BizyAir API Key。Key 保存在 `config.json` 和 localStorage 中持久化存储。

### 📂 保存目录

在资产库中可选择输出文件的本地保存路径，默认为项目目录下的 `输出/`。

---

## 🛠️ 技术栈

<table>
  <tr>
    <th align="center">前端</th>
    <th align="center">后端</th>
    <th align="center">桌面</th>
  </tr>
  <tr>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/react.svg" width="24" /><br/><b>React 19</b></td>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/express.svg" width="24" /><br/><b>Express 4</b></td>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/electron.svg" width="24" /><br/><b>Electron 35</b></td>
  </tr>
  <tr>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/typescript.svg" width="24" /><br/><b>TypeScript 5</b></td>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/sharp.svg" width="24" /><br/><b>Sharp</b></td>
    <td align="center" rowspan="2">打包分发</td>
  </tr>
  <tr>
    <td align="center"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/vite.svg" width="24" /><br/><b>Vite 8</b></td>
    <td align="center">代理转发</td>
  </tr>
</table>

### 技术细节

| 内容 | 说明 |
|------|------|
| **样式** | 纯 CSS 暗色主题 |
| **端口** | Vite: 5173, 后端: 3004+, Electron HTTP: 30002+ |
| **端口冲突** | 自动递增重试 (最多 10 次)，支持多实例 |
| **缩略图缓存** | `.thumbcache/` 目录 |
| **自动重启** | 后端崩溃自动重启，历史记录定时 10 秒自动刷新 |

### 🌐 API 路由

| 路径 | 目标 | 说明 |
|------|------|------|
| `/api/x/...` | bizyair.cn (public) | 模型列表、详情、价格 |
| `/x/...` | api.bizyair.cn (Bearer) | 创建任务、轮询状态 |
| `/api/gallery` | → backend:3004 | 资产库列表 |
| `/api/history/*` | → backend:3004 | 历史记录 |
| `/api/thumbnail` | → backend:3004 | 缩略图生成 |
| `/api/config/*` | → backend:3004 | 配置读写 |
| `/api/save-outputs` | → backend:3004 | 文件保存 |

---

## 📜 许可证

<p align="center">
  <b>MIT</b> · 用 ❤️ 为 BizyAir 用户打造
</p>
