# Commands and palette

## Purpose

Copper exposes discoverable commands with keyboard shortcuts through a central registry and command palette so shell and workspace actions stay consistent across Notes and Tasks.

## Requirements

### Requirement: Command registry

The system SHALL register command ids, labels, and default shortcuts in a single registry consumed by the shell and workspace hooks.

#### Scenario: Open command palette

- **WHEN** the user opens the command menu from the shell
- **THEN** listed commands come from the shared registry with human-readable labels

### Requirement: Shell command bindings

The system SHALL bind app shell actions such as search, settings, and layout toggles to registry commands through dedicated shell hooks.

#### Scenario: Run shell command

- **WHEN** the user triggers a registered shell shortcut
- **THEN** the corresponding handler runs in the active vault context

### Requirement: Tasks shortcuts

The system SHALL provide Tasks-specific keyboard shortcuts for board and list actions without duplicating conflicting bindings from Notes commands.

#### Scenario: Tasks keyboard action

- **WHEN** the user uses a Tasks shortcut documented in settings hotkeys
- **THEN** the Tasks workspace shortcut map handles the action in Tasks mode

### Requirement: IPC command validation

The system SHALL reject renderer IPC invocations whose command name or arguments fail the shared `validateInvocation` rules before reaching native handlers.

#### Scenario: Invalid payload blocked

- **WHEN** the renderer sends an unknown command or malformed args to `copper:invoke`
- **THEN** validation throws and the main process does not execute the handler
