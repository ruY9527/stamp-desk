# StampDesk - PDF自动盖章桌面应用

基于 Electron + React + TypeScript 开发的 PDF 自动盖章桌面工具，支持可视化拖拽盖章、批量处理、模板管理等功能。

## 功能特性

### 核心功能
- **PDF 导入与预览** — 支持拖拽或点击导入 PDF 文件，基于 pdf.js 高清渲染
- **可视化盖章** — 选中印章后点击 PDF 页面即可放置，支持拖拽移动、缩放、旋转
- **印章管理** — 印章库持久化存储，支持 PNG/JPG 格式，自动保留原始图片质量
- **模板系统** — 保存当前盖章配置为模板，支持重命名、删除、设为默认模板
- **批量处理** — 批量导入多个 PDF 文件，每个文件可关联不同模板，一键批量盖章
- **骑缝章** — 支持跨页骑缝章配置
- **PDF 导出** — 将盖章后的 PDF 导出保存，印章以原始分辨率嵌入

### 模板功能
- 保存当前页面印章布局为模板
- 模板详情查看（按页码分组展示印章位置）
- 设为默认模板（批量处理时自动关联）
- 模板重命名与删除
- 删除印章前检查模板引用关系

### 批量处理
- 支持选择多个 PDF 文件批量导入
- 每个文件可独立选择不同模板
- 有默认模板时自动关联
- 无模板时回退使用当前页面印章
- 处理完成后可直接打开输出文件
- 失败任务支持查看错误详情

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Electron 33 |
| 前端 | React 18 + TypeScript |
| 构建 | Vite 6 + vite-plugin-electron |
| 状态管理 | Zustand |
| PDF 预览 | pdf.js |
| PDF 编辑 | pdf-lib |
| UI | TailwindCSS |
| 拖拽/缩放 | react-rnd |
| 打包 | electron-builder |

## 项目结构

```
src/
├── main/           # Electron 主进程
│   └── index.ts    # IPC 处理、文件操作、PDF 编辑
├── preload/        # Preload 脚本
│   └── index.ts    # contextBridge API 桥接
├── renderer/       # 渲染进程 (React 应用)
│   └── src/
│       ├── components/   # UI 组件
│       │   ├── App.tsx           # 主组件
│       │   ├── Toolbar.tsx       # 工具栏
│       │   ├── PdfPreview.tsx    # PDF 预览
│       │   ├── StampPanel.tsx    # 印章面板
│       │   ├── StampOverlay.tsx  # 印章覆盖层
│       │   └── BatchPanel.tsx    # 批量处理面板
│       ├── stores/       # Zustand 状态管理
│       └── utils/        # 工具函数
└── types/          # 全局类型定义
```

## 开发环境

```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev
```

## 打包构建

```bash
# 打包 Windows 版本
npm run build:win

# 打包 macOS 版本
npm run electron:build
```

## 系统要求

### Windows
- Windows 10 / 11 (64-bit, ARM64)
- Electron 33 内置 Chromium 引擎

### macOS
- macOS 10.15 (Catalina) 及以上
- 支持 Intel 和 Apple Silicon

## 许可证

MIT
