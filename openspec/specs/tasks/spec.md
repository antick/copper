# Tasks

## Purpose

Tasks provides issue and project tracking stored as Markdown under the vault, with list and board views, workflow statuses, and identifiers allocated by the main process from a configurable prefix.

## Requirements

### Requirement: Issue listing

The system SHALL list issues for a vault through `list_issues` and load a single issue through `get_issue` for detail and board surfaces.

#### Scenario: All issues view

- **WHEN** the user opens the All issues destination in Tasks
- **THEN** the renderer loads issues via `list_issues` and renders them in the issue table

### Requirement: Issue create and update

The system SHALL create issues with `create_issue` and update fields with `update_issue`, persisting title, status, priority, project, labels, due date, rank, and body in vault Markdown.

#### Scenario: Create issue

- **WHEN** the user creates an issue with a title in Tasks
- **THEN** the main process allocates storage and returns the new issue id

### Requirement: Board movement

The system SHALL move issues between workflow columns with `move_issue`, accepting optional ordering hints relative to sibling issues.

#### Scenario: Drag card on board

- **WHEN** the user moves an issue card to another status column
- **THEN** the renderer invokes `move_issue` with the target status and the board reflects the new column

### Requirement: Projects and workflow

The system SHALL manage projects with `list_projects`, `get_project`, and `update_project_workflow` so each project can define ordered workflow statuses used by the board.

#### Scenario: Custom workflow

- **WHEN** the user edits a project workflow in Tasks
- **THEN** the main process persists workflow statuses and the board columns follow that workflow

### Requirement: Issue id prefix

The system SHALL validate and normalize the issue id prefix from settings in the main process before allocating new issue filenames or ids.

#### Scenario: Prefix change for new issues

- **WHEN** the user changes `issueIdPrefix` in settings and creates a new issue
- **THEN** the main process applies the normalized prefix to the new issue without rewriting existing issue ids
