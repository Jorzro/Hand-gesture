# Orbital Carousel Gesture Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有单文件 Rainbow Cards 页面升级为白框深弧轨道轮播，并实现“捏合挑出、握拳聚拢、张手爆发归位”的完整手势闭环。

**Architecture:** 保持所有运行时代码位于 `index.html`。使用 `interactionPhase` 驱动离散流程，使用 `railState.clusterProgress` 在渲染循环中连续插值轨道与聚拢布局，GSAP Timeline 只负责阶段过渡；MediaPipe 分类器分别输出张手、捏合和握拳信号。

**Tech Stack:** HTML、CSS、JavaScript、Three.js 0.160、GSAP 3.12.5、MediaPipe Hands、EffectComposer、UnrealBloomPass。

---

### Task 1: 轨道轮播和白色卡框

**Files:**
- Modify: `index.html`

- [ ] 将卡体材质改成白色实体边框，缩小正反面纹理以露出边框。
- [ ] 将线框颜色统一为白色，并让彩虹开关只控制内层光谱与泛光强度。
- [ ] 将线性深度布局改为正弦空间弧：中央卡向前，两侧卡沿 Z 轴后退并朝中央旋转。
- [ ] 运行模块语法检查，确认页面能加载。

### Task 2: 持久选中卡与聚拢布局

**Files:**
- Modify: `index.html`

- [ ] 新增 `interactionPhase`、`selectedSourceCard`、`showcaseCard` 和 `railState.clusterProgress`。
- [ ] 将原抽卡 Timeline 改成只挑出并悬浮，不翻面、不自动回收。
- [ ] 新增聚拢动作，将未选卡插值到后方紧凑扇形卡组。
- [ ] 新增释放动作，让悬浮卡归位并恢复轮播。
- [ ] 更新统计、Toast、按钮文案和键盘测试流程。

### Task 3: 粒子爆发

**Files:**
- Modify: `index.html`

- [ ] 创建独立的爆发粒子 Points、速度、寿命和颜色缓冲。
- [ ] 在张手释放时从选中卡后方发射径向彩色粒子。
- [ ] 在动画循环中更新阻尼、位移、透明度和回收。
- [ ] 同步短暂增强 Bloom，确保效果明显但不遮挡卡面。

### Task 4: 拳头识别与手势状态机

**Files:**
- Modify: `index.html`

- [ ] 使用四指关节弯曲、指尖到掌心距离和拇指收拢共同判断拳头。
- [ ] 添加独立的拳头确认帧、释放帧和 `isFist` 状态。
- [ ] 限定捏合、握拳、张手各自在对应阶段触发。
- [ ] 更新光标样式、状态文案和调试数据。
- [ ] 用代表性 landmarks 状态序列验证每个阶段只触发一次。

### Task 5: 浏览器验证

**Files:**
- Verify: `index.html`

- [ ] 通过本地 HTTP 服务打开桌面页面，验证加载、入场和完整手动流程。
- [ ] 检查每个阶段的截图和浏览器错误日志。
- [ ] 使用 390×844 视口验证移动端无遮挡、无滚动。
- [ ] 启动摄像头，验证张手滑动、捏合、握拳、再次张手。
- [ ] 运行脚本语法检查、`git diff --check` 和需求标记审计。

