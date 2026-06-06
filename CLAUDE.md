# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

遗忘曲线复习提醒 — 基于 Electron + React + TypeScript 的 Windows 桌面应用。按艾宾浩斯遗忘曲线管理知识点复习提醒，集成番茄钟、每日计划、学习统计等功能。

## 常用命令

```bash
# 开发模式（Vite + Electron 热重载）
npm run dev

# 生产构建
npm run build

# 一键构建+打包（需设 ELECTRON_MIRROR 镜像加速）
npm run package
```

**重要**：每次代码修改并且完成测试, 且通过后，必须重新打包 Windows 安装包。安装包输出到 `release/遗忘曲线复习提醒-Setup-1.0.0.exe`。**进行大体量修改（涉及 3+ 文件或 50+ 行代码变更）时，必须在打包前通过 `npm run dev` 启动 Electron 窗口进行手动验证。**

## 技术栈

| 层          | 技术                                                           |
| ----------- | -------------------------------------------------------------- |
| 桌面框架    | Electron 42                                                    |
| 前端        | React 18 + TypeScript                                          |
| 构建        | Vite 8 + vite-plugin-electron                                  |
| 样式        | Tailwind CSS 3（`darkMode: 'class'`）                        |
| 状态管理    | Zustand 5                                                      |
| 数据存储    | JSON 文件（`%APPDATA%/forgetting-curve-reminder/data.json`） |
| Markdown    | Milkdown Crepe (ProseMirror + remark-math + KaTeX)             |
| 非标准 JSON | json5                                                          |
| 打包        | electron-builder (NSIS)                                        |

## 架构分层

### 数据流

```
React Component → Zustand Hook → preload.ts (contextBridge)
    → IPC (ipcMain.handle) → queries.ts → connection.ts → data.json
```

### 目录结构

```
electron/                  # Electron 主进程（Node.js 环境）
├── main.ts                # 窗口管理 + IPC 处理器注册 + 生命周期
├── preload.ts             # contextBridge，暴露 electronAPI 给渲染进程
├── tray.ts                # 系统托盘
├── notifications.ts       # Windows 原生通知
├── scheduler.ts           # 定时复习检查（每小时）
├── auto-start.ts          # 开机自启动
└── database/
    ├── connection.ts      # JSON 文件读写 + AppData 接口 + ID 计数器
    ├── migrations.ts      # schema_version 递增迁移
    ├── queries.ts         # 知识复习 + 每日计划 + 学习会话 + 统计查询
    ├── game-import.ts     # Chill with You 游戏存档解析导入
    └── images.ts          # 本地图片文件存储 + 孤儿图片清理

src/                       # React 渲染进程
├── main.tsx               # React 入口
├── App.tsx                # 根组件
├── vite-env.d.ts          # window.electronAPI 全局类型声明
├── types/index.ts         # 共享 TypeScript 类型
├── hooks/                 # Zustand stores
│   ├── useKnowledge.ts    # 知识点 CRUD + 选中状态
│   ├── useReview.ts       # 复习数据查询
│   ├── useTheme.ts        # 暗色模式（light/dark/system）
│   ├── useDailyPlans.ts   # 每日计划
│   ├── usePomodoro.ts     # 番茄钟计时核心逻辑
│   └── useStudyStats.ts   # 学习统计 + 月份导航
├── components/
│   ├── layout/            # AppLayout（导航框架）+ Sidebar
│   ├── knowledge/         # 知识点列表、卡片、添加表单、详情页(Markdown)
│   ├── review/            # 今日复习、逾期复习、统计面板
│   ├── plans/             # 每日计划页面
│   ├── pomodoro/          # 番茄钟计时器页面
│   ├── stats/             # 学习统计（日历热力图 + 补登）
│   └── import/            # 游戏数据导入
├── constants.ts           # 共享常量（STAGE_LABELS, DAY_LABELS_SUNDAY_FIRST, DAY_LABELS_MONDAY_FIRST）
└── styles/
    └── index.css           # 全局样式 + Milkdown 编辑器适配
```

### 导航系统

应用使用基于状态的页面切换（非路由）。`AppLayout` 维护 `currentPage: NavPage` 状态，`Sidebar` 渲染导航按钮。`NavPage` 类型定义在 `src/types/index.ts`：

```ts
'knowledge' | 'today' | 'overdue' | 'plans' | 'pomodoro' | 'study-stats' | 'import' | 'stats'
```

知识点详情页通过 `useKnowledge.selectedId` 单独处理，不占用 NavPage。

### 数据存储

`connection.ts` 中的 `AppData` 包含所有顶层集合：

- `knowledge_points` — 知识点（content + detail Markdown）
- `review_records` — 复习记录（8 条/知识点，按艾宾浩斯间隔 1/2/4/7/15/30/90/180 天生成）
- `daily_plans` + `daily_plan_completions` — 每日计划（一次性/每日任务）
- `study_sessions` — 学习时长记录（番茄钟产生）
- `settings` — 键值对（主题偏好、番茄钟设置等）

`schema_version` 当前为 5。每次新增集合通过 `migrations.ts` 递增版本号进行迁移。

### 暗色模式

Tailwind 使用 `darkMode: 'class'`。`useTheme` hook 管理三种模式（light/dark/system），通过 `document.documentElement.classList.toggle('dark')` 切换。偏好持久化到 `settings.theme_mode`。

### IPC 通道命名规范

所有通道使用 `domain:action` 格式：`knowledge:add`、`review:get-today`、`plans:toggle`、`study:get-month-stats`、`import:scan`、`settings:get`、`app:minimize-to-tray`。渲染进程通过 `window.electronAPI.xxx` 调用，guard 子句 `if (!api()) return` 确保非 Electron 环境下优雅降级。

### 注意事项

- **kcimg:// 协议**: 本地图片通过自定义协议加载，路径有严格校验（防目录穿越）。图片文件存储在 `%APPDATA%/images/{kpId}/`。
- **图片清理**: 更新知识点（`knowledge:update`）时自动通过 `deleteOrphanImages()` 清理 markdown 中不再引用的图片文件，删除知识点时通过 `deleteImages()` 删除整个目录。
- **循环依赖避免**: `notifications.ts` 不能直接导入 `main.ts`，通过 `setMainWindowGetter()` 注入主窗口引用。
- **Milkdown 编辑器**: 基于 ProseMirror 的 WYSIWYG 编辑器，原生支持 Ctrl+Z/Y 撤销重做、KaTeX 数学公式（$...$ 行内 + $$...$$ 块级）、自定义图片上传。内容通过 `markdownUpdated` 事件 2s 防抖自动保存。
- **托盘退出**: 使用 `app.quit()` 而非 `mainWindow.destroy()` 确保进程完全结束。
- **开机自启动**: 仅在 `settings['auto_start'] !== 'false'` 时启用，尊重用户偏好。
- **数据校验**: 加载 data.json 时进行顶级字段结构校验 + ID 计数器 NaN 过滤。
- **图片上传限制**: 单文件最大 10MB，每知识点最多 50 张图片。
- **图片引用格式**: markdown 中使用 `![alt](kcimg://{kpId}/{filename})` 引用本地图片。

## 测试方式

### 自动化测试（通过 Playwright）

**每次代码修改完成后，必须通过 Playwright MCP 工具启动 Electron 应用并进行自动化验证。** 验证范围聚焦于**本轮对话修改过的代码**所涉及的功能路径，未修改的模块无需重新测试。

**流程：**

1. **`npm run dev` 启动应用** → Electron 窗口自动打开
2. **`browser_navigate`** 连接到 Electron 窗口（或 Vite dev server URL）
3. **`browser_snapshot`** 抓取页面结构，验证 UI 正常渲染
4. **针对修改的模块执行操作验证**（见下方示例）
5. **`browser_console_messages`** 检查无错误日志
6. **关闭浏览器页面**（`browser_close`），保持 dev server 运行

**按修改模块的测试清单：**

| 修改涉及模块 | 必须验证的操作 |
|-------------|---------------|
| `electron/database/*` | 启动后检查控制台无数据加载错误 |
| `useKnowledge.ts` / knowledge 组件 | 添加知识点 → 搜索 → 编辑标题 → 删除 |
| `useReview.ts` / review 组件 | 查看今日复习列表 → 完成一条复习 |
| `useDailyPlans.ts` / plans 组件 | 添加计划 → 切换完成状态 → 删除 |
| `usePomodoro.ts` / pomodoro 组件 | 启动番茄钟 → 等待 5s 确认倒计时 → 暂停 → 重置 |
| `DetailPanel.tsx` / Milkdown | 打开知识点详情 → 编辑 markdown → 输入 $...$ 公式确认渲染 → Ctrl+Z 撤销 → 保存 → 重新打开确认 |
| `images.ts` / kcimg 协议 | 上传图片后确认渲染 → 删除图片引用后保存 → 确认孤儿文件已清理 |
| `tray.ts` / `notifications.ts` | 检查托盘图标可见（通过 snapshot 确认不报错） |
| `GameImportPage.tsx` | 输入路径 → 扫描 → 选中日期 → 导入 |
| `Sidebar.tsx` / 导航 | 逐个点击导航按钮确认页面切换正常 |
| `useTheme.ts` / 暗色模式 | 切换主题确认无报错 |

**验证通过标准：**
- 浏览器控制台无红色错误（error）
- 页面快照中关键 UI 元素存在（按钮、列表、输入框）
- 操作后状态正确变更（loading 消失、数据更新）

### 手动测试（Playwright 不可用时备选）

1. `npm run dev` 启动应用
2. Electron 窗口内实际操作验证修改过的功能路径
3. Node.js 脚本独立验证后端逻辑（如 `electron/database/game-import.ts` 的解析功能）

## Claude Code 自动化

本项目 `.claude/` 目录下配置了以下专属自动化工具：

| 类型 | 名称 | 触发方式 | 用途 |
|------|------|---------|------|
| Skill | `package-app` | `/package-app` | 一键 TypeScript 检查 → 构建 → 打包安装包 |
| Skill | `verify-app` | `/verify-app` | 启动应用 → Playwright 自动化验证 UI |
| Agent | `electron-security-reviewer` | 自动/手动派遣 | Electron 安全审计（IPC、协议、沙箱） |
| Agent | `code-reviewer` | 自动/手动派遣 | 通用代码审查（类型、错误处理、规范） |
| Hook | `PreToolUse` | 自动（拦截） | 阻止直接编辑 `package-lock.json` |

**Skills** 通过 `/skill-name` 调用。**Agents** 可被 Claude 自动派遣或在对话中指定。**Hooks** 在对应事件时自动触发。

## 编码准则

1. **先思考再编码** — 不确定时开口问；存在多种解读时列出所有选项；有更简单方案直接说
2. **简单优先** — 只写最少代码；不做未被要求的抽象或灵活性；如果 200 行能 50 行完成就重写
3. **外科手术式修改** — 只动必须改的代码；不重组相邻代码；匹配现有风格；只清理自己引入的孤立引用
4. **每次变更后测试** — Playwright 自动化测试 → TypeScript 零错误 → 构建 → 打包。**不测试不交付。**
