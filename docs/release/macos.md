# macOS release

Copper uses Developer ID distribution outside the Mac App Store. Each architecture has a DMG for
installation and a ZIP for updates. Production identity remains `app.copper.desktop`.

The signed build helper requires a matching version tag, a Developer ID signing identity and
Apple notarization credentials. CI imports the certificate into a temporary keychain; local builds
can use an existing `CSC_NAME`/`CSC_KEYCHAIN` identity and either an Apple API key or a saved
notarization keychain profile. The helper enables hardened runtime, notarization, mandatory code
signing, and the compile-time update flag. Ordinary development does not enable that flag.

Verification covers the bundle identifier and Apple Team ID, signature validity, hardened runtime,
Gatekeeper assessment, stapled notarization ticket, disk-image integrity, packaged version/native
SQLite, and update artifact hashes. An actual installation and update test is still required.

See [the release process](github.md) for the protected CI workflow and credentials, and
[installation instructions](../INSTALL.md) for upgrading from 0.1.0.

Copper Dev uses `app.copper.desktop.dev` and its own app data. Keep the normal macOS home and
Keychain during acceptance tests; isolate only Copper's app data with `COPPER_USER_DATA_DIR`.
Never test against your everyday Vault.
