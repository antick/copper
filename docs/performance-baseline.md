# Copper editor performance baseline

Measured 2026-08-16 on:

- Machine: Apple M1 Max, 64 GB RAM
- OS: macOS (darwin 25.5.0)
- Display: primary 7680x3240 looking like 3840x1620 @ **60 Hz**; secondary 5K looking like 2560x1440 @ **60 Hz**
- Runtime for automated numbers: Vitest + jsdom + CodeMirror 6
- Real typing/scroll frame behavior still needs `bun run dev` → `/perf`

jsdom does not paint a WebView. These numbers prove the **input path stays cheap** (document owned by CodeMirror, decorations limited to the viewport + 2 KB lookahead). They are not a substitute for Instruments / timeline profiling in the packaged app.

## Architecture checks

- The Markdown string is **not** stored in React state after mount.
- Ordinary CodeMirror transactions do **not** re-render the surrounding React shell (`PerfEditor` render-count test).
- Image widgets, wiki-link marks, and code-fence line marks are computed from `view.visibleRanges` only.

## Automated dispatch timings

Average of 10 insert-at-start transactions after editor create:

| Fixture | Create | Keystroke dispatch | Scroll-into-view |
|---|---:|---:|---:|
| 100 KB | 32 ms | 2.9 ms | 3.0 ms |
| 1 MB | 12 ms | 1.2 ms | 1.9 ms |
| 5 MB | 23 ms | 1.4 ms | 1.8 ms |
| 25 MB | 72 ms | 2.3 ms | 4.4 ms |

Re-checked 2026-08-16 after Live Preview markers, wiki/tag/task decorations, and search/index work. jsdom dispatch remains inside the 16.7 ms frame budget:

| Fixture | Create | Keystroke dispatch | Scroll-into-view |
|---|---:|---:|---|
| 100 KB | 56 ms | 4.9 ms | 7.4 ms |
| 1 MB | 24 ms | 1.9 ms | 2.7 ms |
| 5 MB | 30 ms | 4.4 ms | 3.6 ms |
| 25 MB | 80 ms | 1.6 ms | 3.1 ms |

No architectural blocker was found. 1 MB and 5 MB typing stay well inside a 16.7 ms frame budget on this machine in jsdom. 25 MB remains responsive for dispatch; expensive Live Preview enrichments must stay viewport-scoped.

50 MB fixture is generated at `apps/desktop/tests/fixtures/performance/abusive-50mb.md` for manual profiling. Do not bundle it.

## Manual / WebView checklist

Open `/perf` in `bun run dev` and repeat for 1 / 5 / 25 MB:

1. Time to first painted editor (target: feels immediate on 1 MB).
2. Hold a key: characters appear without stalling.
3. Drag a selection across several screens.
4. Scroll the gutter and the document; watch for sustained dropped frames.
5. Confirm image widgets only appear near the viewport.
6. React Profiler: keystrokes must not light up the app shell.
7. CodeMirror: decoration plugin should recompute on `docChanged` / `viewportChanged` only, never a full-document mark rebuild.

## Observed bottlenecks to watch

- Initial Markdown language parse on first open of huge files (create time grows with size; 25 MB was ~72 ms in jsdom).
- `getClientRects` / caret layer work is missing in jsdom; real WebView layout cost will be higher.
- Remote placeholder images (`placehold.co`) must stay lazy and viewport-limited so a 50 MB fixture cannot start hundreds of network loads.

## Regenerating fixtures

```sh
bun run fixtures:perf
```

Writes gitignored files under `apps/desktop/tests/fixtures/performance/`.
