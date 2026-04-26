(function () {
  function clampTime(timeMs) {
    if (!isFinite(timeMs)) {
      return 0;
    }
    return Math.max(0, timeMs || 0);
  }

  function normalizedLoopTime(timeMs, durationMs) {
    var absoluteTimeMs = clampTime(timeMs);
    if (!durationMs || !isFinite(durationMs) || durationMs <= 0) {
      return absoluteTimeMs;
    }
    var t = absoluteTimeMs % durationMs;
    return t < 0 ? t + durationMs : t;
  }

  function resolveSeekTime(timeMs, options) {
    var absoluteTimeMs = clampTime(timeMs);
    options = options || {};

    if (options.mode === 'loop' || options.loop === true || options.wrap === true) {
      return normalizedLoopTime(absoluteTimeMs, options.durationMs);
    }

    return absoluteTimeMs;
  }

  function freezeCssAnimationsAt(timeMs, options) {
    var seekMs = resolveSeekTime(timeMs, options);
    var animations = document.getAnimations ? document.getAnimations({ subtree: true }) : [];
    for (var i = 0; i < animations.length; i++) {
      try {
        animations[i].pause();
        animations[i].currentTime = seekMs;
      } catch (error) {
        // Ignore animations that cannot be controlled.
      }
    }
    return seekMs;
  }

  window.__exportRenderHooks = {
    clampTime: clampTime,
    normalizedLoopTime: normalizedLoopTime,
    freezeCssAnimationsAt: freezeCssAnimationsAt
  };
})();
