# Pi skill shortlist for Copper

Research date: 2026-08-16. Install counts come from `npx skills find`; GitHub stars come from the source repositories via `gh api`. Counts change over time. No skill was installed during this review.

## Recommended

| Priority | Skill | Why it fits Copper | Popularity evidence | Install command |
| --- | --- | --- | --- | --- |
| 1 | [`anthropics/skills@frontend-design`](https://skills.sh/anthropics/skills/frontend-design) | Strong UI composition and visual-polish guidance for future shell and Settings work. | 782.7K installs; `anthropics/skills` 169,696 GitHub stars. | `npx skills add anthropics/skills@frontend-design -g -y` |
| 2 | [`vercel-labs/agent-skills@vercel-react-best-practices`](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) | React rendering, data-flow, and performance review for Copper’s React 19 frontend. | 636K installs; `vercel-labs/agent-skills` 30,091 GitHub stars. | `npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y` |
| 3 | [`addyosmani/web-quality-skills@accessibility`](https://skills.sh/addyosmani/web-quality-skills/accessibility) | Accessibility review for keyboard navigation, pane semantics, contrast, forms, and editor chrome. | 44.8K installs; `addyosmani/web-quality-skills` 2,628 GitHub stars. | `npx skills add addyosmani/web-quality-skills@accessibility -g -y` |
| 4 | [`mattpocock/skills@code-review`](https://skills.sh/mattpocock/skills/code-review) | Structured TypeScript/React review before commits. | 341.9K installs; `mattpocock/skills` 219,038 GitHub stars. | `npx skills add mattpocock/skills@code-review -g -y` |
| 5 | [`github/awesome-copilot@documentation-writer`](https://skills.sh/github/awesome-copilot/documentation-writer) | Keeps README, architectural notes, and user-facing docs coherent with code changes. | 24.9K installs; `github/awesome-copilot` 37,902 GitHub stars. | `npx skills add github/awesome-copilot@documentation-writer -g -y` |

## Already available and worth keeping

- `agent-browser`: already installed in Pi and used for Copper’s desktop/narrow browser dogfood, screenshots, console checks, viewport overflow checks, and axe accessibility audits. Do not install a duplicate frontend-testing skill unless a concrete gap appears.
- Orca orchestration: already available and used to coordinate Luna Max workers; keep it for bounded read-only reviews and non-overlapping implementation tasks.

## Suggested approval order

Start with **frontend-design**, **vercel-react-best-practices**, and **accessibility**. They directly address Copper’s highest-frequency work and come from reputable, highly adopted sources. Add **code-review** and **documentation-writer** only if their workflows do not duplicate the project’s existing review instructions.
