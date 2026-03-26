# Promptinel Usage Guide

## Quick Start

### 1. Add a prompt to monitor

```bash
node bin/promptinel.js add
```

You'll be prompted for:
- Prompt text (the prompt you want to monitor)
- Provider (mock, ollama, etc.)
- Model (mock-default, mock-fast, mock-quality)
- Drift threshold (0-1, default 0.3)

Example:
```
- ID: prompt_1234567890_abc123
- Provider: mock
- Model: mock-default
- Threshold: 0.3

✓ Prompt added successfully!
   ID: prompt_1234567890_abc123
   Provider: [MOCK]
   Model: mock-default
   Threshold: 0.3

Run 'node bin/promptinel.js check prompt_1234567890_abc123' to test it.
```

### 2. Check a prompt (execute once)

```bash
node bin/promptinel.js check prompt_1234567890_abc123
```

Output:
```
🔍 Executing Prompt
   Prompt ID: prompt_1234567890_abc123

⚠ Mock Mode: Using simulated responses
ℹ Configure a real provider for actual LLMs

✓ Execution complete!

──────────────────────────────────────────────────
   Snapshot ID: snap_1234567890_xyz789
   Provider: [MOCK]
   Model: mock-default
   Timestamp: 2026-03-26T12:00:00.000Z

──────────────────────────────────────────────────

Output:
Mock provider generated this deterministic output. [Model: mock-default, Hash: 123456]
```

### 3. Set a baseline

```bash
node bin/promptinel.js baseline prompt_1234567890_abc123 --latest
```

Output:
```
✅ Baseline updated for prompt: prompt_1234567890_abc123
   Snapshot: snap_1234567890_xyz789
```

### 4. Execute all prompts and check for drift

```bash
node bin/promptinel.js watch
```

Output:
```
⚠ Mock Mode: Using simulated responses
ℹ Configure a real provider for actual LLMs

✓ Executed 1 prompt(s)

──────────────────────────────────────────────────────────────────── 📊 prompt_1234567890_abc123  Provider: [MOCK]
Model: mock-default

📝 BEHAVIOR CHANGE:
  The model response now includes a refusal or 
  hedging that was absent in the original output.

   Output: Mock provider generated this deterministic output. [Model: mock-default...
   Drift: 0.450 ⚠️ DRIFT ───────────────────────────────────────────────
```

### 5. Generate a report

```bash
node bin/promptinel.js report
```

Output:
```
📊 Drift Report
ℹ Total prompts: 1

──────────────────────────────────────────────────
📝 prompt_1234567890_abc123
   Prompt: What is artificial intelligence?...
   Provider: [MOCK] / mock-default
   Threshold: 0.3
   Baseline: snap_1234567890_xyz789
   Snapshots: 2
   Latest drift: 0.000 ✓ OK
```

## Advanced Usage

### Compare latest snapshot vs baseline

If you want to quickly see how much a prompt has drifted from its baseline:

```bash
node bin/promptinel.js diff <prompt-id>
```

### Compare two specific snapshots (text format)

Compare outputs side-by-side with drift score:

```bash
node bin/promptinel.js diff snap_1234567890_abc snap_1234567891_def
```

Output:
```
================================================================================
🔍 SNAPSHOT COMPARISON
================================================================================

Snapshot 1: snap_1234567890_abc
  Prompt:    prompt_1234567890_abc123
  Time:      2026-03-26T10:00:00.000Z
  Provider:  mock / mock-default

Snapshot 2: snap_1234567891_def
  Prompt:    prompt_1234567890_abc123
  Time:      2026-03-26T11:00:00.000Z
  Provider:  mock / mock-default

Drift Score: 0.250
Status:      🟡 WARNING (moderate drift)

================================================================================
OUTPUT COMPARISON
================================================================================

┌──────────────────────────────────────┬──────────────────────────────────────┐
│SNAPSHOT 1                            │SNAPSHOT 2                            │
├──────────────────────────────────────┼──────────────────────────────────────┤
│  AI is artificial intelligence.      │← AI stands for artificial            │
│                                      │← intelligence.                       │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

### Compare snapshots (JSON format)

Get machine-readable comparison output:

```bash
node bin/promptinel.js diff snap_123 snap_456 --format json
```

### Advanced Reporting

The `report` command supports various filters and formats:

```bash
# Filter by tag
node bin/promptinel.js report --tags production,critical

# Filter by prompt ID
node bin/promptinel.js report --prompt my-prompt-id

# Custom formats
node bin/promptinel.js report --format csv
node bin/promptinel.js report --format json

# Export to file
node bin/promptinel.js report --output ./reports/weekly-drift.txt
```

### Set specific snapshot as baseline

```bash
node bin/promptinel.js baseline prompt_123 --snapshot snap_456
```

### Schedule monitoring

You can run `watch` on a schedule using the `--schedule` flag (cron syntax):

```bash
# Run every hour
node bin/promptinel.js watch --schedule "0 * * * *"
```

### Clean up old snapshots

Remove old snapshots according to retention policy:

```bash
# Use retention policy from config (default: 30 days)
node bin/promptinel.js cleanup

# Keep only last 10 snapshots per prompt
node bin/promptinel.js cleanup --keep-last 10

# Keep only snapshots from last 7 days
node bin/promptinel.js cleanup --keep-days 7
```

### Visual Dashboard

Start the local dashboard to inspect drift trends and history visually:

```bash
# Default port 3000
node bin/promptinel.js dashboard

# Custom port
node bin/promptinel.js dashboard --port 4000
```

Output:
```
Cleaning up old snapshots...

prompt_123: Deleted 15 snapshot(s)
prompt_456: Deleted 8 snapshot(s)

Cleanup complete! Deleted 23 snapshot(s) total.

Baseline snapshots were preserved.
```

Note: Baseline snapshots are always preserved during cleanup.

## Mock Mode

Promptinel works out of the box with zero configuration using the Mock provider:

- No API keys required
- Deterministic outputs (same prompt = same output)
- Perfect for testing and demos
- Simulates drift detection

The Mock provider generates responses based on a hash of the prompt text, ensuring consistent behavior for testing.

## Testing Without API Keys (Recommended OSS Flow)

Promptinel uses **mock** as the default provider for zero-friction setup.

For cloud adapters (OpenAI/Anthropic/Mistral), there are three testing levels:

1. **Unit tests (no API, no network):** already mocked via `global.fetch` in provider tests.
2. **Replay mode (no API, no network):** run against previously recorded HTTP fixtures.
3. **Record mode (requires API once):** capture fixtures to replay later offline.

### HTTP Modes

- `live` (default): real API calls
- `record`: real API calls + save fixtures
- `replay`: offline mode using saved fixtures only

Environment variables:

- `PROMPTINEL_HTTP_MODE=live|record|replay`
- `PROMPTINEL_FIXTURES_DIR=.promptinel/fixtures` (optional custom path)

### Example: Record once, replay forever

PowerShell (Windows):

```powershell
$env:PROMPTINEL_HTTP_MODE="record"
$env:OPENAI_API_KEY="sk-..."
node bin/promptinel.js check <prompt-id>
```

Then offline:

```powershell
Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
$env:PROMPTINEL_HTTP_MODE="replay"
node bin/promptinel.js check <prompt-id>
```

If a fixture is missing in replay mode, Promptinel returns an explicit error telling you to run once in `record` mode.

## File Structure

After using Promptinel, you'll see:

```
.promptinel/
├── watchlist.json          # Your monitored prompts
└── snapshots/
    └── prompt_123/
        ├── 1234567890_snap_abc.json
        └── 1234567891_snap_def.json
```

All data is stored locally in JSON files, no database required.

---

Built and maintained by [@diegosantdev](https://github.com/diegosantdev)
