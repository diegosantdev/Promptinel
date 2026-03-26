# Quick Start Guide

> Get Promptinel running in minutes with mock mode, a local model, or a cloud provider.

---

## 1. Choose a Provider

### Option A, Mock Mode _(zero config)_

No setup required. If no provider credentials are found, Promptinel automatically falls back to **mock mode**. This is the fastest way to try the project locally or in CI.

```bash
node bin/promptinel.js add
```

---

### Option B, Ollama _(local and free)_

Install Ollama from the [official site](https://ollama.com), then start the local server:

```bash
ollama serve
```

Pull a model:

```bash
ollama pull llama2
```

You can also pull any other supported Ollama model.

---

### Option C, OpenAI

Set your API key before running Promptinel.

**Windows (Command Prompt)**
```cmd
set OPENAI_API_KEY=sk-your-key-here
```

**Windows (PowerShell)**
```powershell
$env:OPENAI_API_KEY="sk-your-key-here"
```

**Linux / macOS**
```bash
export OPENAI_API_KEY=sk-your-key-here
```

---

### Option D, Anthropic

Set your API key before running Promptinel.

**Windows (Command Prompt)**
```cmd
set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Windows (PowerShell)**
```powershell
$env:ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

**Linux / macOS**
```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

---

### Option E, Mistral AI

Set your API key before running Promptinel.

**Windows (Command Prompt)**
```cmd
set MISTRAL_API_KEY=your-key-here
```

**Windows (PowerShell)**
```powershell
$env:MISTRAL_API_KEY="your-key-here"
```

**Linux / macOS**
```bash
export MISTRAL_API_KEY=your-key-here
```

---

## 2. Add Your First Prompt

### Interactive Mode

```bash
node bin/promptinel.js add
```

You will be asked for:

- Prompt ID
- Prompt text
- Provider
- Model
- Drift threshold

**Example values:**

| Field       | Value                      |
|-------------|----------------------------|
| Prompt ID   | `greeting`                 |
| Prompt text | `Say hello in a friendly way` |
| Provider    | `ollama`                   |
| Model       | `llama2`                   |
| Threshold   | `0.3`                      |

---

## 3. Prompt IDs

Prompt IDs are used as directory names under `.promptinel/`, so they must be safe filesystem identifiers.

### Allowed characters
- Letters, numbers, `.`, `_`, `-`
- 1 to 128 characters

### Not allowed
- Spaces, `/`, `\`, `..`

### Examples

| ID                  | Status               |
|---------------------|----------------------|
| `greeting`          | ✅ valid             |
| `prod_checkout_v2`  | ✅ valid             |
| `my prompt`         | ❌ invalid (space)   |
| `../secrets`        | ❌ invalid (traversal) |

---

## 4. Create Your First Snapshot

Run a check for your prompt:

```bash
node bin/promptinel.js check greeting
```

This creates a snapshot of the current model output.

If this is your first run, you can then promote that snapshot to the baseline.

---

## 5. Set the Baseline

```bash
node bin/promptinel.js baseline greeting --latest
```

After this, future checks will be compared against the baseline to detect drift.

---

## 6. Create More Snapshots Over Time

```bash
node bin/promptinel.js check greeting
node bin/promptinel.js check greeting
```

As outputs change, Promptinel compares them against your saved baseline and computes a drift score.

---

## 7. Open the Dashboard

```bash
node bin/promptinel.js dashboard
```

Then open: [`http://localhost:3000`](http://localhost:3000)

---

## Common Commands

| Command                                  | Description                          |
|------------------------------------------|--------------------------------------|
| `node bin/promptinel.js add`             | Add a prompt to the watchlist        |
| `node bin/promptinel.js check <id>`      | Run a single check and create a snapshot |
| `node bin/promptinel.js watch`           | Run all monitored prompts            |
| `node bin/promptinel.js diff <id>`       | Compare latest vs baseline           |
| `node bin/promptinel.js report`          | Generate a drift report              |
| `node bin/promptinel.js cleanup --keep-days 30` | Clean up old snapshots              |

---

## Tips

- Use **mock mode** when you want instant setup with zero cost
- Use **Ollama** for local and private testing
- Use **OpenAI**, **Anthropic**, or **Mistral** for production-like behavior
- Use stricter thresholds (`0.1`) for highly sensitive prompts
- Use looser thresholds (`0.4–0.5`) for prompts with naturally variable output
- Snapshot regularly to build useful drift history
- Add tags to organize prompts by environment or priority

---

## Troubleshooting

### Provider not available
- For Ollama: make sure `ollama serve` is running
- For cloud providers: verify that the correct `*_API_KEY` environment variable is set

### No baseline set

```bash
node bin/promptinel.js baseline <prompt-id> --latest
```

### Dashboard shows no data
- Make sure you added at least one prompt
- Make sure you created at least one snapshot
- Refresh the dashboard after new data is written

### Prompt ID rejected
Use only safe IDs with letters, numbers, `.`, `_`, and `-`.

---

## Recommended First Run

If you just want to see Promptinel working immediately:

```bash
node bin/promptinel.js add
node bin/promptinel.js check demo-prompt
node bin/promptinel.js baseline demo-prompt --latest
node bin/promptinel.js check demo-prompt
node bin/promptinel.js diff demo-prompt
node bin/promptinel.js report
```

If no credentials are present, Promptinel will use **mock mode** automatically.

---

Built and maintained by [@diegosantdev](https://github.com/diegosantdev)