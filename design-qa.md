# Design QA — Home Menu Redesign

## Evidence

- Source visual truth: `docs/design-qa/home-menu-reference.png`
- Implementation screenshot: `docs/design-qa/home-menu-implementation.png`
- Side-by-side comparison: `docs/design-qa/home-menu-comparison.png`
- Viewport: `1280 x 720` CSS pixels, desktop, device scale factor `1`
- Source pixels: `1672 x 941`, normalized to `1280 x 720`
- Implementation pixels: `1280 x 720`
- State: main menu visible, `新的游戏` selected
- Browser evidence: in-app browser render at `http://127.0.0.1:8080/`
- Primary interactions tested:
  - Arrow Down moves the shared selected state from `新的游戏` to `存档管理`.
  - Keyboard focus follows the selected action.
  - Hovering `排行榜` applies the same selected class and visual contract.
  - Clicking `排行榜` opens the existing leaderboard panel.
  - No page console errors were present in the verified render.
  - The background exposes active `menuBackdropBreath` and `menuBackdropGlow` animations.

## Full-view Comparison

The implementation preserves the approved split composition: a dark, inset launch area on the left and an independent, high-detail cellular tunnel asset on the right. The title, subtitle, and menu remain readable without being baked into the artwork. The action group is inset from the left edge and retains ample room for additional or removed rows.

The generated background differs slightly in crop from the mock: the guardian cell is larger and farther right. This is acceptable because it improves text clearance and preserves the intended focal hierarchy.

## Focused Region Comparison

The menu-button region required a focused comparison because selected-state fidelity is the key acceptance surface.

### Comparison history

1. **Initial finding — P1:** the first implementation clipped the external selector node inside the angular button surface, making the selected state flatter than the approved source.
   - Fix: moved the angular surface to an internal pseudo-layer, removed clipping from the interactive button, restored the external pulsing node and navigation spine, and strengthened the selected border, scan streak, signal pixels, and bloom.
   - Post-fix evidence: `docs/design-qa/home-menu-implementation.png` and the implementation half of `docs/design-qa/home-menu-comparison.png` show the selector outside the button and a stronger luminous selected state.

2. **Post-fix result:** no actionable P0/P1/P2 differences remain in the selected-state region. The implementation intentionally keeps all rows the same layout height so selection can move without reflow and menu entries can be added or removed safely.

## Required Fidelity Surfaces

- **Fonts and typography:** Chinese display text uses a heavy system CJK face with layered shadow; English display text uses a condensed heavy face. Scale, hierarchy, line height, and letter spacing preserve the mock's game-poster character. The implementation is slightly more compact vertically to protect variable menu length; this is an acceptable P3 difference.
- **Spacing and layout rhythm:** the left content begins at roughly `7.6vw`, satisfying the requested non-flush alignment. Action gaps and row heights are consistent, with no overlap or clipping at the target viewport.
- **Colors and visual tokens:** hot magenta selected state, electric cyan secondary state, acid-lime tertiary state, navy-black base, and glow opacity align with the source. State colors are defined as reusable menu tokens.
- **Image quality and asset fidelity:** the custom cellular environment is a real standalone PNG asset, not CSS or placeholder art. It remains sharp at `1280 x 720`; title and controls are independent DOM content.
- **Copy and content:** `细胞远征`, `CELL QUEST`, `新的游戏`, `存档管理`, and `排行榜` match the approved source and existing product behavior.
- **Icons:** play, floppy-disk, and trophy icons come from the Phosphor icon library and share one optical system.
- **States and interactions:** selected, hover, focus, keyboard navigation, and reduced-motion handling are implemented. The selected visual moves between all actions rather than being hard-coded to the first button.
- **Accessibility:** semantic buttons remain keyboard reachable; focus follows arrow navigation; the high-contrast selected state is visible without relying only on color; decorative layers are hidden from assistive technology; reduced-motion media queries disable continuous animation.
- **Responsiveness:** desktop and compact-height rules preserve readable text and reachable actions. The background remains full-bleed while the left content keeps a safe inset.

## Findings

No actionable P0, P1, or P2 findings remain.

## Follow-up Polish

- P3: a future custom display font could match the source title's pixel cuts more literally.
- P3: the background PNG can be converted to WebP in a later asset-optimization pass if download weight becomes a release concern.

## Implementation Checklist

- [x] Independent background image asset
- [x] Data-driven reusable action list
- [x] Shared movable selected state
- [x] Keyboard and pointer behavior
- [x] Breathing background and selected-button motion
- [x] Reduced-motion fallback
- [x] Browser visual comparison
- [x] Console error check

final result: passed
