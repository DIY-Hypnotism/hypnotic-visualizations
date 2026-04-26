(function () {
  var state = {
    mode: "natural",
    queued: null,
    lastFlushedCallbacks: 0,
    originals: null
  };

  function ensureOriginals() {
    if (!state.originals) {
      state.originals = {
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
        cancelAnimationFrame: window.cancelAnimationFrame.bind(window)
      };
    }
  }

  function getDebugInfo() {
    try {
      if (typeof window.__codexDebugState === "function") {
        return window.__codexDebugState();
      }
      if (window.__codexDebugState && typeof window.__codexDebugState === "object") {
        return window.__codexDebugState;
      }
    } catch (error) {
      return { error: String(error && error.stack ? error.stack : error) };
    }
    return null;
  }

  function snapshot() {
    var doc = document.documentElement;
    return {
      mode: state.mode,
      hasRenderFrame: typeof window.renderFrame === "function",
      animationCount: document.getAnimations ? document.getAnimations().length : 0,
      canvasCount: document.querySelectorAll ? document.querySelectorAll("canvas").length : 0,
      width: (doc && doc.clientWidth) || window.innerWidth || 1280,
      height: (doc && doc.clientHeight) || window.innerHeight || 720,
      queuedCount: state.queued ? state.queued.size : 0,
      lastFlushedCallbacks: state.lastFlushedCallbacks,
      debugInfo: getDebugInfo()
    };
  }

  function setMode(mode) {
    ensureOriginals();

    if (mode === state.mode) {
      return snapshot();
    }

    if (mode === "deterministic") {
      var queued = new Map();
      var nextId = 1;

      window.requestAnimationFrame = function (callback) {
        var id = nextId++;
        queued.set(id, callback);
        return id;
      };

      window.cancelAnimationFrame = function (id) {
        queued.delete(id);
        return state.originals.cancelAnimationFrame(id);
      };

      try {
        if (document.getAnimations) {
          document.getAnimations().forEach(function (animation) {
            animation.pause();
          });
        }
        document.querySelectorAll("video, audio").forEach(function (media) {
          if (typeof media.pause === "function") {
            media.pause();
          }
          media.currentTime = 0;
        });
      } catch (error) {
        console.error(error);
      }

      state.mode = mode;
      state.queued = queued;
      state.lastFlushedCallbacks = 0;
      window.__HARNESS__ = { mode: state.mode, queued: queued, lastFlushedCallbacks: 0 };
      return snapshot();
    }

    window.requestAnimationFrame = state.originals.requestAnimationFrame;
    window.cancelAnimationFrame = state.originals.cancelAnimationFrame;
    state.mode = "natural";
    state.queued = null;
    state.lastFlushedCallbacks = 0;
    window.__HARNESS__ = { mode: state.mode, queued: null, lastFlushedCallbacks: 0 };
    return snapshot();
  }

  function flushQueuedAnimationFrames(timestamp) {
    var passes = 0;
    var callbacks = 0;
    var maxPasses = 8;

    if (!state.queued) {
      return {
        passes: 0,
        callbacks: 0,
        remaining: 0,
        state: snapshot()
      };
    }

    while (passes < maxPasses && state.queued.size > 0) {
      var batch = Array.from(state.queued.entries());
      state.queued.clear();
      passes += 1;
      callbacks += batch.length;

      batch.forEach(function (entry) {
        var callback = entry[1];
        try {
          callback(timestamp);
        } catch (error) {
          console.error(error);
        }
      });
    }

    state.lastFlushedCallbacks = callbacks;
    window.__HARNESS__ = {
      mode: state.mode,
      queued: state.queued,
      lastFlushedCallbacks: callbacks
    };

    return {
      passes: passes,
      callbacks: callbacks,
      remaining: state.queued.size,
      state: snapshot()
    };
  }

  function reply(id, ok, payload) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        __codexRenderframeBridge: true,
        id: id,
        ok: ok,
        payload: payload
      }, "*");
    }
  }

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.__codexRenderframeHarness !== true) {
      return;
    }

    (async function () {
      try {
        var result;

        switch (data.type) {
          case "ping":
            result = snapshot();
            break;
          case "set-mode":
            result = setMode(data.mode);
            break;
          case "get-state":
            result = snapshot();
            break;
          case "render-frame":
            if (typeof window.renderFrame !== "function") {
              throw new Error("No renderFrame() found");
            }
            await window.renderFrame(data.timeMs, data.context);
            result = snapshot();
            break;
          case "flush-raf":
            result = flushQueuedAnimationFrames(data.timestamp);
            break;
          default:
            throw new Error("Unknown bridge request: " + data.type);
        }

        reply(data.id, true, result);
      } catch (error) {
        reply(data.id, false, String(error && error.stack ? error.stack : error));
      }
    })();
  });

  window.__HARNESS__ = { mode: state.mode, queued: null, lastFlushedCallbacks: 0 };

  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      __codexRenderframeBridgeReady: true
    }, "*");
  }
})();
