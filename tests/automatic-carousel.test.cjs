const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(
    path.join(__dirname, "..", "code_artifact.html"),
    "utf8"
);

function loadFunction(name, nextName, globals = {}) {
    const start = html.indexOf(`function ${name}(`);
    const end = html.indexOf(`function ${nextName}(`, start);
    assert.ok(start >= 0, `missing ${name}`);
    assert.ok(end > start, `missing boundary after ${name}`);
    return Function(
        ...Object.keys(globals),
        `return (${html.slice(start, end).trim()});`
    )(...Object.values(globals));
}

function loadAutomaticMediaHelpers() {
    const start = html.indexOf("function getAutomaticMediaOrder(");
    const end = html.indexOf("function showForegroundMediaAtIndex(", start);
    assert.ok(start >= 0, "missing automatic media order helpers");
    assert.ok(end > start, "missing boundary after automatic media order helpers");
    return Function(`
        ${html.slice(start, end)}
        return {
            getAutomaticMediaOrder,
            getInitialAutomaticMedia,
            getNextAutomaticMedia
        };
    `)();
}

assert.match(
    html,
    /const IMAGE_AUTOPLAY_DURATION_MS = 3000;/,
    "images must remain centered for exactly three seconds"
);
assert.ok(
    html.includes("function scheduleAutomaticAdvance("),
    "automatic carousel must schedule the next item"
);
assert.ok(
    html.includes("function clearAutomaticAdvance("),
    "automatic carousel timers and video listeners must be cancellable"
);
assert.ok(
    html.includes("function getPalmDepthScale("),
    "open-palm depth must map to carousel scale"
);
assert.ok(
    html.includes("function areBothHandsFists("),
    "double-fist exit must have an explicit predicate"
);

const dualUpdateSource = html.slice(
    html.indexOf("function updateDualHandGestures("),
    html.indexOf("function onHandResults(")
);
assert.doesNotMatch(
    dualUpdateSource,
    /handleForegroundMediaSwipe\(/,
    "hand movement must never switch automatic carousel items"
);
assert.doesNotMatch(
    dualUpdateSource,
    /updateForegroundFollowFromPalm\(/,
    "the open palm must not drag the carousel around the screen"
);

const animateSource = html.slice(
    html.indexOf("function animate()"),
    html.indexOf("dom.colorPicker.addEventListener")
);
assert.doesNotMatch(
    animateSource,
    /dualMediaPhase\s*=\s*"idle"/,
    "generic hand-loss reset must not terminate automatic playback"
);
assert.match(
    animateSource,
    /dualMediaPhase === "idle"[\s\S]*?handResetApplied = true/,
    "generic hand-loss reset may run only while no carousel is active"
);

const returnSource = html.slice(
    html.indexOf("function completeCrystalMediaReturn()"),
    html.indexOf("function triggerBurst()")
);
assert.match(
    returnSource,
    /handLastSeenAt = 0;[\s\S]*?handResetApplied = true;[\s\S]*?setFingerState\(0, true\)/,
    "double-fist return must preserve the fist cube after hands leave the camera"
);

const fingerStateSource = html.slice(
    html.indexOf("function setFingerState("),
    html.indexOf("function distance3D(")
);
assert.match(
    fingerStateSource,
    /const nextGestureMode =[\s\S]*?gestureMode === nextGestureMode[\s\S]*?gestureMode = nextGestureMode/,
    "returning to an existing particle state must still normalize its gesture mode"
);

const transitionSource = html.slice(
    html.indexOf("async function transitionForegroundMedia("),
    html.indexOf("function hideSelectedImage(")
);
assert.match(
    transitionSource,
    /scheduleAutomaticAdvance\(selected, incomingIndex\)/,
    "automatic timing must start only after the incoming face is centered"
);
assert.match(
    html,
    /function triggerCrystalMediaExtraction\([\s\S]*?getInitialAutomaticMedia\(mediaItems\)/,
    "automatic carousel must start from the prioritized media queue"
);
assert.match(
    html,
    /function advanceForegroundMedia\([\s\S]*?getNextAutomaticMedia\(mediaItems, selectedMediaItem, direction\)/,
    "automatic carousel must keep advancing through the prioritized media queue"
);
assert.match(
    html,
    /showMediaByType: \(type\) => \{[\s\S]*?clearAutomaticAdvance\(\);[\s\S]*?displaySelectedMedia\(selected,[\s\S]*?\)/,
    "manual QA must be able to force a specific image or video without an old autoplay timer taking it back"
);
assert.ok(
    html.includes("get mediaDepthScaleCurrent()"),
    "manual QA must expose current depth scale so open-palm zoom can be verified directly"
);

const automaticMedia = loadAutomaticMediaHelpers();
const sampleItems = [
    { type: "image", index: 0, url: "image-0.jpg" },
    { type: "video", index: 9, url: "video-9.mp4" },
    { type: "image", index: 1, url: "image-1.jpg" },
    { type: "video", index: 10, url: "video-10.mp4" }
];
assert.deepEqual(
    automaticMedia.getAutomaticMediaOrder(sampleItems).map((item) => item.url),
    ["video-9.mp4", "video-10.mp4", "image-0.jpg", "image-1.jpg"],
    "automatic carousel must play videos first, then images"
);
assert.equal(
    automaticMedia.getInitialAutomaticMedia(sampleItems).url,
    "video-9.mp4",
    "automatic carousel must start with the first available video"
);
assert.equal(
    automaticMedia.getNextAutomaticMedia(sampleItems, sampleItems[3], 1).url,
    "image-0.jpg",
    "automatic carousel must continue to images after the prioritized videos finish"
);
assert.equal(
    automaticMedia.getNextAutomaticMedia(sampleItems, sampleItems[0], -1).url,
    "video-10.mp4",
    "reverse direction must also follow the prioritized media queue"
);

const getPalmDepthScale = loadFunction(
    "getPalmDepthScale",
    "areBothHandsFists",
    {
        THREE: {
            MathUtils: {
                clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
                lerp: (from, to, amount) => from + (to - from) * amount
            }
        }
    }
);
assert.ok(
    getPalmDepthScale({ palmSize: 0.12, palmZ: 0 }) >
        getPalmDepthScale({ palmSize: 0.32, palmZ: 0 }),
    "a farther open palm must enlarge the carousel"
);

const areBothHandsFists = loadFunction(
    "areBothHandsFists",
    "getDualReopenGate",
    {
        isFistLike: (hand) => Boolean(hand.fistLike)
    }
);
assert.equal(
    areBothHandsFists([
        { fistLike: true },
        { fistLike: true }
    ]),
    true,
    "two fists must request carousel retraction"
);
assert.equal(
    areBothHandsFists([
        { fistLike: true },
        { fistLike: false }
    ]),
    false,
    "one fist and one open palm must keep automatic playback active"
);

console.log("Automatic carousel checks passed");
