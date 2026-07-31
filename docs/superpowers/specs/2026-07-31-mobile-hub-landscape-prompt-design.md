# Mobile Hub Landscape Prompt Design

**Date:** 2026-07-31
**Status:** Approved for planning

## Goal

Prevent the mobile level hub from appearing clipped in portrait orientation by
showing the existing landscape prompt as soon as a touch user enters the hub.
After the device rotates, the prompt disappears automatically and the hub is
usable without another tap.

## Scope

- Apply the orientation prompt to touch devices while the game state is `hub`.
- Keep the main menu and non-hub browsing flows usable in portrait.
- Preserve the existing portrait battle gate and deferred level start.
- Preserve all desktop behavior.
- Do not request fullscreen or attempt to lock screen orientation automatically.

## Behavior

1. A touch user enters the level hub.
2. If the effective viewport is portrait, the existing
   `#mobile-portrait-overlay` becomes active immediately.
3. The overlay displays the existing “请旋转设备至横屏” guidance and prevents
   interaction with the clipped hub beneath it.
4. When the effective viewport becomes landscape, the overlay is removed
   automatically and the landscape hub is immediately usable.
5. If the user rotates back to portrait while still in the hub, the overlay
   appears again.
6. Selecting a level in portrait continues to use the existing deferred battle
   start. Rotating to landscape resumes the originally selected level exactly
   once.

## Implementation Boundaries

The change belongs in `js/mobile/viewport-coordinator.js`, which already owns
orientation rendering and game-state awareness. Its overlay visibility rule
will include the `hub` state in addition to an active battle gate or portrait
gameplay. No new overlay component, orientation API, fullscreen request, or
hub-specific JavaScript state will be introduced.

Existing CSS remains responsible for the full-screen prompt presentation and
safe-area handling. CSS may receive only a narrowly scoped adjustment if the
current overlay does not fully block hub interaction at the target viewport.

## State and Event Flow

- `ShowHub()` changes `Game.state` to `hub` and triggers the existing mobile
  state notification.
- `MobileViewportCoordinator.onGameStateChange()` rerenders orientation UI.
- The coordinator shows the prompt when all three conditions hold:
  touch capability, portrait effective viewport, and hub/battle-gate/playing
  state.
- `orientationchange`, `resize`, or `visualViewport.resize` refreshes device
  capability and rerenders the prompt.
- Existing pending battle callbacks remain independent from the hub-only
  prompt and run only after a level selection has activated the battle gate.

## Compatibility and Failure Handling

- Desktop and non-touch devices never receive the prompt.
- Mobile browsers that cannot lock orientation still work because the design
  relies only on viewport dimensions.
- Fullscreen failure is irrelevant to hub access because fullscreen is not
  requested.
- The existing effective viewport fallback continues to support browsers
  without `visualViewport`.

## Verification

Add or update Playwright coverage to prove:

- a portrait touch device shows the prompt immediately after entering the hub;
- rotating that device to landscape removes the prompt and leaves the hub
  visible and interactive;
- rotating back to portrait while in the hub restores the prompt;
- desktop hub entry does not show the prompt;
- the existing portrait level-selection defer/resume test still passes.

Run the focused mobile Playwright suite and a production build after the
test-first change.
