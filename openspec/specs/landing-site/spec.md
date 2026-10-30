# Landing site

## Purpose

The Astro landing app at copper.potion.sh describes Copper Notes and Tasks and provides download and marketing content separate from the desktop Electron application.

## Requirements

### Requirement: Production build

The system SHALL build the landing app with the Astro toolchain in the `@copper/landing` workspace package as part of the monorepo turbo pipeline.

#### Scenario: CI landing build

- **WHEN** CI runs the production build for the landing package
- **THEN** static output is generated without requiring the Electron runtime

### Requirement: Hero and product sections

The system SHALL render landing sections that present Notes, Tasks, and download calls to action using shared site metadata helpers.

#### Scenario: Home page content

- **WHEN** a visitor loads the landing index page
- **THEN** the page includes hero and Tasks sections composed from Astro components

### Requirement: Sitemap

The system SHALL emit a sitemap route for crawlers listing public landing URLs.

#### Scenario: Sitemap generation

- **WHEN** the landing site build completes
- **THEN** the sitemap endpoint file is present in the build output

### Requirement: Site tests

The system SHALL include automated tests that validate production landing output expectations in the landing package test script.

#### Scenario: Landing test job

- **WHEN** the landing tests run in CI via the monorepo test pipeline
- **THEN** site output checks in `apps/landing/tests` pass
