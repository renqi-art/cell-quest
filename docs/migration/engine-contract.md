# Game Engine Contract

Vue depends only on `src/game/bridge/GameEngine.ts`.

## Commands

- `mount`
- `destroy`
- `loadLevel`
- `pause`
- `resume`
- `retry`
- `quitLevel`
- `setTwoPlayer`
- `dispatch`

## Events

- `state-changed`
- `hud-updated`
- `tutorial-opened`
- `knowledge-opened`
- `level-completed`
- `player-died`
- `toast-requested`
- `fatal-error`

Event payloads are immutable domain data. Phaser objects, legacy `Game`
objects, DOM nodes, and mutable entity collections may not cross the bridge.
