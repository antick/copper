# Desktop platform

## Purpose

The Electron main process owns vault I/O, indexing, Git, updates, and security boundaries while the preload bridge exposes a narrow validated invoke channel and filesystem events to the renderer.

## Requirements

### Requirement: Invoke bridge

The system SHALL expose renderer access to native commands only through `copper:invoke` with arguments validated by `validateInvocation` in the shared command contract.

#### Scenario: Successful invoke

- **WHEN** the renderer calls a registered command with valid serializable args
- **THEN** the main handler dispatches to the native module and returns structured data

### Requirement: Filesystem watcher

The system SHALL emit normalized vault filesystem events to the renderer when files change on disk so open views can refresh without manual reload.

#### Scenario: External file edit

- **WHEN** a note file changes outside the editor
- **THEN** the watcher pipeline notifies the renderer subscription for that vault path

### Requirement: External links

The system SHALL open http and https links in the system browser through a dedicated IPC path rather than navigating the Electron window.

#### Scenario: Click external URL

- **WHEN** the user activates an external link in the app
- **THEN** the main process opens the URL externally per security rules

### Requirement: Auto-update commands

The system SHALL expose `check_for_update`, `download_update`, and `install_update` commands for the desktop update provider shown in the renderer.

#### Scenario: Check for updates

- **WHEN** the update provider requests a check
- **THEN** the main process handles `check_for_update` and returns availability metadata

### Requirement: Separate dev identity

The system SHALL use distinct application identity and user data paths for Copper Dev versus packaged Copper so development builds do not overwrite production app data.

#### Scenario: Dev app data isolation

- **WHEN** the user runs the Copper Dev build
- **THEN** settings and indexes are stored under the Dev-specific app data location
