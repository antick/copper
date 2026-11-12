# Git integration

## Purpose

When a vault is a Git repository, Copper surfaces status and diffs and can publish commits from the desktop app after the user enables Git for that vault.

## Requirements

### Requirement: Enable Git per vault

The system SHALL let the user enable Git integration for a vault with `git_enable` before showing publish workflows.

#### Scenario: Turn on Git

- **WHEN** the user enables Git for an open vault
- **THEN** subsequent Git status queries use the enabled vault repository

### Requirement: Git status

The system SHALL report repository status for the vault with `git_status` for display in shell Git controls.

#### Scenario: View status badge

- **WHEN** Git is enabled and the working tree changes
- **THEN** the Git status control reflects output from `git_status`

### Requirement: Diff review

The system SHALL load per-file diffs with `git_diff` for review in the Git diff view before publishing.

#### Scenario: Inspect changed note

- **WHEN** the user opens the diff view for a changed Markdown file
- **THEN** the UI renders diff content from `git_diff` for that path

### Requirement: Publish

The system SHALL create a commit and push with `git_publish`, accepting an optional commit message supplied by the user.

#### Scenario: Publish vault changes

- **WHEN** the user confirms publish with a message
- **THEN** the main process runs `git_publish` and updates the remote configured for the vault repo
