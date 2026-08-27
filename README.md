# 芝士学爆

![版本](https://img.shields.io/badge/version-1.0.0--beta.1-blue) ![平台](https://img.shields.io/badge/platform-Windows-lightgrey) ![许可](https://img.shields.io/badge/license-MIT-green)

> **当前为测试版（beta.1）**：功能已可用，仍在迭代打磨中，欢迎反馈问题与建议。

本地优先的 FSRS 科学复习提醒桌面应用 —— 用间隔重复算法对抗遗忘曲线，让每一分钟的复习都落在最需要的时机。

针对同类记忆产品以孤立卡片为主、复习与专注/计划相互割裂、数据多依赖云端的痛点，芝士学爆以 **Markdown 知识库** 承载长文知识，用 **FSRS 算法** 按记忆反馈动态调度复习，并打通**番茄专注、每日计划与学习统计**，形成本地、数据驱动的学习闭环。

## 功能特性

### 📚 知识库

- 所见即所得的 Markdown 编辑器（@uiw/react-md-editor），原生支持 Ctrl+Z/Y 撤销重做
- KaTeX 数学公式渲染：行内 `$...$` 与块级 `$$...$$`
- 本地图片插入，通过自定义 `kcimg://` 协议加载（含路径穿越防护与孤儿图片自动清理）
- 知识点搜索（含正文）、多维度排序、学习日期回溯

### 🔁 FSRS 复习调度

- 基于 [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)（Free Spaced Repetition Scheduler）建模记忆状态（Stability / Difficulty）
- 四档评分：**忘 / 难 / 过 / 易**，算法自动计算下次复习时机
- 评分时可**自定义下次复习时间**（明天/3天/7天/14天或任意日期）：记忆状态照常按评分更新，仅覆盖间隔，支持撤销
- **全局与单知识点两级间隔上限**（有效上限取较小值，超出自动封顶），在「调度管理」页统一配置
- **提前复习**：两个复习点之间忘了，可一键把下次复习拉到今天正常评分，不重置记忆状态
- 「今日复习」面板汇总全部待复习条目（含逾期，红色高亮标注），实时展示当前记忆保留率
- 评分后自动弹出 **5 秒核对卡片**：展示知识点 Markdown 详情（支持公式/图片），悬停可暂停倒计时，方便对照检查记忆是否正确
- 评分后 5 秒内可一键撤销；支持一键重置知识点的记忆状态、从第一天重新复习
- 每小时定时检查复习任务，通过 Windows 原生通知提醒

### 🎯 易错点

- 记录容易出错的知识点，每次出错点 **+1** 计数
- 错误次数越多排序越靠前，高频易错点一目了然
- 计数徽章按严重度变色（≥3 橙色、≥5 红色）
- 内容支持 **Markdown 与 LaTeX 公式**（与知识点详情同一套编辑/渲染管线）

### 🍅 番茄钟

- 以时间戳差值计时，规避浏览器后台节流导致的计时漂移
- 学习时长自动记录，汇入学习统计

### 📋 每日计划

- 一次性任务与每日重复任务，完成状态一键切换

### 📈 学习统计

- 纯 CSS 手写日历热力图：每日学习时长按 7 档色阶呈现，hover 查看当日明细
- 周 / 近 7 日 / 月度多维视图，支持历史补登

### 🎮 游戏数据导入

- 解析《Chill with You》游戏存档（.es3），把游戏内学习时长导入统计

### 🖥️ 桌面集成

- 系统托盘常驻、最小化到托盘、可选开机自启
- light / dark / system 三态主题，跨重启保持
- 设置页统一管理外观、开机自启与数据导入导出（JSON 备份）

## 数据存储

**完全本地，零云端依赖。** 所有数据存放在：

```
%APPDATA%/forgetting-curve-reminder/data.json
```

内置 schema_version 递增迁移机制，应用启动时自动升级旧版本数据结构。

## 技术栈

| 层       | 技术                                              |
| -------- | ------------------------------------------------- |
| 桌面框架 | Electron 42                                       |
| 前端     | React 18 + TypeScript                             |
| 构建     | Vite 8 + vite-plugin-electron                     |
| 样式     | Tailwind CSS 3（darkMode: class）                 |
| 状态管理 | Zustand 5（按业务域拆分 6 个 store）              |
| 记忆算法 | ts-fsrs 5                                         |
| Markdown | @uiw/react-md-editor + remark-math + rehype-katex |
| 打包     | electron-builder（NSIS）                          |

## 快速开始

### 方式一：安装包（推荐）

从 [GitHub Releases](https://github.com/Strelizia-PJ/review-system/releases) 下载对应平台安装包：

- **Windows**：`芝士学爆-Setup-<版本号>.exe`，双击安装；支持应用内自动更新
- **macOS**：`芝士学爆-<版本号>-<arch>.dmg`（Intel 选 x64、Apple Silicon 选 arm64）；未签名，首次打开需**右键 → 打开**，新版本请到 Releases 页手动下载

数据保存在本地，卸载不影响已导出的备份。

### 方式二：源码运行

环境要求：Node.js ≥ 18（开发环境使用 Node 22 验证）、npm。

```bash
# 安装依赖
npm install

# 开发模式（Vite + Electron 热重载）
npm run dev

# 类型检查
npx tsc --noEmit

# 生产构建
npm run build

# 打包 Windows 安装包（国内网络可先设置 ELECTRON_MIRROR 镜像加速）
npm run package
```

安装包输出到 `release/芝士学爆-Setup-1.0.0.exe`。

## 目录结构

```
electron/                  # Electron 主进程
├── main.ts                # 窗口管理 + IPC 注册 + kcimg 协议
├── preload.ts             # contextBridge，暴露 electronAPI
├── tray.ts / notifications.ts / scheduler.ts / auto-start.ts
└── database/              # JSON 存储、迁移、查询、图片管理、存档导入

src/                       # React 渲染进程
├── components/            # knowledge / review / plans / pomodoro / stats / import
├── hooks/                 # Zustand stores（知识/复习/番茄/计划/统计/主题）
├── types/ constants.ts
└── styles/
```

页面切换基于状态导航（非路由），IPC 通道统一 `domain:action` 命名，渲染进程对非 Electron 环境优雅降级。

## 开发

开发规范、测试流程与编码准则见 [CLAUDE.md](./CLAUDE.md)。

## License

MIT
