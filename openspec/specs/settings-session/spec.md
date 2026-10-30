# Settings and session

## Purpose

Global settings and per-vault session state control appearance, editor typography, attachment folders, issue id prefix, and Tasks UI layout without storing that UI state inside Markdown files.

## Requirements

### Requirement: Load and save settings

The system SHALL load user settings with `load_settings` and persist changes with `save_settings` using the validated settings shape enforced by the IPC contract.

#### Scenario: Change theme

- **WHEN** the user selects a palette in appearance settings
- **THEN** the renderer saves settings and the UI theme updates from stored theme ids

### Requirement: Per-vault session persistence

The system SHALL save Tasks and Notes UI state per vault with `save_session`, including tabs, collapse flags, Tasks destinations, pinned projects, and issue list column widths.

#### Scenario: Persist task tabs

- **WHEN** the user opens or closes task tabs in a vault
- **THEN** the next `load_session` for that vault restores the same task tab set

### Requirement: Settings routes

The system SHALL expose in-app settings sections for appearance, editor, files, and search under dedicated settings routes reachable from the shell.

#### Scenario: Open editor settings

- **WHEN** the user navigates to editor settings
- **THEN** the settings overlay or route shows typography controls backed by global settings

### Requirement: Attachment folder setting

The system SHALL honor the configured attachment folder name when importing attachments into the vault.

#### Scenario: Import uses configured folder

- **WHEN** the user imports an attachment with a custom attachment folder in settings
- **THEN** `import_attachment` stores files under that folder within the vault
