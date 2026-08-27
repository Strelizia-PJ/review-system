---
name: package-app
description: 构建并打包 Windows 安装包（npm run package），输出到 release/ 目录
disable-model-invocation: true
---

## 打包流程

按顺序执行以下步骤：

### 1. 前置检查

- 确认所有代码修改已保存
- 如果 git 仓库可用，检查工作区干净: `git diff --stat`

### 2. TypeScript 类型检查

```bash
npx tsc --noEmit
```

如有类型错误，先修复再继续。

### 3. 生产构建

```bash
npm run build
```

确认 Vite 构建无错误。

### 4. 打包安装包

```bash
npm run package
```

- 需要设置 `ELECTRON_MIRROR` 环境变量加速 Electron 下载（推荐 `https://npmmirror.com/mirrors/electron/`）
- 安装包输出到 `release/遗忘曲线复习提醒-Setup-1.0.0.exe`

### 5. 确认输出

```bash
ls -la release/遗忘曲线复习提醒-Setup-1.0.0.exe
```

确认文件存在且大小合理（通常 > 50MB）。

### 失败处理

- Vite 构建失败 → 检查 `src/` 和 `electron/` 中的 TypeScript/导入错误
- electron-builder 失败 → 检查网络（需下载 Electron 二进制）、磁盘空间（需 > 500MB）
- 如 `ELECTRON_MIRROR` 下载慢，可尝试切换镜像或设置代理
