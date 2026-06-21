# Palm-follow 2D Cube Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 WEIMETA 页面改为 6,000 粒子，并实现左拳＋右掌触发、跟随右掌位置的前景 2D 立方翻页轮播。

**Architecture:** 保持单文件 `code_artifact.html`。粒子数量由统一常量控制；双手状态机只把握拳手作为持续锚点、张掌手作为位置与滑动控制；前景媒体使用两个 DOM 面板完成 CSS 3D 翻页并独立管理视频生命周期。

**Tech Stack:** HTML、CSS、JavaScript、Three.js r128、MediaPipe Hands、CSS 3D transforms、Node.js 断言测试。

---

### Task 1: 锁定粒子和手势规则

**Files:**
- Modify: `tests/weimeta-regression.test.cjs`
- Modify: `tests/dual-gesture-state.test.cjs`
- Modify: `code_artifact.html`

- [ ] 添加失败测试：`PARTICLE_COUNT` 必须为 6000，双手入口由握拳＋张掌触发，不再依赖捏合。
- [ ] 运行 `node tests/weimeta-regression.test.cjs && node tests/dual-gesture-state.test.cjs`，确认因旧粒子数和旧入口失败。
- [ ] 将粒子常量改为 6000，并让双手状态机在拳头稳定后等待右掌张开。
- [ ] 运行三组测试并确认通过。

### Task 2: 前景 CSS 3D 双面轮播

**Files:**
- Modify: `code_artifact.html`
- Modify: `tests/weimeta-regression.test.cjs`

- [ ] 添加失败测试：页面必须包含双媒体面、CSS `preserve-3d` 和前景切换函数。
- [ ] 将 `#media-preview` 改为带当前面和待进入面的 3D 容器。
- [ ] 图片、视频均保持原比例；翻页完成前旧视频不停止，完成后再切换播放主体。
- [ ] 运行测试并用脚本语法检查确认通过。

### Task 3: 右掌跟随和左右切换

**Files:**
- Modify: `code_artifact.html`
- Modify: `tests/dual-gesture-state.test.cjs`

- [ ] 添加失败测试：右掌位置更新跟随目标，左挥为下一项、右挥为上一项。
- [ ] 将右掌坐标映射到屏幕，加入边界限制和平滑插值。
- [ ] 右掌丢失时不更新目标、不暂停视频、不退出轮播。
- [ ] 左拳丢失超过容错时间后关闭轮播。
- [ ] 运行测试确认通过。

### Task 4: 单窗口真实验证

**Files:**
- Verify: `code_artifact.html`

- [ ] 启动本地 HTTP 服务，并只打开一个浏览器窗口。
- [ ] 验证 6,000 粒子的 0–5 状态和握拳魔方内部 Mini 素材。
- [ ] 验证左拳＋右掌进入、跟手移动、左右挥切换和右手丢失保持。
- [ ] 验证图片清晰、视频有声播放尝试、翻页完成后视频交接。
- [ ] 验证左拳丢失退出、再次进入可用、控制台无运行错误。
- [ ] 运行完整测试、脚本语法检查与 `git diff --check`。
