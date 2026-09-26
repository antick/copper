# Copper interaction budgets

These budgets are release criteria. A feature that works but regularly misses them does not ship.

## Frame budgets

| Display | Frame budget |
|---|---:|
| 60 Hz | 16.67 ms |
| 120 Hz | 8.33 ms |

## Interaction targets

| Interaction | Target |
|---|---|
| Keystroke → visible character | <16 ms, target <8 ms |
| Cursor movement | next frame |
| Selection drag | locked to display refresh |
| Normal editor scrolling | no sustained dropped frames |
| Open command palette | <50 ms perceived |
| Switch already-open tab | <30 ms |
| Open a normal Markdown note | <50 ms perceived |
| Search input | never blocks typing |
| Background index | must not starve typing/scrolling |
| Idle CPU | approximately 0–1% |

## Document size gates

| Size | Expectation |
|---|---|
| 10–100 KB | instantaneous |
| 1 MB | no perceptible typing/scroll lag |
| 5 MB | typing/scrolling remain comfortable; heavy embeds may defer |
| 25–50 MB | stay responsive; Live Preview marks and embeds stay viewport-scoped or disabled |

## Hard rules

- CodeMirror owns the document. Do not mirror the full Markdown string into React state on each keystroke.
- Decorations must use visible ranges (plus limited lookahead), not the whole document.
- Do not `invoke` Rust on the input path.
- Do not poll the filesystem when watcher events exist.
- Index and search work stay off the editor transaction path.

Latest measured jsdom dispatch numbers live in `docs/performance-baseline.md`.
