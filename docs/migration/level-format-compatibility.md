# Classic Level Format Compatibility

## Canonical Runtime Shape

Phaser receives only a validated `ClassicLevelDefinition` from
`ClassicLevelRepository`. Built-in levels are inert TypeScript data under
`src/shared/classic/levels/`; custom levels and `CQ!` payloads are normalized
before they reach `parseClassicLevel`.

Canonical ids are zero-based strings `0` through `5`. Existing one-based
menu values must be converted at the UI boundary. The repository does not
guess whether `"1"` means menu level one or internal level index one.
Existing custom ids start at `"7"`.

## Built-In Source Precedence

The old runtime combined two sources:

- map rows and add-on arrays from `js/levels/level*.js`;
- displayed name, initial cell, and win condition from
  `LEVEL_CONFIGS` in `js/levels.js`.

The TypeScript levels preserve that effective combination. This matters
because several old map files contain stale metadata:

- level 2 says red-cell/collect in its map file but runs as
  white-cell/kill-all through `LEVEL_CONFIGS`;
- level 3 omits cell and win fields;
- level 4 is named "custom level" in its map file but is presented as
  "lymph node" by the level configuration.

The frozen summary fixture records widths, rows, entities, items,
checkpoints, question blocks, pipe spawners, and finish presence for all six
levels.

## Character Registry

| Character | Canonical meaning |
|---|---|
| space | empty |
| `#`, `=`, `S` | solid terrain |
| `B` | solid blood-loss terrain |
| `p` | solid pipe terrain |
| `_` | crumble platform |
| `^` | spike |
| `V` | spring |
| `J` | heart spring |
| `H` | non-solid decoration |
| `P` | player spawn |
| `C` | checkpoint |
| `F` | finish |
| `>` | legacy level-3 finish alias |
| `g`, `G`, `t` | staph, large staph, strep |
| `b` | Boss |
| `N` | NPC |
| `?`, `X` | normal and hidden question block |
| `D`, `O`, `M` | shield, oxygen, complement |
| `o`, `f`, `d`, `n`, `a`, `*` | coin, food, drink, nutrition, ATP, memory |

Unknown characters become empty cells and produce a warning containing the
exact row and column. They never execute code.

## Finish Compatibility

A player spawn is always required. A physical finish is required only for
`reach-finish` levels. Existing objective-driven levels may omit `F` and
complete through their kill/collect rule. Level 3's trailing `>` is treated
as an intended legacy finish alias because the old map contains it at the
end of the route even though the old parser overlooked it.

## Legacy Field Normalization

| Legacy value | Canonical value |
|---|---|
| `killAll` | `kill-all` |
| `collectAll` | `collect-all` |
| `reachFinish` | `reach-finish` |
| pipe `dir: "up"` | `direction: "up"` |
| pipe `dir: "up_jump"` | `direction: "up-jump"` |
| pipe `type: "staphLarge"` | `enemy: "staph-large"` |
| pipe `interval` | `intervalTicks` |

Missing optional arrays become empty arrays. Invalid entries inside floating
platform, pipe, tutorial, or knowledge arrays are discarded rather than
cast into executable runtime objects.

## Rejection Rules

The parser rejects:

- a non-object payload;
- a missing/empty map;
- non-string map rows;
- a non-positive width;
- an unsupported cell or win-condition value after canonical validation;
- zero or multiple player spawns;
- multiple physical finishes;
- a `reach-finish` level without a physical finish;
- an unknown level id.

`CQ!` data is Base64URL-decoded and JSON-parsed by the existing safe codec,
then passed through the same normalizer and parser. It is never evaluated as
JavaScript and cannot construct Phaser objects directly.
