# WEIMETA Automatic Media Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前景媒体改为拳头＋五掌开启的自动轮播：图片停留 3 秒、视频完整播放后切换、五掌仅控制远近、双拳收回魔方。

**Architecture:** 保持单文件 `code_artifact.html` 的现有结构，在媒体双面 CSS 3D 轮播之上增加单一自动播放调度器。调度器只在媒体完全居中后工作，图片使用可取消定时器，视频使用 `ended` 事件；双手状态机负责进入、缩放与双拳退出，不再把手掌横向速度交给切页逻辑。

**Tech Stack:** HTML、CSS、JavaScript、Three.js r128、MediaPipe Hands、Node.js 断言测试、浏览器手动模式。

---

## 文件结构

- `code_artifact.html`：自动播放调度、视频生命周期、五掌缩放、双拳状态机和手动调试入口。
- `tests/automatic-carousel.test.cjs`：纯函数与源码契约测试，覆盖媒体时长策略、双拳退出与手掌缩放方向。
- `tests/dual-gesture-state.test.cjs`：更新双手入口和禁用手势切页的回归约束。
- `tests/weimeta-regression.test.cjs`：保留本地素材、6000 粒子和媒体渲染回归检查。

### Task 1: 锁定自动播放规则

**Files:**
- Create: `tests/automatic-carousel.test.cjs`
- Modify: `tests/dual-gesture-state.test.cjs`

- [ ] **Step 1: 添加失败测试**

在 `tests/automatic-carousel.test.cjs` 中读取 HTML 并要求以下接口存在：

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(
    path.join(__dirname, "..", "code_artifact.html"),
    "utf8"
);

assert.match(html, /const IMAGE_AUTOPLAY_DURATION_MS = 3000;/);
assert.ok(html.includes("function scheduleAutomaticAdvance("));
assert.ok(html.includes("function clearAutomaticAdvance("));
assert.ok(html.includes("function getPalmDepthScale("));
assert.ok(html.includes("function areBothHandsFists("));
assert.doesNotMatch(
    html.slice(
        html.indexOf("function updateDualHandGestures("),
        html.indexOf("function onHandResults(")
    ),
    /handleForegroundMediaSwipe\(/
);
```

在 `tests/dual-gesture-state.test.cjs` 中把入口约束改为：

```js
assert.match(
    dualUpdateSource,
    /dualOpenStableSince[\s\S]*?triggerCrystalMediaExtraction/,
    "a stable fist plus open palm must start automatic playback"
);
assert.doesNotMatch(
    dualUpdateSource,
    /pinch-confirmed[\s\S]*?triggerCrystalMediaExtraction/,
    "automatic playback must not require a pinch"
);
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --test tests/automatic-carousel.test.cjs tests/dual-gesture-state.test.cjs
```

Expected: FAIL，提示缺少 `IMAGE_AUTOPLAY_DURATION_MS`、自动调度函数以及旧状态机仍调用手势切页。

- [ ] **Step 3: 提交测试**

```bash
git add tests/automatic-carousel.test.cjs tests/dual-gesture-state.test.cjs
git commit -m "test: define automatic carousel behavior"
```

### Task 2: 实现图片与视频自动调度

**Files:**
- Modify: `code_artifact.html`
- Test: `tests/automatic-carousel.test.cjs`

- [ ] **Step 1: 增加调度状态**

在媒体常量和运行状态附近加入：

```js
const IMAGE_AUTOPLAY_DURATION_MS = 3000;

let automaticAdvanceTimer = 0;
let automaticAdvanceGeneration = 0;
```

- [ ] **Step 2: 实现可取消调度器**

在 `advanceForegroundMedia` 附近加入：

```js
function clearAutomaticAdvance() {
    automaticAdvanceGeneration += 1;
    window.clearTimeout(automaticAdvanceTimer);
    automaticAdvanceTimer = 0;
    [dom.selectedVideo, dom.nextVideo].forEach((video) => {
        video.onended = null;
    });
}

function scheduleAutomaticAdvance(selected, faceIndex) {
    clearAutomaticAdvance();
    if (dualMediaPhase !== "displaying" || !selected) return;
    const generation = automaticAdvanceGeneration;

    if (selected.type === "video") {
        const video = faceIndex === 0 ? dom.selectedVideo : dom.nextVideo;
        video.loop = false;
        video.onended = () => {
            if (
                generation !== automaticAdvanceGeneration ||
                dualMediaPhase !== "displaying"
            ) return;
            advanceForegroundMedia(1);
        };
        return;
    }

    automaticAdvanceTimer = window.setTimeout(() => {
        if (
            generation !== automaticAdvanceGeneration ||
            dualMediaPhase !== "displaying"
        ) return;
        advanceForegroundMedia(1);
    }, IMAGE_AUTOPLAY_DURATION_MS);
}
```

- [ ] **Step 3: 只在媒体居中后启动调度**

在 `displaySelectedMedia` 完成首项显示时调用：

```js
scheduleAutomaticAdvance(selected, activeMediaFaceIndex);
```

在 `transitionForegroundMedia` 的 640ms 翻页完成回调末尾调用：

```js
scheduleAutomaticAdvance(selected, incomingIndex);
```

在翻页开始前调用：

```js
clearAutomaticAdvance();
```

- [ ] **Step 4: 退出时清理**

在 `releaseCrystalMediaExtraction`、`completeCrystalMediaReturn` 和 `stopSelectedVideo` 的轮播退出路径中调用：

```js
clearAutomaticAdvance();
```

- [ ] **Step 5: 运行测试**

```bash
node --test tests/automatic-carousel.test.cjs tests/weimeta-regression.test.cjs
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add code_artifact.html tests/automatic-carousel.test.cjs
git commit -m "feat: add timed automatic media playback"
```

### Task 3: 改为拳头＋五掌进入并禁用手势切页

**Files:**
- Modify: `code_artifact.html`
- Modify: `tests/dual-gesture-state.test.cjs`

- [ ] **Step 1: 修改入口**

在 `updateDualHandGestures` 的非播放分支中删除捏合累计逻辑，改为：

```js
if (openPalm) {
    if (!dualOpenStableSince) dualOpenStableSince = now;
    updateCrystalZoomFromOpenPalm(control);
    if (now - dualOpenStableSince >= DUAL_OPEN_HOLD_MS) {
        setDualGesturePhase("open-confirmed", now);
        triggerCrystalMediaExtraction(
            window.innerWidth * 0.5,
            window.innerHeight * 0.5
        );
    }
} else {
    dualOpenStableSince = 0;
    setDualGesturePhase("wait-control-open", now);
}
```

将 `triggerCrystalMediaExtraction` 的入口门槛改为：

```js
dualGesturePhase !== "open-confirmed"
```

- [ ] **Step 2: 移除播放期间滑动切页**

把播放分支中的：

```js
const motion = sampleControlPalm(control, now);
updateForegroundFollowFromPalm(control);
handleForegroundMediaSwipe(control, now, motion);
```

替换为：

```js
updateCrystalZoomFromOpenPalm(control);
dualControlMode = "depth-zoom";
```

保留 `handleForegroundMediaSwipe` 旧函数不再调用，避免扩大重构范围。

- [ ] **Step 3: 更新手动入口**

- `模拟双手`：拳头＋五掌开启自动轮播。
- `模拟滑动`：改名为“模拟远近”，每次点击在近/远缩放目标间切换。
- `模拟捏合`：仅提示自动轮播不再使用捏合。

- [ ] **Step 4: 运行双手测试**

```bash
node --test tests/dual-gesture-state.test.cjs tests/automatic-carousel.test.cjs
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add code_artifact.html tests/dual-gesture-state.test.cjs
git commit -m "feat: start carousel with fist and open palm"
```

### Task 4: 五掌只控制远近

**Files:**
- Modify: `code_artifact.html`
- Modify: `tests/automatic-carousel.test.cjs`

- [ ] **Step 1: 添加缩放纯函数测试**

在 `tests/automatic-carousel.test.cjs` 中加载 `getPalmDepthScale` 并断言：

```js
assert.ok(
    getPalmDepthScale({ palmSize: 0.12, palmZ: 0 }) >
    getPalmDepthScale({ palmSize: 0.32, palmZ: 0 }),
    "a farther open palm must enlarge the carousel"
);
```

- [ ] **Step 2: 运行测试确认失败**

```bash
node --test tests/automatic-carousel.test.cjs
```

Expected: FAIL，提示缺少缩放函数。

- [ ] **Step 3: 实现缩放映射**

```js
function getPalmDepthScale({ palmSize, palmZ }) {
    const apparentSize = THREE.MathUtils.clamp(palmSize, 0.1, 0.36);
    const sizeT = THREE.MathUtils.clamp(
        (apparentSize - 0.1) / 0.26,
        0,
        1
    );
    const depthOffset = THREE.MathUtils.clamp(palmZ * 0.45, -0.12, 0.12);
    return THREE.MathUtils.clamp(
        THREE.MathUtils.lerp(1.18, 0.68, sizeT) - depthOffset,
        0.62,
        1.22
    );
}
```

增加：

```js
let mediaDepthScaleTarget = 1;
let mediaDepthScaleCurrent = 1;
```

播放期间张掌时更新：

```js
const palm = getPalmCenter(control.landmarks);
mediaDepthScaleTarget = getPalmDepthScale({
    palmSize: control.metrics.palmSize,
    palmZ: palm.z
});
```

在 `animateImage` 中平滑应用：

```js
mediaDepthScaleCurrent +=
    (mediaDepthScaleTarget - mediaDepthScaleCurrent) *
    (1 - Math.exp(-delta * 7));
const controlledScale = previewScale * mediaDepthScaleCurrent;
dom.mediaPreview.style.transform =
    `translate(-50%, -50%) scale(${controlledScale})`;
```

- [ ] **Step 4: 固定轮播中心**

进入轮播时将 `mediaFollowTarget` 和 `mediaFollowCurrent` 固定到 `mediaPreviewLayout` 中心，播放期间不再调用 `updateForegroundFollowFromPalm`。

- [ ] **Step 5: 运行测试并提交**

```bash
node --test tests/automatic-carousel.test.cjs
git add code_artifact.html tests/automatic-carousel.test.cjs
git commit -m "feat: control carousel depth with open palm"
```

### Task 5: 双拳收回魔方

**Files:**
- Modify: `code_artifact.html`
- Modify: `tests/automatic-carousel.test.cjs`

- [ ] **Step 1: 添加双拳判定测试**

```js
assert.equal(
    areBothHandsFists([
        { fistLike: true },
        { fistLike: true }
    ]),
    true
);
assert.equal(
    areBothHandsFists([
        { fistLike: true },
        { fistLike: false }
    ]),
    false
);
```

- [ ] **Step 2: 实现退出判定**

```js
function areBothHandsFists(hands) {
    return hands.length >= 2 && hands
        .slice(0, 2)
        .every((hand) => hand.fistLike ?? isFistLike(hand));
}
```

增加：

```js
const DUAL_FIST_EXIT_HOLD_MS = 400;
let dualExitFistsStableSince = 0;
```

在 `updateDualHandGestures` 最前面加入：

```js
if (dualMediaPhase === "displaying" && areBothHandsFists(hands)) {
    if (!dualExitFistsStableSince) dualExitFistsStableSince = now;
    if (now - dualExitFistsStableSince >= DUAL_FIST_EXIT_HOLD_MS) {
        releaseCrystalMediaExtraction();
    }
    return true;
}
dualExitFistsStableSince = 0;
```

- [ ] **Step 3: 保持双拳退出后的魔方状态**

将 `completeCrystalMediaReturn` 的最终状态从五指星云改为握拳魔方：

```js
setFingerState(0, true);
dom.gestureTitle.textContent = "双拳收回 · 素材已回到魔方";
```

确保 `releaseCrystalMediaExtraction` 的收缩动画仍以 `nebulaSystem.position` 为目标。

- [ ] **Step 4: 更新手动双拳模拟**

新增或复用按钮，使播放期间点击“模拟握拳”触发双拳收回，而非普通单拳退出。

- [ ] **Step 5: 运行测试并提交**

```bash
node --test tests/automatic-carousel.test.cjs tests/dual-gesture-state.test.cjs
git add code_artifact.html tests/automatic-carousel.test.cjs
git commit -m "feat: retract carousel on stable double fist"
```

### Task 6: 完整回归与单标签页验证

**Files:**
- Verify: `code_artifact.html`
- Verify: `card-images/embedded-media.js`

- [ ] **Step 1: 运行完整自动测试**

```bash
node --test tests/*.cjs
```

Expected: 所有测试通过。

- [ ] **Step 2: 检查脚本语法**

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('code_artifact.html','utf8');const scripts=[...h.matchAll(/<script(?: [^>]*)?>([\\s\\S]*?)<\\/script>/g)].map(m=>m[1]).filter(Boolean);for(const s of scripts)new Function(s);console.log('syntax ok')"
```

Expected: `syntax ok`。

- [ ] **Step 3: 单标签页验证**

用一个浏览器标签页依次验证：

1. Chrome `file://` 打开后媒体池显示 12 项且 Mini 有图。
2. 手动拳头＋五掌进入自动轮播。
3. 图片居中保持约 3 秒后自动切换。
4. 视频不循环，播放到结束后才切换。
5. 横向移动不切页；远近模拟只改变缩放。
6. 双拳后前景收缩回魔方。
7. 再次拳头＋五掌可重新进入。
8. 控制台无运行错误。

- [ ] **Step 4: 最终提交**

```bash
git add code_artifact.html tests/automatic-carousel.test.cjs tests/dual-gesture-state.test.cjs
git commit -m "feat: complete automatic gesture media carousel"
```

- [ ] **Step 5: 创建下一版本标签**

版本名使用实际完成时间：

```bash
git tag -a v2026.06.21-HHMM-auto-carousel -m "Automatic media carousel"
```
