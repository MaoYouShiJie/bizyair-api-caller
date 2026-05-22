# BizyAir 模型调用 / BizyAir Model Inference

> **BizyAir API 的非官方桌面客户端 / An unofficial desktop client for BizyAir API**
>
> 基于 Electron + Vite + React + TypeScript 构建，提供模型浏览、参数配置、任务提交、资产管理等功能。
> Built with Electron + Vite + React + TypeScript, providing model browsing, parameter configuration, task submission, and asset management.

---

## <img src="icon.png" width="24" height="24" alt="" style="vertical-align:middle;margin-right:4px"> 关于 BizyAir.cn / About BizyAir.cn

**BizyAir.cn** — 基于 ComfyUI 的即开即用云端 AI 创作空间，由北京硅基流动科技有限公司（SiliconFlow）运营。它将云端 GPU 资源与本地 ComfyUI 无缝连接，解决本地算力不足问题，内置众多精选模型与节点，无需复杂配置，开箱即用。

**BizyAir.cn** — A ready-to-use cloud AI creation space powered by ComfyUI, operated by Beijing SiliconFlow Technology Co., Ltd. It seamlessly connects cloud GPU resources with local ComfyUI, solving the problem of insufficient local computing power. Built-in with numerous curated models and nodes, ready to use out of the box with no complex configuration required.

> 官网 / Website: [https://bizyair.cn](https://bizyair.cn)
>
> 文档中心 / Docs: [https://docs.bizyair.cn](https://docs.bizyair.cn)

---

## 功能特性 / Features

- **模型市场浏览** / **Model Zoo** — 浏览 BizyAir 模型列表，按分类/标签筛选，搜索模型
- **模型详情 & 参数配置** / **Model Detail & Parameters** — 查看模型详情，动态渲染输入参数（滑块/下拉框/文本/图片上传）
- **任务提交 & 轮询** / **Task Submit & Polling** — 通过 API Key 提交推理任务，实时轮询状态
- **价格计算** / **Price Calculation** — 根据参数自动计算价格，支持按量计费和阶梯定价
- **输出结果查看** / **Output Viewer** — 图片/视频/音频/文本预览，JSON 查看，一键复制
- **媒体查看器** / **Media Viewer** — 全屏看图，鼠标居中缩放/平移，键盘导航
- **资产管理** / **Asset Library** — 按模型+日期组织的文件夹形式管理已保存的输出文件，缩略图预览
- **历史记录** / **History** — 按日期归档的历史记录文件夹，鼠标悬停显示提示词，点击弹出参数详情窗口，一键复用参数
- **API Key 持久化** / **API Key Persistence** — API Key 存储在本地 `config.json`，重启不丢失
- **Electron 桌面端** / **Electron Desktop App** — 原生文件对话框选择保存目录，可打包为 Windows 安装程序

---

## 开始使用 / Getting Started

### 前置要求 / Prerequisites

- Node.js 18+
- npm 9+

### 安装 / Install

```bash
git clone https://github.com/MaoYouShiJie/BizyAirAPI调用.git
cd BizyAirAPI调用
npm install
```

### 目录结构 / Project Structure

```
├── backend/          # Express 后端 (端口 3004)
│   └── server.cjs
├── electron/         # Electron 主进程 + preload
│   ├── main.cjs
│   └── preload.cjs
├── src/              # React 前端
│   ├── api/          # API 客户端层
│   ├── components/   # 通用组件 (MediaViewer, AssetLibrary 等)
│   ├── pages/        # 页面 (Home, ModelDetail)
│   └── types/        # TypeScript 类型定义
├── public/           # 静态资源 (图标, logo 等)
├── dist/             # Vite 构建输出
├── config.json       # 本地配置 (saveDir, apiKey) — 自动生成
└── vite.config.ts    # Vite 配置 + 代理规则
```

### 开发模式 / Development

启动前端和后端：

```bash
# 终端 1：启动 Vite 开发服务器 (端口 5173)
npm run dev

# 终端 2：启动后端 (端口 3004)
npm run dev:backend
```

浏览器打开 http://localhost:5173

### Electron 模式 / Electron Mode

```bash
# 构建前端 + 启动 Electron
npm run electron:prod
```

### 打包 / Build for Distribution

```bash
npm run dist
```

输出目录：`release/`

---

## 配置 / Configuration

### API Key

在右上角点击「API 设置」输入你的 BizyAir API Key。Key 保存在 `config.json` 和 localStorage 中。

### 保存目录 / Save Directory

在资产库中可选择输出文件保存路径。默认为项目目录下的 `输出/`。

---

## 技术细节 / Technical Details

| 内容 | 说明 |
|------|------|
| **前端框架** | React 19 + TypeScript + Vite 8 |
| **桌面端** | Electron 35 |
| **后端** | Express 4 + sharp (缩略图生成) |
| **API 代理** | Vite proxy (开发) / Node.js HTTP proxy (生产) |
| **端口** | Vite: 5173, 后端: 3004+, Electron HTTP: 30002+ |
| **端口冲突** | 自动递增重试 (最多 10 次) 支持多实例 |
| **缩略图缓存** | `.thumbcache/` 目录 |
| **样式** | 纯 CSS (暗色主题) |

### API 路由 / API Routes

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

## 许可证 / License

MIT
