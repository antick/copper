# Search and index

## Purpose

Copper maintains a derived SQLite full-text index outside the vault for fast note search while note content remains Markdown files inside the folder the user chose.

## Requirements

### Requirement: Vault search

The system SHALL answer note search queries with `search_vault`, optionally scoped to a folder, using the derived index rather than scanning the whole vault on each keystroke.

#### Scenario: Global search dialog

- **WHEN** the user submits a query in the vault search dialog
- **THEN** the renderer invokes `search_vault` and displays ranked matches from the index

### Requirement: Note listing

The system SHALL list notes for a folder with `list_notes` to populate note list panes from indexed metadata.

#### Scenario: Note list pane

- **WHEN** the user selects a folder in Notes
- **THEN** the note list loads entries via `list_notes` for that folder path

### Requirement: Index maintenance

The system SHALL rebuild or update the index with `rebuild_vault_index`, `index_open_vault`, `index_file_path`, and `remove_indexed_file` when vault content changes.

#### Scenario: Rebuild after large import

- **WHEN** the user triggers a full reindex for the vault
- **THEN** the main process runs `rebuild_vault_index` and subsequent searches use the refreshed index

### Requirement: Index location

The system SHALL store the SQLite index in application data keyed by vault id, not inside the vault directory tree.

#### Scenario: Vault folder stays portable

- **WHEN** the user copies only their vault folder to another machine
- **THEN** note files remain intact and the index is recreated in local app data on that machine
