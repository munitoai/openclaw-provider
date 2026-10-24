// OpenClaw provider plugin for Munito AI.
// It adds two providers that use one key: "munito" (the global host) and "munito-eu" (the EU host).
// The model rows come from openclaw.plugin.json. scripts/build.mjs writes them from models.json.
import { defineSingleProviderPluginEntry } from "openclaw/plugin-sdk/provider-entry";
import {
  buildManifestProviderCatalogFamily,
  buildSingleProviderApiKeyCatalog,
} from "openclaw/plugin-sdk/provider-catalog-shared";
import manifest from "../openclaw.plugin.json" with { type: "json" };

const PROVIDER_ID = "munito";
const DOCS_PATH = "/providers/munito";

const family = buildManifestProviderCatalogFamily({
  docsPath: DOCS_PATH,
  surfaces: [
    { id: "munito", label: "Munito AI", catalog: manifest.modelCatalog.providers.munito },
    {
      id: "munito-eu",
      label: "Munito AI (EU)",
      catalog: manifest.modelCatalog.providers["munito-eu"],
    },
  ],
});

// Both providers use the key of "munito". A baseUrl in models.providers.<id>
// of the OpenClaw config replaces the default host of that provider.
async function runCatalog(ctx) {
  const entries = family.entries.filter(
    ({ id }) => ctx.providerIds === undefined || ctx.providerIds.includes(id),
  );
  if (entries.length === 0) {
    return null;
  }
  const auth = ctx.resolveProviderApiKey(PROVIDER_ID);
  if (!auth.apiKey) {
    return null;
  }
  const providers = {};
  for (const entry of entries) {
    const result = await buildSingleProviderApiKeyCatalog({
      ctx: { ...ctx, resolveProviderApiKey: () => auth },
      providerId: entry.id,
      buildProvider: entry.buildProvider,
      allowExplicitBaseUrl: true,
    });
    if (result && "provider" in result) {
      providers[entry.id] = result.provider;
    }
  }
  return { providers };
}

export default defineSingleProviderPluginEntry({
  id: PROVIDER_ID,
  name: "Munito AI Provider",
  description: "Munito AI provider plugin",
  manifest,
  provider: {
    label: "Munito AI",
    docsPath: DOCS_PATH,
    manifestAuth: {
      noteTitle: "Munito AI",
      noteMessage: "Create an API key at https://console.munito.ai/keys",
    },
    catalog: {
      order: "paired",
      run: runCatalog,
      staticRun: family.staticCatalog,
    },
    augmentModelCatalog: family.augmentModelCatalog,
  },
});
