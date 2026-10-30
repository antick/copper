# Application shell

## Purpose

The shared application shell frames Notes and Tasks with a 42px workspace top bar, activity rail, status bar, window navigation, and module-specific content regions that reuse the same chrome geometry.

## Requirements

### Requirement: Workspace top bar

The system SHALL render a shared workspace top bar with tab strip, navigation controls, and module actions while preserving the 42px height and drag region behavior across Notes and Tasks.

#### Scenario: Switch module

- **WHEN** the user toggles between Notes and Tasks on the activity rail
- **THEN** the top bar remains the shared component with module-appropriate trailing actions

### Requirement: Activity rail

The system SHALL expose Notes and Tasks entry points from the activity rail without showing Notes-only controls such as the note-list toggle in Tasks mode.

#### Scenario: Tasks mode chrome

- **WHEN** workspace mode is Tasks
- **THEN** the shell does not surface Notes-only note-list toggle controls in shared chrome

### Requirement: Hash routing in packaged app

The system SHALL use hash-based router history when the renderer loads from a `file://` origin so in-app routes work inside Electron.

#### Scenario: Electron navigation

- **WHEN** the desktop app loads the renderer from the packaged file URL
- **THEN** TanStack Router uses hash history for in-app paths

### Requirement: Status bar

The system SHALL show vault and document status information in a bottom status bar tied to the active workspace context.

#### Scenario: Active note context

- **WHEN** the user edits a note in Notes
- **THEN** the status bar reflects contextual information for the active document
