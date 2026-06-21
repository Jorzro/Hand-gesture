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
    return eval(`(${html.slice(start, end).trim()})`);
}

const getSingleGestureConfirmationState = loadFunction(
    "getSingleGestureConfirmationState",
    "updateGestureState"
);

let state = {
    pendingCandidate: null,
    stableFrames: 0,
    confirmedCandidate: null
};

state = getSingleGestureConfirmationState(state, 4, 3);
state = getSingleGestureConfirmationState(state, 5, 3);
state = getSingleGestureConfirmationState(state, 4, 3);
assert.equal(
    state.confirmedCandidate,
    null,
    "alternating numeric gestures must not accumulate into a false confirmation"
);

state = getSingleGestureConfirmationState(state, 4, 3);
state = getSingleGestureConfirmationState(state, 4, 3);
assert.equal(
    state.confirmedCandidate,
    4,
    "three consecutive frames of the same numeric gesture must confirm it"
);

state = getSingleGestureConfirmationState(state, "pinch", 3);
assert.deepEqual(
    state,
    {
        pendingCandidate: null,
        stableFrames: 0,
        confirmedCandidate: null
    },
    "single-hand pinch must be neutral and must never trigger media"
);

assert.doesNotMatch(
    html.slice(
        html.indexOf("function updateGestureState("),
        html.indexOf("function updateTrackedHandPosition(")
    ),
    /setGestureMode\("pinch"/,
    "single-hand gesture state must not contain a media pinch entry"
);

console.log("Single gesture state checks passed");
