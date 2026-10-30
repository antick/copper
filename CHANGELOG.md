# Changelog

## Unreleased

- Install pinned, repository-local OpenSpec tooling and workflow skills. Add current-behavior baseline specs, a source inventory and a workflow for planning, implementation and ongoing spec maintenance, with coverage gaps recorded explicitly.

## 0.2.2 — 2026-10-18

- Support Apple Silicon only for macOS releases; remove Intel builds and download guidance.
- Retain Windows x64 and Linux x64/ARM64 installers.

## 0.2.1 — 2026-10-18

Adds bounded, credential-free diagnostics for macOS signature and notarization verification.
The unpublished 0.2.0 tag is retained after its Intel verification failure.

## 0.2.0 — 2026-10-18

- Developer ID signed and Apple-notarized macOS installers, with verified update metadata.
- Separate Copper Dev identity, icon, and app data for everyday development.
- macOS update downloads and explicit restart, with progress and retry handling.
- Protected, repeatable release builds and complete installer checksums.
- Electron and transitive dependency security fixes since 0.1.0.

## 0.1.0 — 2026-09-27

First release from `antick/copper`. Version numbering starts fresh here; this
Electron app replaces the legacy Tauri app and its separate release feed.

### Notes

- Write Markdown with live preview, linked notes, backlinks, search, tags, and properties.
- Keep notes in a local folder, with favorites, tabs, archive/restore, and supported text, code, and image previews.
- Review and push changes from an existing Git vault after granting permission.

### Tasks

- Organize issues into projects, searchable lists, and kanban boards.
- Set statuses, priorities, labels, and due dates, and customize project workflows.
- Use project overviews, persistent task tabs, pinned projects, resizable issue columns, and keyboard-accessible board movement.
- Store projects and issues as Markdown files alongside your notes.

### Desktop and website

- Run on Electron with Copper branding, light and dark palettes, and shared Notes/Tasks navigation.
- Keep files local without an account, with guarded file access and opt-in Git and remote images.
- Add the website at https://copper.potion.sh with Notes and Tasks screenshots.
- Organize the desktop app and Astro landing page in a pnpm/Turborepo workspace.

### Release status

- Include macOS Apple Silicon/Intel DMG and ZIP, Windows x64 EXE, and Linux x64/ARM64 AppImage and DEB installers.
- macOS uses ad-hoc signing; Windows has no publisher certificate. Installation warnings are documented, and updates are manual.
- Saved task views, dependencies, milestones, and note-checkbox ingestion are not included.
- Legacy installations use a different update feed and need a fresh installation from this repository. Back up your vault before migrating.

## Legacy history

The previous repository recorded a Tauri 0.1.0 release on 2026-08-18. Its
version numbers and installers do not belong to this repository’s release series.
The development version 0.2.0 was reset to 0.1.0 for this first release.
