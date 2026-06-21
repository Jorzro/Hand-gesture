const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(
    path.join(__dirname, "..", "code_artifact.html"),
    "utf8"
);
const embeddedMediaPath = path.join(
    __dirname,
    "..",
    "card-images",
    "embedded-media.js"
);

function numericConstant(name) {
    const match = html.match(new RegExp(`const ${name} = ([0-9.]+);`));
    assert.ok(match, `missing ${name}`);
    return Number(match[1]);
}

assert.ok(
    html.includes("function createMiniPreviewTexture("),
    "mini media must use a normalized preview texture"
);
assert.equal(
    numericConstant("PARTICLE_COUNT"),
    6000,
    "all foreground states must use exactly 6,000 particles"
);
assert.equal(
    numericConstant("MINI_MEDIA_COUNT"),
    12,
    "mini media count must match the fixed 12-slot media pool"
);
assert.match(
    html,
    /new THREE\.PlaneGeometry\(1\.[0-9]+,\s*1\.[0-9]+\)/,
    "mini media must use genuinely small thumbnail planes"
);
assert.ok(
    !html.includes("new THREE.PlaneGeometry(5.2, 5.2)"),
    "legacy oversized mini media planes must be removed"
);
assert.ok(
    !html.includes("(face % 2 === 0 ? -1 : 1) * 14.2"),
    "crystal thumbnails must live inside the volume instead of on cube faces"
);
assert.ok(
    html.includes("THREE.LinearMipmapLinearFilter"),
    "mini preview textures must use mipmaps when reduced to a few pixels"
);
assert.ok(
    !html.includes("MEDIA_TYPE_CYCLE"),
    "media selection must not use a fixed image/video cycle"
);
assert.match(
    html,
    /const pool = mediaItems;/,
    "media selection must randomly choose from the complete loaded media pool"
);
assert.ok(
    html.includes("function discoverDirectoryMediaUrls("),
    "the page must try to read existing JPG/MP4 files from card-images instead of only asking the user to upload"
);
assert.ok(
    html.includes('<script src="./card-images/embedded-media.js"></script>'),
    "file:// Chrome must load the generated embedded media manifest"
);
assert.ok(
    fs.existsSync(embeddedMediaPath),
    "embedded media manifest must exist beside the local card assets"
);
if (fs.existsSync(embeddedMediaPath)) {
    const embeddedMedia = fs.readFileSync(embeddedMediaPath, "utf8");
    assert.match(
        embeddedMedia,
        /window\.__WEIMETA_EMBEDDED_MEDIA__\s*=\s*\[/,
        "embedded media manifest must expose a browser-readable asset list"
    );
    assert.equal(
        (embeddedMedia.match(/data:image\//g) || []).length,
        12,
        "all nine images and three video posters must have embedded preview data"
    );
}
assert.ok(
    html.includes("function loadEmbeddedMediaPool("),
    "file:// loading must bypass local WebGL texture restrictions with embedded previews"
);
assert.ok(
    html.includes("未读取到 card-images 中的 JPG / MP4"),
    "empty media hints must refer to local card-images files, not uploading"
);
assert.ok(
    !html.includes("请上传"),
    "the page must not tell the user to upload when media files already live in card-images"
);

assert.ok(
    numericConstant("DUAL_PINCH_ENTER_RATIO") >= 0.38 &&
        numericConstant("DUAL_PINCH_ENTER_RATIO") <= 0.44,
    "dual-hand pinch entry must tolerate real camera landmark spacing"
);
assert.ok(
    numericConstant("GESTURE_CONFIRM_FRAMES") >= 5 &&
        numericConstant("GESTURE_CONFIRM_FRAMES") <= 8,
    "single-hand numeric gestures need enough consecutive frames to reject camera jitter"
);
assert.ok(
    numericConstant("DUAL_FIST_HOLD_MS") >= 280,
    "fist hand must remain stable before dual-hand control starts"
);
assert.ok(
    numericConstant("DUAL_OPEN_HOLD_MS") >= 280,
    "control hand must be fully open before it can swipe or pinch"
);
assert.ok(
    numericConstant("DUAL_PINCH_HOLD_MS") >= 200,
    "intentional pinch must remain stable before extraction"
);
assert.ok(
    numericConstant("DUAL_RELEASE_HOLD_MS") >= 180,
    "pinch release must remain stable before media returns"
);
assert.ok(
    numericConstant("DUAL_ROLE_LOST_MS") >= 350 &&
        numericConstant("DUAL_ROLE_LOST_MS") <= 650,
    "brief two-hand tracking loss must not reset the gesture before a pinch can confirm"
);
assert.ok(
    numericConstant("DUAL_PINCH_MAX_PALM_SPEED") >= 0.3 &&
        numericConstant("DUAL_PINCH_MAX_PALM_SPEED") <= 0.45,
    "pinch confirmation must tolerate camera jitter while still rejecting swipes"
);
assert.ok(
    html.includes('let dualGesturePhase = "idle";'),
    "dual-hand behavior must use an explicit phase state machine"
);
assert.ok(
    html.includes("function isStrictOpenPalm("),
    "dual-hand control must require a genuinely open palm"
);
assert.ok(
    html.includes("function updateMiniOrbitFromOpenPalm("),
    "open-palm motion must control the internal thumbnail orbit"
);
assert.ok(
    html.includes('id="manual-swipe-btn"'),
    "manual mode must expose a swipe control for no-camera verification"
);
assert.ok(
    html.includes("miniOrbitVelocity"),
    "thumbnail orbit must have independent inertial velocity"
);
assert.ok(
    html.includes('dualGesturePhase !== "open-confirmed"'),
    "media extraction must require a confirmed fist-plus-open-palm gesture"
);
assert.ok(
    html.includes("let dualReleaseObserved = false;"),
    "media return must remember the confirmed thumb-index release"
);
assert.ok(
    html.includes("function getDualReopenGate("),
    "media extraction must rearm only after a clear thumb-index release"
);
assert.ok(
    html.includes("pinchArmed = false;"),
    "leaving a dual-hand session must disarm the single-hand pinch path"
);
assert.ok(
    html.includes("let selectedVideoRequestId = 0;"),
    "video display callbacks must be scoped to the current media request"
);
assert.ok(
    html.includes("requestId !== selectedVideoRequestId"),
    "stale video callbacks must be ignored"
);
assert.ok(
    html.includes("function playSelectedVideo(videoElement, requestId)"),
    "video play promises must use request-local element and request id"
);
assert.ok(
    html.includes("selectedVideoElement.oncanplay = () => {") &&
        html.includes("revealVideo();") &&
        html.includes("window.setTimeout(revealVideo, 700)"),
    "MP4 display must have canplay and timer fallbacks when first-frame callbacks do not fire"
);
assert.ok(
    html.includes("dom.selectedImage.complete"),
    "cached or repeated JPG selections must reveal immediately instead of waiting for an onload that may not fire"
);
assert.ok(
    html.includes('dualMediaPhase !== "returning"'),
    "long hand-loss reset must not interrupt the media return animation"
);
assert.ok(
    numericConstant("DUAL_RETURN_MAX_MS") >= 1500 &&
        numericConstant("DUAL_RETURN_MAX_MS") <= 2200,
    "media return must have a bounded fallback so the next pinch cannot be stuck behind a stale returning state"
);
assert.match(
    html,
    /function releaseCrystalMediaExtraction\(\)[\s\S]*?window\.setTimeout\(\(\) => \{[\s\S]*?completeCrystalMediaReturn\(\);[\s\S]*?\}, DUAL_RETURN_MAX_MS\);/,
    "media return fallback must be scheduled from the release path, not only from requestAnimationFrame"
);
assert.ok(
    html.includes("function animateImage(time, delta)") &&
        html.includes("Math.exp(-delta *"),
    "media extraction and return animation must be time-based so low FPS cannot stall return"
);
assert.ok(
    html.includes("previewTexture: texture"),
    "image thumbnails must reuse the decoded image texture so file URLs do not black out canvas previews"
);
assert.match(
    html,
    /function createMiniMediaOrbit\(\)[\s\S]*?depthTest: false,[\s\S]*?depthWrite: false,/,
    "transparent mini thumbnails must not self-occlude through the depth buffer"
);

assert.match(
    html,
    /if \(activeHandCount > 1\) \{\s*updateDualHandGestures\(analyzedHands\);\s*return;\s*\}/,
    "two-hand frames must never fall through to single-hand pinch selection"
);
assert.match(
    html,
    /#selected-image,[\s\S]*?#selected-video[\s\S]*?object-fit:\s*contain;/,
    "foreground images and videos must preserve their original aspect ratio"
);
assert.match(
    html,
    /function triggerCrystalMediaExtraction\([\s\S]*?displaySelectedMedia\(/,
    "left fist plus open palm must use the clear foreground media renderer"
);
assert.ok(
    html.includes('id="media-cube-stage"') &&
        html.includes('id="media-face-current"') &&
        html.includes('id="media-face-next"'),
    "foreground carousel must have two independent DOM media faces"
);
assert.match(
    html,
    /#media-cube-stage[\s\S]*?transform-style:\s*preserve-3d;/,
    "foreground carousel must use CSS 3D cube transforms"
);
assert.ok(
    html.includes("function transitionForegroundMedia("),
    "foreground media switching must use an explicit cube transition"
);

console.log("WEIMETA regression checks passed");
