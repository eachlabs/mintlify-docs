# mintlify-docs

Public eachlabs documentation site (Mintlify). See `AGENTS.md` for structure, commands, and CI.

## Regenerating llm-router/models.mdx

The model listing in `llm-router/models.mdx` is generated — do not hand-edit it. Regenerate from the canonical router catalog (be-monorepo checkout):

```bash
node scripts/generate-llm-router-models.mjs --catalog ../be-monorepo/llm-router-service/__config/model-catalog.json
```

Without a be-monorepo checkout, use the public GraphQL catalog instead:

```bash
node scripts/generate-llm-router-models.mjs --remote
```

Pricing and context length come from the public OpenRouter catalog (`https://openrouter.ai/api/v1/models`), joined by each model's canonical target model. Models absent from that list fall back to `scripts/llm-router-models-overrides.json`; entries with `null` values render as `—`.
