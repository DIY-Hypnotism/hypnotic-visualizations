var renderer, scene, camera, light, circles, circleGeometry, circleMaterials;
var TUNNEL_SPEED = 1;
var dotTunnelMath = window.__dotTunnelMath || {
    normalizeRotationIndex: function (value, dotCount) {
        var normalized = Math.round(Number(value) || 0) % dotCount;
        if (normalized < 0) {
            normalized += dotCount;
        }
        return normalized;
    },
    rotationAngleStep: function (dotCount) {
        return (Math.PI * 2) / dotCount;
    },
    rotationAngleForIndex: function (circleIndex, rotationIndex, dotCount) {
        var normalizedCircleIndex = this.normalizeRotationIndex(circleIndex, dotCount);
        var normalizedRotationIndex = this.normalizeRotationIndex(rotationIndex, dotCount);
        return this.rotationAngleStep(dotCount) * (normalizedCircleIndex + normalizedRotationIndex);
    },
    nextRotationIndex: function (currentIndex, delta, dotCount) {
        return this.normalizeRotationIndex((Number(currentIndex) || 0) + (Number(delta) || 0), dotCount);
    }
};

var ww = window.innerWidth,
    wh = window.innerHeight,
    colors = [
      0x442D65,0x775BA3,0x91C5A9,0xF8E1B4,
      0xF98A5F,0xF9655F,0x442D65,0x775BA3,
      0x91C5A9,0xF8E1B4,0xF98A5F,0xF9655F
    ],
    closest = {position:{z:0}},
    farest = {position:{z:0}},
    radius = dotTunnelMath.circleRadius || 5,
    segments = 32,
    DOT_COUNT = colors.length,
    ROTATION_ANGLE_STEP = dotTunnelMath.rotationAngleStep(colors.length),
    isExportRendering = false,
    lastDebugMode = "init",
    lastDebugTimeMs = 0,
    lastExportFrameIndex = null,
    lastExportFrameRate = null,
    lastTargetFrameIndex = null,
    lastLoggedExportSecond = null,
    lastDeterministicFrameIndex = null,
    resizeObserver = null;

function init(){
    renderer = new THREE.WebGLRenderer({canvas : document.getElementById('scene')});
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0x000000, 300, 700 );

    camera = new THREE.PerspectiveCamera(50,ww/wh, 0.1, 10000 );
    camera.position.set(0,0,0);
    scene.add(camera);

    handleResize();
    initializeRowResources();
    resetTunnelState();
    requestAnimationFrame(render);
}

function handleResize() {
    var viewportWidth = 0;
    var viewportHeight = 0;

    if (window.visualViewport) {
        viewportWidth = Math.max(viewportWidth, window.visualViewport.width || 0);
        viewportHeight = Math.max(viewportHeight, window.visualViewport.height || 0);
    }

    viewportWidth = Math.max(
        viewportWidth,
        document.documentElement.clientWidth || 0,
        document.body ? document.body.clientWidth : 0,
        window.innerWidth || 0,
        1
    );
    viewportHeight = Math.max(
        viewportHeight,
        document.documentElement.clientHeight || 0,
        document.body ? document.body.clientHeight : 0,
        window.innerHeight || 0,
        1
    );

    ww = viewportWidth;
    wh = viewportHeight;

    if (renderer) {
        if (renderer.setPixelRatio) {
            renderer.setPixelRatio(window.devicePixelRatio || 1);
        }
        renderer.setSize(ww, wh, false);

        if (renderer.domElement) {
            renderer.domElement.style.width = ww + "px";
            renderer.domElement.style.height = wh + "px";
        }
    }

    if (camera) {
        camera.aspect = ww / Math.max(wh, 1);
        camera.updateProjectionMatrix();
    }
}

function scheduleResizeStabilization() {
    [0, 50, 150, 300, 600, 1000].forEach(function (delay) {
        window.setTimeout(handleResize, delay);
    });
}

function installResizeObservers() {
    if (resizeObserver || typeof ResizeObserver !== "function") {
        return;
    }

    resizeObserver = new ResizeObserver(function () {
        handleResize();
    });

    resizeObserver.observe(document.documentElement);
    if (document.body) {
        resizeObserver.observe(document.body);
    }
}

function initializeRowResources() {
    if (!circleGeometry) {
        circleGeometry = new THREE.CircleGeometry(radius, segments);
    }

    if (!circleMaterials) {
        circleMaterials = colors.map(function (color) {
            return new THREE.MeshBasicMaterial({ color: color });
        });
    }
}

function configureCircle(circle, circleIndex, rotationIndex) {
    var normalizedRotationIndex = dotTunnelMath.normalizeRotationIndex(rotationIndex, DOT_COUNT);
    var position = dotTunnelMath.circlePositionForIndex
        ? dotTunnelMath.circlePositionForIndex(circleIndex, normalizedRotationIndex, DOT_COUNT)
        : {
            x: Math.cos(dotTunnelMath.rotationAngleForIndex(circleIndex, normalizedRotationIndex, DOT_COUNT)) * 30,
            y: Math.sin(dotTunnelMath.rotationAngleForIndex(circleIndex, normalizedRotationIndex, DOT_COUNT)) * 30
        };
    circle.position.set(position.x, position.y, 0);
}

function configureRow(row, rotationIndex, zPosition) {
    row.degreesRotation = dotTunnelMath.normalizeRotationIndex(rotationIndex, DOT_COUNT);

    for (var j = 0; j < row.children.length; j++) {
        configureCircle(row.children[j], j, row.degreesRotation);
    }

    row.position.set(0, 0, zPosition);
}

function createRow(rotationIndex, zPosition) {
    var row = new THREE.Object3D();

    for (var j = 0; j < 12; j++) {
        var circle = new THREE.Mesh(circleGeometry, circleMaterials[j]);
        row.add(circle);
    }

    configureRow(row, rotationIndex, zPosition);
    return row;
}

function refreshTunnelBounds() {
    closest = circles.children[0];
    farest = circles.children[0];

    for(var i=0,j=circles.children.length;i<j;i++){
        if(circles.children[i].position.z>closest.position.z){
            closest = circles.children[i];
        }
        if(circles.children[i].position.z<farest.position.z){
            farest = circles.children[i];
        }
    }
}

var populateCircles = function(){
    circles = new THREE.Object3D();
    scene.add(circles);

    for(var i=0;i<20;i++){
        addCircle();
    }
};

var removeLine = function(isFarest){
    var target = isFarest ? farest : closest;
    for (var i = 0, j = circles.children.length; i < j; i++) {
        if (circles.children[i] === target) {
            circles.remove(circles.children[i]);
            break;
        }
    }
};

var addCircle = function(top){
    var row;
    if(top){
        row = createRow(dotTunnelMath.nextRotationIndex(closest.degreesRotation, -1, DOT_COUNT),
                        (closest.position.z/35+1)*35);
    }
    else{
        row = createRow(dotTunnelMath.nextRotationIndex(farest.degreesRotation, 1, DOT_COUNT),
                        (farest.position.z/35-1)*35);
    }

    circles.add(row);
    refreshTunnelBounds();
};

var recycleCircle = function(top){
    if (!circles || !circles.children || circles.children.length === 0) {
        return;
    }

    var row = top ? farest : closest;

    if (top) {
        configureRow(row,
                     dotTunnelMath.nextRotationIndex(closest.degreesRotation, -1, DOT_COUNT),
                     (closest.position.z / 35 + 1) * 35);
    } else {
        configureRow(row,
                     dotTunnelMath.nextRotationIndex(farest.degreesRotation, 1, DOT_COUNT),
                     (farest.position.z / 35 - 1) * 35);
    }

    refreshTunnelBounds();
};

function resetTunnelState() {
    if (circles) {
        scene.remove(circles);
    }

    closest = {position:{z:0}};
    farest = {position:{z:0}};
    populateCircles();
}

function sortedRowsForMutation() {
    if (!circles || !circles.children) {
        return [];
    }

    return sortedRowsByDepth();
}

function applyDeterministicFrame(targetFrameIndex) {
    if (!circles || !circles.children || circles.children.length !== 20) {
        resetTunnelState();
    }

    var state = dotTunnelMath.deterministicRowsForFrame(targetFrameIndex,
                                                       20,
                                                       35,
                                                       DOT_COUNT,
                                                       TUNNEL_SPEED);
    var rows = sortedRowsForMutation();

    for (var index = 0; index < rows.length && index < state.rows.length; index++) {
        configureRow(rows[index],
                     state.rows[index].rotation,
                     state.rows[index].z);
    }

    camera.position.set(0, 0, state.cameraZ);
    refreshTunnelBounds();
    lastDeterministicFrameIndex = state.frameIndex;
}

function drawScene() {
    camera.position.x = 0;
    renderer.render(scene, camera);
}

function sortedRowsByDepth() {
    return circles.children.slice().sort(function (left, right) {
        return right.position.z - left.position.z;
    });
}

function roundDebugValue(value) {
    return Math.round((value || 0) * 1000) / 1000;
}

function normalizeRotationStep(value) {
    return dotTunnelMath.normalizeRotationIndex(value, DOT_COUNT);
}

function formatColorHex(value) {
    var normalized = Number(value || 0) >>> 0;
    return "#" + normalized.toString(16).toUpperCase().padStart(6, "0");
}

function orderedRowColors(row) {
    if (!row || !row.children) {
        return [];
    }

    return row.children.slice().map(function (circle) {
        return {
            angle: Math.atan2(circle.position.y, circle.position.x),
            color: formatColorHex(circle.material.color.getHex())
        };
    }).sort(function (left, right) {
        return left.angle - right.angle;
    }).map(function (entry) {
        return entry.color;
    });
}

function sampleRowDebug(limit) {
    var rows = sortedRowsByDepth().slice(0, limit);
    var closestRotation = rows.length > 0 ? rows[0].degreesRotation : 0;

    return rows.map(function (row, index) {
        var expectedRotation = dotTunnelMath.nextRotationIndex(closestRotation, index, DOT_COUNT);
        var colorOrder = orderedRowColors(row);
        return {
            index: index,
            z: roundDebugValue(row.position.z),
            rotation: row.degreesRotation,
            normalizedRotationStep: normalizeRotationStep(row.degreesRotation),
            expectedRotation: expectedRotation,
            expectedRotationStep: normalizeRotationStep(expectedRotation),
            rotationOffset: normalizeRotationStep(row.degreesRotation - expectedRotation),
            colorOrder: colorOrder,
            firstColors: colorOrder.slice(0, 6)
        };
    });
}

window.__codexDebugState = function () {
    return {
        mode: lastDebugMode,
        timeMs: roundDebugValue(lastDebugTimeMs),
        exportFrameIndex: lastExportFrameIndex,
        exportFrameRate: lastExportFrameRate,
        targetFrameIndex: lastTargetFrameIndex,
        deterministicFrameIndex: lastDeterministicFrameIndex,
        speed: TUNNEL_SPEED,
        cameraZ: roundDebugValue(camera.position.z),
        cameraX: roundDebugValue(camera.position.x),
        closestZ: closest && closest.position ? roundDebugValue(closest.position.z) : null,
        farestZ: farest && farest.position ? roundDebugValue(farest.position.z) : null,
        expectedClosestZ: null,
        dotCount: DOT_COUNT,
        rotationAngleStep: roundDebugValue(ROTATION_ANGLE_STEP),
        palette: colors.map(formatColorHex),
        rowCount: circles && circles.children ? circles.children.length : 0,
        sampleRows: sampleRowDebug(6)
    };
};

function logExportDebugIfNeeded(force) {
    if (!isExportRendering) {
        return;
    }

    var exportSecond = Math.floor((lastDebugTimeMs || 0) / 1000);
    if (!force && exportSecond === lastLoggedExportSecond) {
        return;
    }

    lastLoggedExportSecond = exportSecond;

    var debugState = window.__codexDebugState();
    var rows = (debugState.sampleRows || []).slice(0, 3).map(function (row) {
        return [
            "z=" + row.z,
            "rot=" + row.rotation,
            "exp=" + row.expectedRotation,
            "off=" + row.rotationOffset,
            "step=" + row.normalizedRotationStep,
            "colors=" + (row.firstColors || []).join(">")
        ].join(" ");
    }).join(" | ");

    console.log(
        "[DotTunnelExport] second=" + exportSecond +
        " timeMs=" + debugState.timeMs +
        " exportFrameIndex=" + debugState.exportFrameIndex +
        " exportFrameRate=" + debugState.exportFrameRate +
        " targetFrameIndex=" + debugState.targetFrameIndex +
        " detFrameIndex=" + debugState.deterministicFrameIndex +
        " cameraZ=" + debugState.cameraZ +
        " closestZ=" + debugState.closestZ +
        " farestZ=" + debugState.farestZ +
        " rows=" + rows
    );
}

function advanceNaturalFrame() {
    camera.position.z -= TUNNEL_SPEED;
    camera.position.x = 0;

    if(camera.position.z<(closest.position.z-35) && TUNNEL_SPEED>0){
        recycleCircle(false);
    }
    else if(camera.position.z>(farest.position.z+665) && TUNNEL_SPEED<0){
        recycleCircle(true);
    }
}

var render = function () {
    if (isExportRendering) {
        return;
    }

    requestAnimationFrame(render);

    lastDebugMode = "natural";
    lastDebugTimeMs += (1000 / 60);
    advanceNaturalFrame();

    drawScene();
};

window.renderFrame = async function (timeMs, context) {
    isExportRendering = true;
    lastDebugMode = "deterministic";
    lastDebugTimeMs = timeMs || 0;
    lastExportFrameIndex = context && Number.isFinite(context.frameIndex) ? context.frameIndex : null;
    lastExportFrameRate = context && Number.isFinite(context.frameRate) ? context.frameRate : null;
    var deterministicFramesPerSecond = 60;
    var targetFrameIndex;

    if (context &&
        Number.isFinite(context.frameIndex) &&
        Number.isFinite(context.frameRate) &&
        context.frameRate > 0) {
        targetFrameIndex = Math.round((context.frameIndex * deterministicFramesPerSecond) / context.frameRate);
    } else {
        targetFrameIndex = Math.floor((((timeMs || 0) / 1000) * deterministicFramesPerSecond) + 0.000001);
    }

    lastTargetFrameIndex = targetFrameIndex;
    applyDeterministicFrame(targetFrameIndex);

    camera.position.x = 0;
    drawScene();
    logExportDebugIfNeeded(false);
};

init();
window.addEventListener("resize", handleResize);
window.addEventListener("pageshow", scheduleResizeStabilization);
window.addEventListener("diyHypnotismStart", function () {
    installResizeObservers();
    scheduleResizeStabilization();
    requestAnimationFrame(handleResize);
});
installResizeObservers();
scheduleResizeStabilization();
