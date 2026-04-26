(function (root) {
    var FULL_ROTATION_DEGREES = 360;
    var ROW_ROTATION_DEGREES_PER_ROW = 6;
    var CIRCLE_GROUP_ROTATION_MULTIPLIER_STEP = 0;
    var BASE_ORBIT_RADIUS = 30;
    var CIRCLE_RADIUS = 5;

    function resolveDotCount(dotCount) {
        var numericDotCount = Number(dotCount);
        if (!Number.isFinite(numericDotCount) || numericDotCount <= 0) {
            return 1;
        }

        return Math.max(1, Math.round(numericDotCount));
    }

    function normalizeRotationIndex(value, dotCount) {
        var normalized = Math.round(Number(value) || 0) % FULL_ROTATION_DEGREES;
        if (normalized < 0) {
            normalized += FULL_ROTATION_DEGREES;
        }
        return normalized;
    }

    function normalizeCircleIndex(value, dotCount) {
        var safeDotCount = resolveDotCount(dotCount);
        var normalized = Math.round(Number(value) || 0) % safeDotCount;
        if (normalized < 0) {
            normalized += safeDotCount;
        }
        return normalized;
    }

    function rotationAngleStep(dotCount) {
        return (Math.PI * 2) / resolveDotCount(dotCount);
    }

    function circleGroupRotationMultiplier(circleIndex, dotCount) {
        var safeDotCount = resolveDotCount(dotCount);
        var normalizedCircleIndex = normalizeCircleIndex(circleIndex, safeDotCount);
        return 1 + (normalizedCircleIndex * CIRCLE_GROUP_ROTATION_MULTIPLIER_STEP);
    }

    function orbitRadiusForIndex(circleIndex, dotCount) {
        return BASE_ORBIT_RADIUS;
    }

    function rotationAngleForIndex(circleIndex, rotationIndex, dotCount) {
        var safeDotCount = resolveDotCount(dotCount);
        var normalizedCircleIndex = normalizeCircleIndex(circleIndex, safeDotCount);
        var normalizedRotationIndex = normalizeRotationIndex(rotationIndex, safeDotCount);
        var rotationMultiplier = circleGroupRotationMultiplier(normalizedCircleIndex, safeDotCount);
        return (rotationAngleStep(safeDotCount) * normalizedCircleIndex) +
            (((Math.PI * 2) / FULL_ROTATION_DEGREES) * normalizedRotationIndex * rotationMultiplier);
    }

    function circlePositionForIndex(circleIndex, rotationIndex, dotCount) {
        var angle = rotationAngleForIndex(circleIndex, rotationIndex, dotCount);
        var orbitRadius = orbitRadiusForIndex(circleIndex, dotCount);

        return {
            x: Math.cos(angle) * orbitRadius,
            y: Math.sin(angle) * orbitRadius
        };
    }

    function nextRotationIndex(currentIndex, delta, dotCount) {
        return normalizeRotationIndex((Number(currentIndex) || 0) +
            ((Number(delta) || 0) * ROW_ROTATION_DEGREES_PER_ROW),
            dotCount);
    }

    function rotationForRowIndex(rowIndex, dotCount) {
        return normalizeRotationIndex((Number(rowIndex) || 0) * ROW_ROTATION_DEGREES_PER_ROW, dotCount);
    }

    function deterministicRowsForFrame(frameIndex, rowCount, rowSpacing, dotCount, speed) {
        var safeRowCount = Math.max(1, Math.round(Number(rowCount) || 20));
        var safeRowSpacing = Math.max(1, Number(rowSpacing) || 35);
        var safeSpeed = Number(speed);
        if (!Number.isFinite(safeSpeed)) {
            safeSpeed = 1;
        }

        var safeFrameIndex = Math.max(0, Math.round(Number(frameIndex) || 0));
        var distance = safeFrameIndex * safeSpeed;
        var recycledRows = 0;

        if (safeSpeed >= 0) {
            recycledRows = Math.max(0, Math.ceil(distance / safeRowSpacing) - 2);
        }

        var firstRowIndex = 1 + recycledRows;
        var rows = [];

        for (var index = 0; index < safeRowCount; index++) {
            var rowIndex = firstRowIndex + index;
            rows.push({
                rowIndex: rowIndex,
                z: -safeRowSpacing * rowIndex,
                rotation: rotationForRowIndex(rowIndex, dotCount)
            });
        }

        return {
            frameIndex: safeFrameIndex,
            cameraZ: -distance,
            recycledRows: recycledRows,
            rows: rows
        };
    }

    root.__dotTunnelMath = {
        circleRadius: CIRCLE_RADIUS,
        normalizeRotationIndex: normalizeRotationIndex,
        rotationAngleStep: rotationAngleStep,
        circleGroupRotationMultiplier: circleGroupRotationMultiplier,
        orbitRadiusForIndex: orbitRadiusForIndex,
        rotationAngleForIndex: rotationAngleForIndex,
        circlePositionForIndex: circlePositionForIndex,
        nextRotationIndex: nextRotationIndex,
        rotationForRowIndex: rotationForRowIndex,
        deterministicRowsForFrame: deterministicRowsForFrame
    };
})(typeof window !== "undefined" ? window : globalThis);
