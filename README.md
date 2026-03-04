# Minimal - New Tab

<div align="center">

一个极简、高效的新标签页 Chrome 扩展，使用 React + Vite 构建，支持自定义搜索、主题设置和 Google Drive 云端同步。

✨ [在线体验](#) · 📖 [使用文档](#) · 🐛 [问题反馈](#)

</div>

---

## 功能特性

- ⚡️ **快速构建** - 基于 Vite + React + TypeScript，开发构建速度快
- 🔥 **热重载支持** - 开发模式文件变化自动重建，实时预览
- 🎨 **主题切换** - 现代化 UI 设计，支持多主题切换
- 🔍 **多搜索引擎** - 支持 Google、Bing、百度等多种搜索引擎
- 🌐 **国际化** - 支持中文/英文多语言
- ☁️ **云端同步** - Google Drive 配置和历史记录同步
- 🎯 **极简设计** - 专注新标签页核心体验，无冗余功能

## 项目结构

```
.
├── src/
│   ├── manifest.json          # Chrome Extension 配置文件
│   ├── popup.html             # Popup 页面 HTML
│   ├── popup/                 # Popup 页面组件
│   ├── newtab.html            # New Tab 页面 HTML
│   ├── newtab/                # New Tab 页面组件
│   ├── background.ts          # Service Worker 后台脚本
│   ├── content.ts             # Content Script 内容脚本
│   ├── components/            # React 组件
│   ├── store/                 # Redux 状态管理
│   ├── services/              # 服务层（同步服务等）
│   ├── hooks/                 # 自定义 Hooks
│   ├── i18n/                  # 国际化配置
│   └── styles/                # 样式文件
├── public/                    # 静态资源
├── scripts/
│   ├── dev.js                 # 开发模式脚本
│   └── build.js               # 构建脚本
├── vite.config.ts             # Vite 配置文件
├── tsconfig.json              # TypeScript 配置
└── package.json
```

## 快速开始

### 1. 获取项目

**方式一：Git 克隆**
```bash
git clone [项目仓库地址]
cd minimal-newtab
```

**方式二：下载 ZIP**
下载项目 ZIP 文件并解压到本地目录。

### 2. 安装依赖

```bash
npm install
```

### 3. 开发模式（支持热重载）

```bash
npm run dev
```

开发模式会：
1. 自动监听文件变化并重新构建
2. 自动复制 `manifest.json` 到 `dist` 目录
3. 在 Chrome 中加载扩展后，修改代码会自动重建，刷新扩展即可看到更新

**在 Chrome 中加载扩展：**

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 目录
6. 开发时，修改代码后点击扩展的刷新按钮即可看到更新

### 4. 构建生产版本

```bash
npm run build
```

构建完成后，`dist` 目录就是可以打包的扩展文件。

> **提示：**
> - `npm run dev` - 开发模式，代码**不压缩**，构建速度快，便于调试
> - `npm run build` - 生产模式，代码**会压缩**，文件体积小，适合发布

## 配置说明

### OAuth2 客户端 ID 配置

项目使用 Google OAuth2 进行身份验证和 Google Drive API 访问。需要配置客户端 ID 才能正常使用同步功能。

#### 配置步骤

1. **创建 Google Cloud 项目**
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建新项目或选择现有项目

2. **启用必要的 API**
   - 在 API 和服务中启用以下 API：
     - Google Drive API
     - Google Identity API

3. **创建 OAuth2 客户端凭据**
   - 进入"API 和服务" → "凭据"
   - 点击"创建凭据" → "OAuth 客户端 ID"
   - 应用类型选择"Chrome 应用"
   - 获取扩展 ID：
     - 在 Chrome 中加载扩展后，访问 `chrome://extensions/`
     - 找到你的扩展，复制"ID"（例如：`abcdefghijklmnopqrstuvwxyz123456`）
   - 在"授权重定向 URI"中配置：
     ```
     chrome-extension://[你的扩展ID]/
     ```
     例如：`chrome-extension://abcdefghijklmnopqrstuvwxyz123456/`

4. **配置 manifest.json**
   - 打开 `src/manifest.json`
   - 找到 `oauth2.client_id` 字段
   - 将获取到的客户端 ID 填入：
     ```json
     "oauth2": {
       "client_id": "你的客户端ID.apps.googleusercontent.com",
       ...
     }
     ```

5. **开发环境与生产环境**
   - 建议创建两个 OAuth2 客户端：
     - 一个用于开发环境（本地测试）
     - 一个用于生产环境（发布版本）
   - 在 `manifest.json` 中可以通过注释字段记录两个环境的客户端 ID：
     ```json
     "_comment_client_id_production": "生产环境客户端 ID",
     "_comment_client_id_dev": "开发环境客户端 ID"
     ```

> **注意事项：**
> - 客户端 ID 是敏感信息，不要提交到公开仓库
> - 确保授权重定向 URI 与扩展 ID 完全匹配
> - 修改客户端 ID 后需要重新构建并重新加载扩展

## 开发说明

### 热重载

在开发模式下（`npm run dev`），修改代码后：

1. Vite 会自动监听文件变化并重新构建到 `dist` 目录
2. `manifest.json` 也会自动同步到 `dist` 目录
3. 在 Chrome 扩展管理页面点击扩展的刷新按钮即可看到更新

### 自定义配置

项目使用 Vite + React 构建，你可以完全自定义：

- **修改构建配置**：编辑 `vite.config.ts`
- **添加新页面**：在 `src` 目录创建 HTML 和组件文件，然后在 `vite.config.ts` 的 `rollupOptions.input` 中添加入口点
- **修改开发脚本**：编辑 `scripts/dev.js`（开发模式）或 `scripts/build.js`（生产构建）
- **修改样式**：项目使用 CSS Modules，样式文件位于 `src/components` 和 `src/styles` 目录
- **添加国际化文本**：编辑 `src/i18n/locales/zh-CN.ts` 和 `src/i18n/locales/en-US.ts`

### 页面说明

项目包含以下页面：

- **newtab**：新标签页（`src/newtab.html` → `src/newtab/index.tsx`）
- **popup**：扩展弹窗（`src/popup.html` → `src/popup/index.tsx`）

### 技术栈

- **React 18** - UI 框架
- **Redux Toolkit** - 状态管理
- **TypeScript** - 类型支持
- **Vite** - 构建工具
- **CSS Modules** - 样式模块化

### 使用 Chrome API

项目已配置 TypeScript 类型支持，可以直接使用 Chrome API：

```typescript
chrome.tabs.query({ active: true }, (tabs) => {
  console.log(tabs);
});
```

## 许可证

本项目采用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 许可证。

### 许可说明

- ✅ **允许使用**：可以自由使用、学习、修改代码
- ✅ **允许分享**：可以分享、传播本项目
- ❌ **禁止商用**：不得将本项目用于商业目的
- ✅ **署名要求**：使用时需注明原作者

### 商业授权

如需商业使用，请联系作者获取商业授权。

---

Copyright © 2026 Minimal New Tab. All rights reserved.
