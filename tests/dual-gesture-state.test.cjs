const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(
    path.join(__dirname, "..", "code_artifact.html"),
    "utf8"
);

function loadFunction(name, nextName) {
    const start = html.indexOf(`function ${name}(`);
    const end = html.indexOf(`function ${nextName}(`, start);
    assert.ok(start >= 0, `missing ${name}`);
    assert.ok(end > start, `missing boundary after ${name}`);
    const source = html.slice(start, end).trim();
    return eval(`(${source})`);
}

const getDualReopenGate = loadFunction(
    "getDualReopenGate",
    "getDualPinchShapeEligibility"
);
const getDualPinchShapeEligibility = loadFunction(
    "getDualPinchShapeEligibility",
    "getDualPinchEligibility"
);
const getDualPinchEligibility = loadFunction(
    "getDualPinchEligibility",
    "getDualPinchHoldState"
);
const getDualPinchHoldState = loadFunction(
    "getDualPinchHoldState",
    "getDualRoleScore"
);
const getDualRoleScore = loadFunction(
    "getDualRoleScore",
    "getDualFistEligibility"
);
const getDualFistEligibility = loadFunction(
    "getDualFistEligibility",
    "findDualHandRoles"
);
const getPalmSwipeDirection = loadFunction(
    "getPalmSwipeDirection",
    "handleForegroundMediaSwipe"
);
const getPalmFollowTarget = loadFunction(
    "getPalmFollowTarget",
    "updateForegroundFollowFromPalm"
);

assert.deepEqual(
    getDualReopenGate({
        intentionalPinch: true,
        releaseObserved: true
    }),
    { releaseObserved: true, canRearm: true },
    "a confirmed release held through the return animation must rearm after return"
);
assert.deepEqual(
    getDualReopenGate({
        intentionalPinch: true,
        releaseObserved: false
    }),
    { releaseObserved: false, canRearm: false },
    "a continuous pinch that was never released must stay blocked"
);
assert.deepEqual(
    getDualReopenGate({
        intentionalPinch: false,
        releaseObserved: false
    }),
    { releaseObserved: true, canRearm: true },
    "any clear thumb-index release must rearm without requiring a full open palm"
);

assert.equal(
    getDualPinchShapeEligibility({
        isFist: true,
        pinchRatio: 0.24,
        normalizedDepthGap: 0.2,
        maxRatio: 0.32,
        maxDepthGap: 0.75
    }),
    true,
    "a clear thumb-index pinch must work when the other fingers make the hand look fist-like"
);
assert.equal(
    getDualPinchShapeEligibility({
        isFist: true,
        pinchRatio: 0.46,
        normalizedDepthGap: 0.1,
        maxRatio: 0.32,
        maxDepthGap: 0.75
    }),
    false,
    "a closed hand without thumb-index contact must not be accepted as a pinch"
);

const basePinch = {
    phase: "open-control",
    intentionalPinch: true,
    palmSpeed: 0.08,
    now: 1000,
    lastMotionAt: 700,
    rearmReady: true,
    maxPalmSpeed: 0.38
};

assert.equal(
    getDualPinchEligibility({ ...basePinch, palmSpeed: 0.42 }),
    true,
    "a held pinch may enter confirmation while the palm is still settling"
);
assert.equal(
    getDualPinchEligibility({ ...basePinch, lastMotionAt: 900, palmSpeed: 0.08 }),
    false,
    "pinching immediately after a swipe must remain blocked"
);
assert.equal(
    getDualPinchEligibility(basePinch),
    true,
    "a stopped, intentional pinch may enter confirmation"
);
assert.equal(
    getDualPinchEligibility({
        ...basePinch,
        phase: "wait-control-open"
    }),
    true,
    "after the fist is stable, a deliberate direct pinch must not require an open-palm pre-step"
);

assert.deepEqual(
    getDualPinchHoldState({
        intentionalPinch: true,
        palmSpeed: 0.52,
        maxPalmSpeed: 0.38
    }),
    { keepPinchPhase: true, canAccumulateHold: true },
    "natural finger movement while closing a pinch must not reset confirmation"
);
assert.deepEqual(
    getDualPinchHoldState({
        intentionalPinch: true,
        palmSpeed: 0.12,
        maxPalmSpeed: 0.38
    }),
    { keepPinchPhase: true, canAccumulateHold: true },
    "a stable pinch must continue accumulating confirmation time"
);
assert.deepEqual(
    getDualPinchHoldState({
        intentionalPinch: false,
        palmSpeed: 0.12,
        maxPalmSpeed: 0.38
    }),
    { keepPinchPhase: false, canAccumulateHold: false },
    "releasing the thumb-index contact must cancel the current confirmation attempt"
);

assert.ok(
    getDualRoleScore({
        fistConfidence: 0.86,
        fistLooksPinched: false,
        controlLooksPinched: true,
        controlOpen: false,
        wristDistance: 0.24
    }) >
        getDualRoleScore({
            fistConfidence: 0.89,
            fistLooksPinched: true,
            controlLooksPinched: false,
            controlOpen: false,
            wristDistance: 0.24
        }),
    "when both hands look compact, the hand with thumb-index contact must remain the control hand"
);
assert.equal(
    getDualFistEligibility({
        fistLike: true,
        pinchLike: true
    }),
    true,
    "a real fist must remain eligible when the thumb naturally rests near the index finger"
);
assert.equal(
    getDualFistEligibility({
        fistLike: true,
        pinchLike: false
    }),
    true,
    "a compact hand without thumb-index contact remains a valid fist anchor"
);
assert.equal(
    getPalmSwipeDirection(-0.5),
    1,
    "a left swipe must advance to the next item"
);
assert.equal(
    getPalmSwipeDirection(0.5),
    -1,
    "a right swipe must return to the previous item"
);
assert.deepEqual(
    getPalmFollowTarget({
        palmX: 0.25,
        palmY: 0.4,
        viewportWidth: 1200,
        viewportHeight: 800,
        mediaWidth: 400,
        mediaHeight: 300,
        margin: 24
    }),
    { x: 900, y: 320 },
    "foreground media must follow the mirrored palm position"
);

const dualUpdateSource = html.slice(
    html.indexOf("function updateDualHandGestures("),
    html.indexOf("function onHandResults(")
);
assert.doesNotMatch(
    dualUpdateSource,
    /setDigitOverlay\(/,
    "two-hand fist control must not compete with numeric overlays"
);
assert.match(
    dualUpdateSource,
    /handleForegroundMediaSwipe\(/,
    "an open control palm must switch foreground media"
);
assert.match(
    dualUpdateSource,
    /updateForegroundFollowFromPalm\(/,
    "an open control palm must move the foreground carousel"
);
assert.match(
    dualUpdateSource,
    /pinch-confirmed[\s\S]*?triggerCrystalMediaExtraction/,
    "foreground carousel entry must require a confirmed control-hand pinch"
);
assert.doesNotMatch(
    dualUpdateSource,
    /setDualGesturePhase\("open-confirmed"[\s\S]*?triggerCrystalMediaExtraction/,
    "an open control palm must not directly trigger the foreground carousel"
);

const extractionSource = html.slice(
    html.indexOf("function triggerCrystalMediaExtraction("),
    html.indexOf("function releaseCrystalMediaExtraction(")
);
assert.match(
    extractionSource,
    /displaySelectedMedia\(/,
    "left fist plus control-hand pinch must show original media in the foreground"
);
assert.doesNotMatch(
    extractionSource,
    /showCubeCarousel\(/,
    "dual pinch must not map media onto the cube"
);

console.log("Dual gesture state checks passed");
