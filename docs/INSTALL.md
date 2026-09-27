# Install Copper

Download from [Copper releases](https://github.com/antick/copper/releases/latest).
Version 0.1.0 is an early desktop release. macOS builds have an ad-hoc signature,
but are not Apple-notarized; Windows installers have no publisher certificate.
The operating system may warn on first launch. Only open a download you trust.

| Computer | Download |
| --- | --- |
| Mac with Apple Silicon (M-series chip) | `Copper-0.1.0-mac-arm64.dmg` |
| Mac with Intel processor | `Copper-0.1.0-mac-x64.dmg` |
| Windows x64 | `Copper-Setup-0.1.0-x64.exe` |
| Linux x64 | `Copper-0.1.0-x86_64.AppImage` or `copper_0.1.0_amd64.deb` |
| Linux ARM64 | `Copper-0.1.0-arm64.AppImage` or `copper_0.1.0_arm64.deb` |

macOS ZIP files are also available. GitHub supplies source archives separately.

## macOS

Open the DMG, drag Copper to Applications, and launch it there. If macOS blocks
it because the developer cannot be verified, use System Settings → Privacy &
Security → Open Anyway after reviewing the warning. See
[Apple’s instructions](https://support.apple.com/en-gb/102445).
Do not disable Gatekeeper globally.

## Windows

Run the installer. If SmartScreen warns, review the publisher warning; if you
trust the download, choose More info → Run anyway. Installation is per user.

## Linux

Make the AppImage executable (`chmod +x Copper-*.AppImage`) and run it.
On Ubuntu 24.04, AppImage may require `libfuse2t64`; older systems may use
`libfuse2`. Alternatively, install the matching Debian package with
`sudo apt install ./copper_0.1.0_amd64.deb` (use `arm64` for ARM64).

## Checksums and updates

The release includes `SHA256SUMS` for all nine installers. On macOS use
`shasum -a 256 <file>`; on Linux use `sha256sum <file>`; on Windows use
`Get-FileHash <file> -Algorithm SHA256`. Compare the result with `SHA256SUMS`.
Checksums detect changed downloads; they are not publisher certificates.

Updates in 0.1.0 are manual: download a newer installer from the releases page.
The app’s About screen links there. Automatic installation is disabled until
its signing and end-to-end update flow are verified.

Back up your Vault before upgrading. Legacy Tauri installations use a different
release feed and require a fresh installation; this repository starts at 0.1.0.
