# Install Copper

Download the latest stable version from [Copper releases](https://github.com/antick/copper/releases/latest).

| Computer | Download |
| --- | --- |
| Mac with Apple Silicon (M-series chip) | `Copper-<version>-mac-arm64.dmg` |
| Windows x64 | `Copper-Setup-<version>-x64.exe` |
| Linux x64 | `Copper-<version>-x86_64.AppImage` or `copper_<version>_amd64.deb` |
| Linux ARM64 | `Copper-<version>-arm64.AppImage` or `copper_<version>_arm64.deb` |

GitHub's source archives are for developers, not installers.

Mac releases support Apple Silicon only; Intel Macs are not supported by current releases.

## macOS

Starting with 0.2.2, public macOS releases are signed with Developer ID and notarized by Apple.
Open the DMG, drag Copper to Applications, eject the disk image, and launch Copper from Applications.
Keep it in your Dock if you use it regularly. The ZIP downloads are also used by the updater.
Do not run your everyday app directly from the mounted DMG.

If you have 0.1.0 or the older Tauri app, install the new version manually once; those apps cannot
bootstrap this update flow. Back up your Vault first. Replacing the application does not remove
its settings or your Vault files. If macOS reports a damaged or unverified new signed release,
download it again from the official release and report the problem; do not disable Gatekeeper.

Signed macOS builds check for updates while open. You can also check in About. Download an update,
then choose Restart and update when ready. Declining restart leaves it ready for later. Save your
work before restarting. No GitHub login or token is required.

## Windows

Run the installer. Windows builds are currently unsigned and may show SmartScreen. Review the
source and publisher warning before deciding to run the installer. Installation is per user.
Download newer installers manually from the release page.

## Linux

Make the AppImage executable (`chmod +x Copper-*.AppImage`) and run it. On Ubuntu 24.04, AppImage
may require `libfuse2t64`; older systems may use `libfuse2`. Alternatively, install the matching
Debian package with `sudo apt install ./copper_<version>_amd64.deb` (use `arm64` for ARM64).
Download newer packages manually from the release page.

## Checksums

The release includes `SHA256SUMS`. On macOS use `shasum -a 256 <file>`; on Linux use
`sha256sum <file>`; on Windows use `Get-FileHash <file> -Algorithm SHA256`. Compare with the
published checksum. Checksums detect changed downloads; they are not publisher certificates.

## Develop alongside the installed app

Run `pnpm dev` from the repository for Copper Dev. It has a different name, icon, bundle identity,
and app-data folder. The installed app uses `~/Library/Application Support/app.copper.desktop`;
Dev uses `~/Library/Application Support/app.copper.desktop.dev` on macOS. Dev never installs public
updates. `COPPER_USER_DATA_DIR` can select an explicit test profile.

Use a separate test Vault or a copy of your everyday Vault. App-data isolation does not make two
apps safe to edit the same folder concurrently, and development changes may alter file formats.
