# Users do not create a GitHub token

Verified installers and automatic updates will use this public repository's [releases](https://github.com/antick/copper/releases). Electron's updater reads `latest-mac.yml` without a login. No approved installer has been published here yet.

- **Users:** once a verified release is available, download the `.dmg`; no GitHub token is needed. See [github.md](github.md).
- **Maintainers:** release CI uses the automatic `GITHUB_TOKEN`, with write access limited to the protected publishing job. No personal upload token is required or shipped in the app.
