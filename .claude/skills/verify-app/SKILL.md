---
name: verify-app
description: 启动 Electron 应用并通过 Playwright 自动化验证 UI 功能
disable-model-invocation: true
---

## 验证流程

### 第一步：启动应用
```bash
npm run dev
```
等待 Electron 窗口打开（通常 5-10 秒）。

### 第二步：基础检查
1. `browser_navigate` — 连接到 Electron 窗口
2. `browser_snapshot` — 抓取完整页面结构，确认：
   - 侧边栏导航按钮存在
   - 主内容区域已渲染
   - 无明显的空白/崩溃区域
3. `browser_console_messages` — 检查控制台，确保：
   - 无红色 error 级别日志
   - 数据加载相关日志正常（如 "data loaded"）

### 第三步：按模块验证
根据本轮代码修改涉及的模块，执行对应验证：

| 修改模块 | 验证操作 |
|---------|---------|
| `electron/database/*` | 基础检查即可 — 控制台无数据加载错误 |
| `useKnowledge.ts` / knowledge 组件 | `browser_click` 添加按钮 → 填写知识点内容 → 保存 → 列表中出现新条目 → `browser_click` 删除 |
| `useReview.ts` / review 组件 | 切换到"今日复习"页 → 确认列表渲染 → `browser_click` 完成一条复习 |
| `useDailyPlans.ts` / plans 组件 | 切换到"每日计划"页 → 添加计划 → `browser_click` 切换完成状态 → 删除 |
| `usePomodoro.ts` / pomodoro 组件 | 切换到"番茄钟"页 → `browser_click` 启动 → 等 5s 确认倒计时 → 暂停 → 重置 |
| `DetailPanel.tsx` / MDEditor | 打开知识点详情 → 编辑 markdown 内容 → 保存 → 重新打开确认内容持久化 |
| `images.ts` / kcimg 协议 | 在详情页上传图片 → 确认渲染 → 删除图片引用 → 保存 → 确认孤儿文件已清理 |
| `tray.ts` / `notifications.ts` | 基础检查 — 确认托盘不报错 |
| `GameImportPage.tsx` | 切换到"导入"页 → 输入测试路径 → `browser_click` 扫描 |
| `Sidebar.tsx` / 导航 | 逐个 `browser_click` 导航按钮 → 确认页面切换正常 |
| `useTheme.ts` / 暗色模式 | `browser_click` 主题切换按钮 → 确认无报错 |

### 第四步：清理
- `browser_close` — 关闭 Playwright 页面
- 保持 `npm run dev` 运行（如需继续开发）

### 验证通过标准
- ✅ 浏览器控制台无红色 error
- ✅ 页面快照中关键 UI 元素存在（按钮、列表、输入框）
- ✅ 操作后状态正确变更（loading 消失、数据更新、列表变化）

### 注意
- 如果 `browser_navigate` 连接失败，检查 Electron 窗口是否已加载完毕（Vite dev server 可能需 10+ 秒首次启动）
- 如果某模块没有可验证的数据（如空列表），先创建测试数据再验证

$ARGUMENTS
