# Markdown editor

## Purpose

Copper edits vault Markdown with a CodeMirror 6-based editor that supports live preview, wiki links, attachments, autosave, and conflict-aware persistence coordinated with the main process.

## Requirements

### Requirement: Load and save note content

The system SHALL read note bodies through `read_file` and persist edits through `save_file` with optional expected content hash for revision checks.

#### Scenario: Save edited note

- **WHEN** the user edits a note and autosave runs with current contents
- **THEN** the renderer invokes `save_file` and the main process writes the Markdown atomically

### Requirement: Autosave queue

The system SHALL queue document saves so rapid edits coalesce and in-flight writes complete before conflicting operations run in the renderer.

#### Scenario: Rapid typing

- **WHEN** the user types continuously in the editor
- **THEN** the save queue batches writes without losing the latest document text

### Requirement: Live preview

The system SHALL render Markdown decorations for preview mode while preserving editable source in the same editor surface when preview is enabled.

#### Scenario: Toggle preview

- **WHEN** the user enables live preview for the active note
- **THEN** the editor applies live preview extensions without discarding unsaved source text

### Requirement: Wiki links and attachments

The system SHALL support wiki-style links in note content and accept dropped files as attachments imported into the configured attachment folder.

#### Scenario: Drop image into note

- **WHEN** the user drops a supported file onto the editor
- **THEN** the attachment is imported via `import_attachment` and the note receives a link to the stored file
