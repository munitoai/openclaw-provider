# Munito AI for OpenClaw

This plugin makes [Munito AI](https://munito.ai) a model provider of [OpenClaw](https://openclaw.ai).
Munito AI serves open models for Europe, private by default, on an OpenAI-compatible API.

## Requirements

- OpenClaw 2026.10.7 or later.
- A Munito AI API key. Create one at [console.munito.ai/keys](https://console.munito.ai/keys).

## Install

```bash
openclaw plugins install git:github.com/munitoai/openclaw-provider
```

OpenClaw asks you to confirm the source and to accept the capabilities of the plugin. In a script, add `--force --accept-capabilities`.
If a Gateway runs, restart it with `openclaw gateway restart`.

## Set the key

The plugin reads the key from `MUNITO_API_KEY`:

```bash
export MUNITO_API_KEY="<your Munito AI API key>"
```

Or run `openclaw onboard` and pick **Munito AI API key**.
In a script, keep the key in `MUNITO_API_KEY` and save only a reference to it:

```bash
openclaw onboard --non-interactive --accept-risk --auth-choice munito-api-key --secret-input-mode ref
```

Onboarding sets the first model of the `munito` provider as the default model.

## Providers

The plugin adds two providers. They use the same key.

| Provider | Host | Use it when |
|---|---|---|
| `munito` (Munito AI) | `https://api.munito.ai/inference/v1` | Any region can process the request. |
| `munito-eu` (Munito AI (EU)) | `https://api.eu.munito.ai/inference/v1` | Each request must stay in the EU. |

To see the models of a provider, run `openclaw models list --all --refresh --provider munito`.
For the EU provider, use `--provider munito-eu`.
Put the provider before the model ID:

```bash
openclaw agent exec --model munito-eu/zai-org/glm-5.3-flash "Summarize README.md"
```

The prices of the models are at [docs.munito.ai/models](https://docs.munito.ai/models).
OpenClaw uses the same prices to show the cost of each turn.

## Another Munito host

To use another Munito host, such as the US host, set its base URL in the OpenClaw config.
OpenClaw needs a `models` list in the entry. An empty list keeps the models, the prices and the limits of the plugin.

```json5
{
  models: {
    providers: {
      munito: { baseUrl: "https://api.us.munito.ai/inference/v1", models: [] },
    },
  },
}
```

On another host, OpenClaw does not use the `compat` block of the plugin models.
It then sends no `prompt_cache_key`, and it does not move `reasoning_effort` to a level of the model.
To keep the `compat` block, copy the row of each model that you use from `openclaw.plugin.json` into `models`.
Use only the models that the host serves. See [Regions](https://docs.munito.ai/regions).

## Reasoning

All models are reasoning models. OpenClaw sends its thinking level as `reasoning_effort`.
Each model has its own levels. OpenClaw moves a level that a model does not have to the nearest lower level of the model, or else to its lowest level.
`/think off` sends `reasoning_effort: "none"`.
OpenClaw reads the reasoning text from the `reasoning` field of each response.
See [Reasoning models](https://docs.munito.ai/reasoning).

## Prompt cache

OpenClaw sends the session ID as `prompt_cache_key`.
Munito AI sends the turns of a session to the same prompt cache. A long session then reads more of its tokens from the cache, and cache reads cost less.
See [Prompt caching](https://docs.munito.ai/prompt-caching).

## Change the models

The model rows come from `models.json`. A model is on a provider when its `price` has the key of that provider.

1. Edit `models.json`.
2. Run `npm run build`. The script writes the rows into `openclaw.plugin.json`.
3. Run `npm run check`. It fails when `openclaw.plugin.json` is not current.

## License

MIT
