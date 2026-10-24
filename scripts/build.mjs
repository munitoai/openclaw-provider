// Write the model rows of openclaw.plugin.json from models.json, with no dependencies.
// With --check, it writes nothing and fails when openclaw.plugin.json is not current.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const modelsPath = join(root, "models.json");
const manifestPath = join(root, "openclaw.plugin.json");
const INPUTS = new Set(["text", "image"]);

function fail(message) {
  console.error(`build: ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`cannot read ${path}: ${error.message}`);
  }
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    fail(`${label} must be a positive integer`);
  }
  return value;
}

function price(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    fail(`${label} must be a number of USD per million tokens`);
  }
  return value;
}

// One model row for one provider. The cache write costs the same as the input, and "none"
// comes first in the effort list so that /think off can send it. The explicit "openai" format
// keeps reasoning_effort and stops the DeepSeek "thinking" field that OpenClaw adds by model ID.
function buildRow(model, providerId) {
  const label = `${providerId}/${model.id}`;
  const cost = model.price[providerId];
  if (typeof model.id !== "string" || !model.id || typeof model.name !== "string" || !model.name) {
    fail(`${label} needs an id and a name`);
  }
  if (!Array.isArray(model.input) || !model.input.length || !model.input.every((i) => INPUTS.has(i))) {
    fail(`${label}: input must be a list of "text" and "image"`);
  }
  if (!Array.isArray(model.efforts) || !model.efforts.every((e) => typeof e === "string" && e)) {
    fail(`${label}: efforts must be a list of strings`);
  }
  return {
    id: model.id,
    name: model.name,
    reasoning: true,
    input: [...model.input],
    contextWindow: positiveInteger(model.context, `${label} context`),
    maxTokens: positiveInteger(model.maxOutput, `${label} maxOutput`),
    cost: {
      input: price(cost.input, `${label} price.input`),
      output: price(cost.output, `${label} price.output`),
      cacheRead: price(cost.cachedInput, `${label} price.cachedInput`),
      cacheWrite: cost.input,
    },
    compat: {
      supportedReasoningEfforts: ["none", ...model.efforts.filter((effort) => effort !== "none")],
      supportsPromptCacheKey: true,
      thinkingFormat: "openai",
    },
  };
}

// JSON with two-space indents. A list of plain values stays on one line.
function format(value) {
  const text = JSON.stringify(value, null, 2).replace(
    /\[\s+([^[\]{}]*?)\s+\]/g,
    (_match, items) => `[${items.split(/,\s+/).join(", ")}]`,
  );
  return `${text}\n`;
}

const source = readJson(modelsPath);
const manifest = readJson(manifestPath);
const providerIds = Object.keys(source.providers ?? {});
if (!Array.isArray(source.models) || providerIds.length === 0) {
  fail("models.json needs a providers object and a models list");
}
if ([...providerIds].sort().join() !== [...manifest.providers].sort().join()) {
  fail(`models.json providers (${providerIds}) differ from the manifest (${manifest.providers})`);
}

const providers = {};
for (const providerId of providerIds) {
  const { baseUrl } = source.providers[providerId];
  if (typeof baseUrl !== "string" || !baseUrl.startsWith("https://")) {
    fail(`${providerId} needs an https baseUrl`);
  }
  // A model is on a provider when its price has that provider's key.
  const models = source.models
    .filter((model) => model.price?.[providerId])
    .map((model) => buildRow(model, providerId));
  if (models.length === 0) {
    fail(`${providerId} has no models`);
  }
  // The first model of the provider is its default model for onboarding.
  providers[providerId] = {
    baseUrl,
    api: "openai-completions",
    defaultModel: models[0].id,
    models,
  };
}
manifest.modelCatalog = {
  providers,
  discovery: Object.fromEntries(providerIds.map((id) => [id, "refreshable"])),
};

const text = format(manifest);
if (process.argv.includes("--check")) {
  if (readFileSync(manifestPath, "utf8") !== text) {
    fail("openclaw.plugin.json is not current. Run: npm run build");
  }
  console.log("build: openclaw.plugin.json is current");
  process.exit(0);
}
writeFileSync(manifestPath, text);
const counts = providerIds.map((id) => `${id}: ${providers[id].models.length} models`).join(", ");
console.log(`build: wrote openclaw.plugin.json (${counts})`);
