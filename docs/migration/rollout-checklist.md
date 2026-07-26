# Frontend Migration Rollout Checklist

## Foundation Gate

- [x] Vite serves all three legacy URLs.
- [x] Production build contains all three HTML entry points.
- [x] TypeScript strict checking passes.
- [x] Vitest unit suite passes.
- [x] Existing Playwright suite passes through Vite.
- [x] Vue roots mount without changing legacy visuals.
- [x] Vue accesses the legacy runtime only through `GameEngine`.
- [x] Unrelated working-tree changes remain untouched.

## Next Plan

After this gate passes, write the Vue UI and shared-domain migration plan
against the actual `GameEngine` contract. Do not begin Phaser migration until
the UI and domain boundary is covered by tests.
