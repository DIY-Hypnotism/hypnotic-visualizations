# DIY Hypnotism
## Hypnotic Visualisations

This repository contains legally curated hypnotic visualisations for DIY Hypnotism.

These visualisations now target both DIY Hypnotism v2 and the upcoming v3 release.

## About the App

DIY Hypnotism is a macOS self-hypnosis app that lets you create your own hypnotic sessions using text to speech, your own scripts, background audio, and visualisations.

This repository contains the visualisation files used by the app.

For more information about the app, see:

* Website: https://www.diyhypnotism.com/
* App Store: https://apps.apple.com/gb/app/diy-hypnotism/id1331447267?mt=12

## v3 Update

DIY Hypnotism v3 adds an optional deterministic export path for visualisations.

This means a visualisation can now provide an export-only hook:

```javascript
window.renderFrame = async function (timeMs, context) {
  // Draw the exact frame for timeMs.
  // context.frameIndex
  // context.frameRate
  // context.durationMs
  // context.width / context.height
  // context.isExport === true
};
```

This hook is used for faster and more reliable video export, especially for canvas, WebGL, and CSS animation based visualisations.

## Backward Compatibility

v3 is designed to remain compatible with v2 visualisations.

If a visualisation does not define `renderFrame()`, the app falls back to the legacy v2-style export path.

That means:

* existing v2 visualisations can continue to work unchanged
* live preview and normal playback still behave like a regular `WKWebView`
* a single visualisation can support both v2 and v3
* adding v3 hooks should not break v2, because v2 simply ignores them

## Recommended v3 Support Files

For visualisations that want the new v3 export path, include the v3 support files in the repo and add:

```html
<script src="./support/renderframe-bridge.js"></script>
```

This bridge allows DIY Hypnotism v3 to talk to `renderFrame()` during deterministic export.

For CSS animation based visualisations, you can also add:

```html
<script src="./export-render-hooks.js"></script>
<script>
window.renderFrame = async function (timeMs) {
  window.__exportRenderHooks.freezeCssAnimationsAt(timeMs);
};
</script>
<script src="./support/renderframe-bridge.js"></script>
```

This is the simplest way to make CSS animations export deterministically in v3.

## Author Guidance

Use the lightest approach that fits the visualisation:

* Pure v2 visualisation: no change required.
* CSS animation visualisation: add `export-render-hooks.js`, define `renderFrame()`, and include `renderframe-bridge.js`.
* Canvas or WebGL visualisation: move drawing logic into a function that can render a specific `timeMs`, then call that from `renderFrame()`.

If a visualisation only starts animating after user interaction or focus, it should also respond to the custom `diyHypnotismStart` event fired by DIY Hypnotism v3:

```javascript
window.addEventListener('diyHypnotismStart', startAutoplay, false);
startAutoplay();
```

That keeps autoplay-friendly behaviour for v3 while remaining safe for normal browser playback.

## Testing

For v3-ready visualisations, test both paths:

* normal browser playback
* in-app preview
* deterministic export via `renderFrame()`

## Licences

These files are licensed under MIT unless otherwise stated in the individual HTML file.

## Pull Requests

Please make sure any file you submit is legally allowed to be copied.

It should have a known licence, or be in the public domain.

When possible, note whether the visualisation:

* is unchanged v2 content
* adds optional v3 `renderFrame()` support
* requires any extra support assets

Thank you.
