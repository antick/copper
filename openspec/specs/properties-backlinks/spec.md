# Properties and backlinks

## Purpose

Notes expose structured frontmatter properties and inbound links so users can filter, organize, and navigate related Markdown without leaving the vault workspace.

## Requirements

### Requirement: Read properties

The system SHALL parse YAML frontmatter for a note path and return property values through `read_properties`.

#### Scenario: Open properties pane

- **WHEN** the user selects a note with frontmatter
- **THEN** the properties panel shows fields loaded via `read_properties`

### Requirement: Update properties

The system SHALL merge property updates through `update_properties` while preserving note body content outside frontmatter.

#### Scenario: Edit property field

- **WHEN** the user changes a property value in the panel
- **THEN** the renderer invokes `update_properties` and the note file frontmatter reflects the new value

### Requirement: Backlinks

The system SHALL list notes linking to the active path through `list_backlinks` for display in the backlinks section.

#### Scenario: View backlinks

- **WHEN** the user opens a note that other notes link to
- **THEN** the backlinks section lists incoming links from `list_backlinks`

### Requirement: Link extraction

The main process SHALL extract wiki and Markdown links from note content when indexing so backlink queries stay consistent with file contents.

#### Scenario: New wiki link saved

- **WHEN** the user saves a note containing a new wiki link to another note
- **THEN** a subsequent `list_backlinks` call on the target path includes the referencing note
