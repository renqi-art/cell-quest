# Initial Load Performance Optimization

## Goal

Reduce the production homepage cold-load delay without changing gameplay, layout, or desktop/mobile behavior.

Baseline measured through a production SSH tunnel:

- Cold load: 4.8–6.9 seconds
- Warm load: 0.88 seconds
- Initial transfer: about 2.29 MB across 36 requests
- Main-menu PNG: 1.96 MB and 4.9 seconds
- Icon font: 147 KB and 3.9 seconds

## Scope

### 1. Compress the visible homepage background

- Convert `images/main-menu-bg-v4.png` to WebP.
- Keep the PNG source in the repository for future editing and rollback.
- Point `css/main-menu-v4.css` at the WebP output with a new cache version.
- Target: no more than 400 KB while preserving the current visual composition.

### 2. Avoid blocking icon rendering

- Change the Phosphor font face from `font-display: block` to `font-display: swap`.
- Keep the same font file and icon classes.

### 3. Defer non-homepage game images

- Stop calling `loadSprites()` and `preloadBgImages()` during initial page setup.
- Add one idempotent asset-start function.
- Trigger it when the player enters the hub, before a level can start.
- Preserve existing sprite URLs, level configuration, and rendering behavior.

### 4. Keep script bundling out of this change

The page has 30 legacy script tags, but measured DOMContentLoaded is already 0.6–0.9 seconds. Bundling them is higher-risk and is not required for the current cold-load bottleneck.

## Validation

- Add regression checks for WebP usage, non-blocking font display, and deferred heavy image loading.
- Run unit and server tests, production build, desktop/mobile Playwright flows, and `git diff --check`.
- Deploy the WebP plus changed HTML/CSS/JS files.
- Re-measure production with the same browser harness.

Success criteria:

- Homepage background is at most 400 KB.
- Cold transfer is below 1 MB in the production browser measurement.
- Cold `load` is below 2.5 seconds on the same SSH-tunnel benchmark.
- Warm `load` remains below 1.2 seconds.
- No failed homepage resource requests.

## Rollback

Retain the PNG source and the previous production files in the server backup directory. Rollback only requires restoring the previous CSS/JS files and restarting the Node process if the JS preload change is reverted.
