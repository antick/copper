# macOS release

- Product: Copper
- Bundle identifier: `app.copper.desktop`
- Configuration: `apps/desktop/package.json`, `build`
- Architectures: Apple Silicon (arm64) and Intel (x64), each built natively
- Artifacts: DMG and ZIP

Version 0.1.0 follows Loadout’s ad-hoc signing approach (`identity: "-"`, hardened
runtime disabled). It is not Apple-notarized. CI verifies the signature and DMG;
installation warnings and manual updates are documented in [INSTALL.md](../INSTALL.md).

`pnpm package` makes local artifacts under `apps/desktop/release/` and never
publishes. See the [release workflow](github.md) for publishing a complete draft.
Developer ID signing, notarization, and a verified signed update remain future
work, not prerequisites for the explicitly approved ad-hoc release.
