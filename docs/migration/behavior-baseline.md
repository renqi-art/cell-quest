# Frontend Behavior Baseline

## Entry Points

- `/`: main menu is visible and can enter the hub.
- `/editor.html`: editor canvas and templates load.
- `/deck.html`: presentation content renders.

## Game Flow

- A new save enters the first unlocked level.
- `P` pauses and the pause menu can return to the hub.
- P1 and P2 key mappings remain unchanged.
- No page errors occur in the covered flow.

## Compatibility Fixtures

- Existing `localStorage` save keys remain unchanged in the foundation phase.
- Existing custom-level and share-code formats remain unchanged.
- Classic scripts remain loaded until the final cutover plan.

## Classic Fixed-Step Baseline

Source of truth: `js/config.js`, `js/entities.js`, and `js/game.js` at
commit `35822bd`. Values are per 60 Hz simulation step unless noted.

| Behavior | Legacy value | Source/observation |
|---|---:|---|
| Tile size | 32 px | `TILE` |
| Fixed step | 1000 / 60 ms | `FIXED_STEP` |
| Gravity | 0.6 px/tick^2 | `GRAVITY` |
| Horizontal acceleration | 0.5 px/tick^2 | `MOVE_ACCEL` |
| Base maximum horizontal speed | 2.8 px/tick | `MOVE_MAX` |
| Ground friction multiplier | 0.82/tick | `GROUND_FRICTION` |
| Air friction multiplier | 0.92/tick | `AIR_FRICTION` |
| Jump velocity | -12.5 px/tick | `JUMP_VEL` |
| Maximum fall speed | 10 px/tick | `MAX_FALL` |
| Coyote window | 6 ticks | `COYOTE_FRAMES` |
| Jump buffer | 6 ticks | `JUMP_BUFFER` |
| Early jump-release clamp | -3 px/tick | `Player.update` |
| Double-jump multiplier | 0.85 | `DOUBLE_JUMP_MUL` |
| Standing/crouching height | 44 / 22 px | `STAND_H`, `CROUCH_H` |
| Player width | 22 px | `PLAYER_W` |
| Crouch speed multiplier | 0.7 | `CROUCH_SPEED` |
| Dash speed | 7 px/tick | `DASH_SPEED` |
| Dash duration | 8 ticks | `DASH_FRAMES` |
| Dash cooldown | 30 ticks | `DASH_COOLDOWN` |
| Normal contact damage | 5 HP | `Player.takeDamage` |
| Damage invincibility | 90 ticks | `INVINCIBLE_FRAMES` |
| Shield-hit invincibility | 30 ticks | `Player.takeDamage` |
| Crumble warning | 45 ticks | `CRUMBLE_SHAKE_FRAMES` |
| Crumble respawn | 240 ticks | `CRUMBLE_RESPAWN_FRAMES` |
| Floating-platform phase speed | 0.035 rad/tick | `FLOAT_SPEED` |
| Floating-platform default range | 32 px | `FLOAT_RANGE` |
| Camera follow | immediate horizontal center, clamped to world | `updateCamera` |
| Camera shake decay | x0.85/tick; stop below 0.3 | `updateCamera` |
| Rendered shake amplitude | horizontal x0.7; vertical x0.7 | `render` |

### Hazard Gap Captured Before Migration

The legacy parser and renderer recognize `^`, `V`, and `J`, but the current
player update and collision code has no corresponding spike or spring
collision branch. Therefore there is no honest legacy launch velocity or
spike hit-box value to copy. The approved Phaser migration treats this as a
known missing mechanic:

- `^` becomes a directional damage overlap routed through the common
  five-HP damage and 90-tick invincibility rules.
- `V` and `J` become upward launch triggers. Their exact launch velocities
  must be fixed by failing behavior tests before the Phaser collision
  implementation is written.

This distinction prevents a newly implemented mechanic from being reported
as byte-for-byte legacy parity.
