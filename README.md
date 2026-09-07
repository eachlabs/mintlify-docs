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

## Responses contract maintenance

The API team owns the wire contract in `be-monorepo/api-service/apidocs/api.yaml`.
`openapi_specs/models.json` mirrors `/v1/responses` and its referenced components;
do not change those schemas independently of the service source. The initial
Responses mirror was checked against the source included in merged PR #3174
(`fb9c1d3c15f99e72da0b8f18e9561a11f43950a4`). Other API routes are unchanged.

Docs owns `llm-router/responses.mdx` and `llm-router/responses-capabilities.mdx`.
Update them whenever any of these source contracts changes:

- `api-service/internal/infrastructure/http/openai/create_response.go`: public request allowlist and edge validation.
- `api-service/internal/infrastructure/http/router.go`: route enablement.
- `api-service/internal/application/usecases/create_prediction.go`: sanitized public dispatch errors.
- `llm-router-service/internal/domain/entities/responses_qualification.go`: public IDs and model profiles.
- `llm-router-service/internal/application/usecases/responses_capability_validation.go`: model-specific restrictions.
- `llm-router-service/internal/application/usecases/responses_tools_validation.go` and `responses_validation.go`: strict tools and input shape.
- `llm-router-service/internal/kit/responsesse/`: event and terminal usage contracts.

The public matrix is the intersection of the edge allowlist and model profile,
not native model capability. In particular, router-level `stop`/`seed` support
does not imply public endpoint support. The OpenAPI reasoning enum describes the
general wire type; the matrix documents the narrower qualified model values.
The generated general model listing is not a Responses allowlist.

Before publishing a change:

1. Compare the route and every transitive component reference against the service
   OpenAPI source. Preserve unrelated routes and shared component compatibility.
2. Compare every model-matrix row and example against the public edge and router
   validators above, including negative combinations and exact public pins.
3. Run `npm run validate` and `npm run broken-links`. From a current backend
   checkout run `python3 api-service/scripts/check_public_docs_contracts.py
   --mintlify-docs-dir /absolute/path/to/mintlify-docs` for the route/docs audit.
4. Confirm the dedicated Responses CI E2E result and SDK smoke evidence for the
   enabled dev deployment before publishing availability claims. Never run the
   backend E2E package locally or infer runtime qualification from docs validation.

Do not merge this preview documentation until the approved dev qualification
gate has passed. Production activation and general availability require separate
approval. Add a changelog announcement when customer availability is actually
released, not when dark code or draft documentation is prepared.
