# Notes workspace

## Purpose

The Notes workspace is the default vault mode for browsing folders, opening note tabs, editing Markdown, and viewing properties and backlinks in a shared shell layout with resizable panes.

## Requirements

### Requirement: Notes mode in app shell

The system SHALL host Notes inside the vault app shell with left file tree, optional note list, central editor, and optional properties pane driven by per-vault session state.

#### Scenario: Enter notes workspace

- **WHEN** the user opens a vault and the session workspace mode is Notes
- **THEN** the shell renders the notes layout with tabs, sidebars, and editor pane

### Requirement: Tab session

The system SHALL persist open note tabs, the active tab path, sidebar collapse flags, and favorites per vault in session storage separate from note file content.

#### Scenario: Restore tabs on return

- **WHEN** the renderer loads session for a vault id via `load_session`
- **THEN** the tab strip and pane collapse state match the saved session object

### Requirement: File tree mutations

The system SHALL create, rename, move, archive, restore, and trash note paths through validated IPC so tree changes stay consistent with on-disk Markdown files.

#### Scenario: Rename note from tree

- **WHEN** the user renames a note in the file tree and the renderer invokes `rename_path`
- **THEN** the main process updates the file on disk and the tree reflects the new path

### Requirement: Welcome entry

The system SHALL route the application root to a welcome surface where the user picks or reopens a vault before entering a vault route.

#### Scenario: Initial navigation

- **WHEN** the user loads the app without an active vault route
- **THEN** the router sends them to the welcome route that offers vault selection
