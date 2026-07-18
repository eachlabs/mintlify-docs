# AGENTS.md

Agent and contributor guidance for **mintlify-docs** — the public eachlabs documentation site (Mintlify). The workspace-root `AGENTS.md` (`../AGENTS.md`) governs cross-repo defaults; this file specializes it for this repo.

## What this is

Product and API docs as `.mdx` pages; navigation and site config in `docs.json`; OpenAPI specs under `openapi_specs/`; `changelog.mdx` is the public changelog. Content sections: `api/`, `llm-router/`, `models/`, `sdks/`, `sense/`, `storage/`, `video/`, plus `mcp.mdx`, `authentication.mdx`, `errors.mdx`, `introduction.mdx`.

## Commands

- `npm ci` — install (Mintlify CLI pinned in `devDependencies`)
- `npm run validate` — `mintlify validate`
- `npm run broken-links` — `mintlify broken-links`
- `npx mintlify dev` — local preview

## CI (`.github/workflows/docs.yml`)

- **Mintlify validation** job gates PRs and main on `validate` + `broken-links` — run both locally before pushing.
- **video-api-mirror** job verifies `openapi_specs/video_api.json` against be-monorepo's `check-docs-mirror.sh`: that spec is a mirror of the be-monorepo source. Update it via the source repo's sync path, not by hand-editing here (the job skips with a warning when the read-token secret is absent).

## Notes

- Docs changes are customer-facing on merge. Shipped customer-facing features should be reflected in `changelog.mdx` — that freshness is checked externally (cycle-cat diffs the changelog against merged work and opens draft-entry PRs here).
