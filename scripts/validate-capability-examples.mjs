#!/usr/bin/env node
// Validates every fenced JSON prediction example in video/capabilities.mdx
// against the committed OpenAPI mirror (openapi_specs/video_api.json), so a
// schema change that invalidates a documented example fails CI instead of
// shipping silently. Runs offline against the committed spec — independent of
// the video-api-mirror job (which skips without BE_MONOREPO_READ_TOKEN).
//
// An example is a prediction input when it parses as
// {model: "eachlabs-video-api", input: {capability: "<name>", ...}}; its input
// envelope (capability const, tier enum, params contract) is validated against
// the spec's CapabilityInput_<name>. Response shapes, webhook payloads, and
// run_ffmpeg-mode examples are skipped and counted.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const MDX_PATH = "video/capabilities.mdx";
const SPEC_PATH = "openapi_specs/video_api.json";

// --- Minimal JSON Schema (draft 2020-12 subset) validator -------------------
// Supports exactly the keywords the vendored spec uses. Any OTHER structural
// keyword is a hard error: if the spec starts using e.g. oneOf inside params,
// this check must be extended, never silently pass.

const ANNOTATION_KEYWORDS = new Set([
  "$schema", "$comment", "title", "description", "default", "format",
  "examples", "deprecated",
]);
const SUPPORTED_KEYWORDS = new Set([
  ...ANNOTATION_KEYWORDS,
  "type", "properties", "required", "additionalProperties",
  "enum", "const",
  "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
  "minLength", "maxLength", "pattern",
  "minItems", "maxItems", "items",
  "if", "then", "else",
]);

function jsonType(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

function typeMatches(v, t) {
  const actual = jsonType(v);
  if (t === "number") return actual === "number" || actual === "integer";
  return actual === t;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Returns a list of "<path>: <message>" violation strings; empty means valid.
function validate(value, schema, path, schemaPath) {
  if (schema === true) return [];
  if (schema === false) return [`${path}: not permitted by schema`];
  const errs = [];

  for (const kw of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(kw)) {
      throw new Error(
        `unsupported JSON Schema keyword "${kw}" at ${schemaPath} — extend scripts/validate-capability-examples.mjs before relying on this check`,
      );
    }
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => typeMatches(value, t))) {
      errs.push(`${path}: expected type ${types.join("|")}, got ${jsonType(value)}`);
      return errs; // wrong type: deeper checks would only cascade noise
    }
  }
  if (schema.const !== undefined && !deepEqual(value, schema.const)) {
    errs.push(`${path}: must equal ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
  }
  if (schema.enum !== undefined && !schema.enum.some((e) => deepEqual(value, e))) {
    errs.push(`${path}: ${JSON.stringify(value)} not in enum [${schema.enum.map((e) => JSON.stringify(e)).join(", ")}]`);
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errs.push(`${path}: ${value} < minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errs.push(`${path}: ${value} > maximum ${schema.maximum}`);
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) errs.push(`${path}: ${value} <= exclusiveMinimum ${schema.exclusiveMinimum}`);
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) errs.push(`${path}: ${value} >= exclusiveMaximum ${schema.exclusiveMaximum}`);
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errs.push(`${path}: length ${value.length} < minLength ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errs.push(`${path}: length ${value.length} > maxLength ${schema.maxLength}`);
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) errs.push(`${path}: ${JSON.stringify(value)} does not match pattern ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errs.push(`${path}: ${value.length} items < minItems ${schema.minItems}`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errs.push(`${path}: ${value.length} items > maxItems ${schema.maxItems}`);
    if (schema.items !== undefined) {
      value.forEach((item, i) => errs.push(...validate(item, schema.items, `${path}[${i}]`, `${schemaPath}/items`)));
    }
  }
  if (jsonType(value) === "object") {
    const props = schema.properties ?? {};
    for (const req of schema.required ?? []) {
      if (!(req in value)) errs.push(`${path}: missing required property "${req}"`);
    }
    for (const [k, v] of Object.entries(value)) {
      if (k in props) {
        errs.push(...validate(v, props[k], `${path}.${k}`, `${schemaPath}/properties/${k}`));
      } else if (schema.additionalProperties === false) {
        errs.push(`${path}: unknown property "${k}" (additionalProperties: false)`);
      } else if (schema.additionalProperties !== undefined && schema.additionalProperties !== true) {
        errs.push(...validate(v, schema.additionalProperties, `${path}.${k}`, `${schemaPath}/additionalProperties`));
      }
    }
  }
  if (schema.if !== undefined) {
    const cond = validate(value, schema.if, path, `${schemaPath}/if`);
    if (cond.length === 0) {
      if (schema.then !== undefined) errs.push(...validate(value, schema.then, `${path} (when ${JSON.stringify(schema.if)})`, `${schemaPath}/then`));
    } else if (schema.else !== undefined) {
      errs.push(...validate(value, schema.else, path, `${schemaPath}/else`));
    }
  }
  return errs;
}

// --- Extract fenced ```json blocks with their 1-based start lines -----------

function extractJsonFences(text) {
  const lines = text.split("\n");
  const fences = [];
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (open === null && /^```json\b/.test(trimmed)) {
      open = { line: i + 1, body: [] };
    } else if (open !== null && trimmed === "```") {
      fences.push({ line: open.line, body: open.body.join("\n") });
      open = null;
    } else if (open !== null) {
      open.body.push(lines[i]);
    }
  }
  if (open !== null) throw new Error(`${MDX_PATH}:${open.line}: unclosed \`\`\`json fence`);
  return fences;
}

// --- Main -------------------------------------------------------------------

const spec = JSON.parse(readFileSync(join(repoRoot, SPEC_PATH), "utf8"));
const mapping = spec.components?.schemas?.CapabilityInput?.discriminator?.mapping;
if (!mapping || Object.keys(mapping).length === 0) {
  console.error(`FATAL: ${SPEC_PATH} has no CapabilityInput discriminator mapping — spec shape changed, fix this script`);
  process.exit(1);
}
const capabilitySchema = (name) => {
  const ref = mapping[name];
  if (!ref) return null;
  const key = ref.replace("#/components/schemas/", "");
  return spec.components.schemas[key] ?? null;
};

const mdx = readFileSync(join(repoRoot, MDX_PATH), "utf8");
const fences = extractJsonFences(mdx);

let checked = 0;
let skipped = 0;
const failures = [];

for (const fence of fences) {
  const where = `${MDX_PATH}:${fence.line}`;
  let parsed;
  try {
    parsed = JSON.parse(fence.body);
  } catch (e) {
    failures.push(`${where}: fenced json does not parse: ${e.message}`);
    continue;
  }
  const input = parsed?.input;
  const isPrediction = parsed?.model === "eachlabs-video-api" && input && typeof input === "object";
  if (!isPrediction || typeof input.capability !== "string") {
    skipped++; // response shape, webhook payload, or run_ffmpeg-mode example
    continue;
  }
  checked++;
  const schema = capabilitySchema(input.capability);
  if (!schema) {
    failures.push(`${where}: capability "${input.capability}" not in the spec's discriminator mapping`);
    continue;
  }
  const errs = validate(input, schema, "input", `CapabilityInput_${input.capability}`);
  for (const err of errs) failures.push(`${where}: capability "${input.capability}": ${err}`);
}

console.log(`capability examples checked: ${checked}, other json blocks skipped: ${skipped}, fences total: ${fences.length}`);
if (checked === 0) {
  console.error(`FATAL: found no capability prediction examples in ${MDX_PATH} — extraction is broken, refusing to pass vacuously`);
  process.exit(1);
}
if (failures.length > 0) {
  console.error(`\n${failures.length} violation(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("all documented capability examples conform to openapi_specs/video_api.json");
