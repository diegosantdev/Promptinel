# Environment Variables

Complete reference for all environment variables supported by Promptinel.

---

## Provider Keys

| Variable              | Required | Description                                |
|-----------------------|----------|--------------------------------------------|
| `OPENAI_API_KEY`      | Optional | API key for the OpenAI provider            |
| `ANTHROPIC_API_KEY`   | Optional | API key for the Anthropic provider         |
| `MISTRAL_API_KEY`     | Optional | API key for the Mistral provider           |
| `OLLAMA_BASE_URL`     | Optional | Base URL for local Ollama instance. Defaults to `http://localhost:11434` |

All provider keys are optional. When none are set, Promptinel automatically uses **mock mode**.

---

## Integrations

| Variable              | Required | Description                                |
|-----------------------|----------|--------------------------------------------|
| `SLACK_WEBHOOK_URL`   | Optional | Incoming webhook URL for Slack drift alerts |

---

## HTTP Adapter Behavior

These variables control how Promptinel interacts with provider APIs. Useful for CI and offline testing.

| Variable                    | Default  | Values                   | Description                                            |
|-----------------------------|----------|--------------------------|--------------------------------------------------------|
| `PROMPTINEL_HTTP_MODE`      | `live`   | `live`, `record`, `replay` | Controls whether real API calls are made             |
| `PROMPTINEL_FIXTURES_DIR`   | `.promptinel/fixtures` | Any path | Directory for storing HTTP fixture recordings |

### HTTP Mode Options

| Mode     | Description                                                   |
|----------|---------------------------------------------------------------|
| `live`   | Makes real network calls to the provider (default)            |
| `record` | Makes real calls and saves the responses as fixtures          |
| `replay` | Uses saved fixtures; no network calls made                     |

> **Tip:** Use `record` once with a real API key, then switch to `replay` for free, offline CI runs.

---

## Example `.env` File

Copy the `.env.example` file and fill in the values you need:

```bash
# Cloud providers (all optional — mock mode is used if none are set)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
MISTRAL_API_KEY=

# Local provider
OLLAMA_BASE_URL=http://localhost:11434

# Notifications
SLACK_WEBHOOK_URL=

# HTTP adapter mode: live | record | replay
PROMPTINEL_HTTP_MODE=live
PROMPTINEL_FIXTURES_DIR=.promptinel/fixtures
```

---

## Notes

- The default provider flow is `mock`, no credentials needed out of the box.
- To test cloud adapters without live API keys, use `PROMPTINEL_HTTP_MODE=replay` with pre-recorded fixtures.
- To generate fixtures for replay, set `PROMPTINEL_HTTP_MODE=record` with your provider key configured.
- Never commit real API keys. Keep `.env` in `.gitignore`.

---

> Made with ❤️ by [@diegosantdev](https://github.com/diegosantdev)
