# Vault

## Purpose

Copper treats any user-chosen folder as a Vault: the canonical source of notes, tasks, and attachments. The desktop app opens vaults through the main process, assigns a stable vault id, and routes the renderer to a vault-scoped workspace.

## Requirements

### Requirement: Vault open and identity

The system SHALL assign each opened vault a 64-character lowercase hexadecimal id derived from the canonical filesystem path and SHALL expose that id to the renderer for routing and IPC.

#### Scenario: Open vault by folder path

- **WHEN** the renderer invokes `open_vault` with a folder path the user granted access to
- **THEN** the main process returns vault metadata including the stable vault id and the renderer navigates to the vault route

### Requirement: Recent vaults

The system SHALL persist and return a list of recently opened vaults so the welcome surface can reopen them without re-picking the folder when access is still valid.

#### Scenario: List recent vaults

- **WHEN** the renderer invokes `list_recent_vaults`
- **THEN** the main process returns recent vault entries ordered for display on the welcome screen

### Requirement: Vault tree

The system SHALL return a nested tree of files and folders inside an open vault for the file tree and navigation surfaces.

#### Scenario: Fetch vault tree

- **WHEN** the renderer invokes `vault_tree` with a valid vault id
- **THEN** the main process returns the scanned tree used by the file tree UI

### Requirement: Close vault

The system SHALL allow closing the active vault session so watchers and vault-scoped state can be torn down cleanly.

#### Scenario: Close active vault

- **WHEN** the renderer invokes `close_vault` for the active vault id
- **THEN** the main process stops vault-scoped work tied to that id
