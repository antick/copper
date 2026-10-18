# Update authentication

Copper's signed macOS releases read public update metadata and artifacts from
[GitHub Releases](https://github.com/antick/copper/releases). Users do not need a GitHub account
or token. Version 0.1.0 and legacy Tauri clients need one manual installation of the signed app.

Release CI uses GitHub's automatic token with write access only in the protected draft job.
Maintainers publish the verified draft with their own authenticated `gh` session so the release
publication event triggers the website deployment. No upload credential ships in the app.

See [the release process](github.md).
