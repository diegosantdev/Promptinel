# GitHub Actions Integration

Complete guide for running Promptinel prompt drift monitoring in GitHub Actions, scheduled, on-demand, or as a CI quality gate.

## Quick Setup

1. **Copy the workflow template to your repository:**

```bash
mkdir -p .github/workflows
cp .github/workflows/promptinel.yml .github/workflows/
```

2. **Add prompts to monitor:**

```bash
node bin/promptinel.js add
```

3. **Commit and push:**

```bash
git add .github/workflows/
git commit -m "Add Promptinel monitoring workflow"
git push
```

4. **The workflow will run automatically:**
   - Every hour (configurable via cron)
   - On manual trigger
   - When workflow configuration changes

> Note: `.promptinel/` contains snapshots and may contain sensitive prompt text/outputs. It is **gitignored by default**.
> For CI, prefer uploading snapshots as **artifacts** (already supported) or using a cache, rather than committing snapshots to git.

## Workflow Features

### Main Workflow (promptinel.yml)

- ✅ Runs in mock mode by default (no API keys needed)
- ✅ Uploads snapshots as artifacts
- ✅ Checks for drift and fails if threshold exceeded
- ✅ Supports manual triggers
- ✅ Configurable schedule

### Test Workflow (test.yml)

- ✅ Runs on multiple OS (Ubuntu, Windows, macOS)
- ✅ Tests on Node.js 18, 20, 21
- ✅ Generates coverage reports
- ✅ Runs linter

## Using Real LLM Providers

To use OpenAI, Anthropic, or Mistral instead of mock:

1. **Add API keys as repository secrets:**
   - Go to Settings → Secrets and variables → Actions
   - Add secrets: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`

2. **Uncomment the env section in the workflow:**

```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
  CI: true
```

3. **Update your prompts to use the desired provider:**

```bash
node bin/promptinel.js add
# Select openai/anthropic/mistral when prompted
```

## Slack Notifications

To receive Slack notifications on drift:

1. **Create a Slack webhook:**
   - Go to https://api.slack.com/messaging/webhooks
   - Create an incoming webhook for your channel

2. **Add webhook as a secret:**
   - Add `SLACK_WEBHOOK` to repository secrets

3. **Uncomment the notification step:**

```yaml
- name: Notify on drift
  if: steps.drift-check.outcome == 'failure'
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"⚠️ Drift detected in Promptinel monitor"}'
```

## Customizing the Schedule

Edit the cron expression in the workflow:

```yaml
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
    # - cron: '0 */6 * * *'  # Every 6 hours
    # - cron: '0 0 * * *'    # Daily at midnight
    # - cron: '0 0 * * 0'    # Weekly on Sunday
```

## Viewing Results

### In GitHub Actions UI

1. Go to Actions tab in your repository
2. Click on the latest "Promptinel Monitor" run
3. View logs and download snapshot artifacts

### Download Artifacts

Snapshots are saved as artifacts for 30 days:

```bash
# Download via GitHub CLI
gh run download <run-id> -n promptinel-snapshots-<run-number>
```

## CI/CD Integration

Use Promptinel as a quality gate in your deployment pipeline:

```yaml
- name: Check prompt behavior
  run: node bin/promptinel.js watch
  
- name: Fail if drift detected
  run: |
    if node bin/promptinel.js report | grep -q "DRIFT"; then
      echo "❌ Drift detected, blocking deployment"
      exit 1
    fi
```

## Troubleshooting

### Workflow not running

- Check that the workflow file is in `.github/workflows/`
- Verify the cron syntax is correct
- Ensure Actions are enabled in repository settings

### Mock mode not working

- Mock provider works without any configuration
- Check that no API keys are set in environment
- Verify `.promptinel/watchlist.json` exists

### API rate limits

- Use mock provider for frequent checks
- Reduce schedule frequency
- Implement caching between runs

## Example: Multi-Environment Monitoring

Monitor different environments with separate workflows:

```yaml
# .github/workflows/monitor-production.yml
name: Monitor Production Prompts
on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours

# .github/workflows/monitor-staging.yml  
name: Monitor Staging Prompts
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
```

Use different watchlist files per environment:

```bash
.promptinel/
├── watchlist-production.json
├── watchlist-staging.json
└── snapshots/
```

## Best Practices

1. **Start with mock provider** - Test your setup without API costs
2. **Use caching** - Preserve snapshots between runs
3. **Set appropriate thresholds** - Balance sensitivity vs noise
4. **Monitor critical prompts only** - Focus on high-impact use cases
5. **Review artifacts regularly** - Check snapshots for unexpected changes
6. **Use manual triggers** - Test changes before scheduling

## Support

For issues or questions:

- Check the [main README](../README.md)
- Review [USAGE.md](../USAGE.md) for CLI examples
- Review [ENVIRONMENT.md](ENVIRONMENT.md) for environment variable reference
- Open an issue on [GitHub](https://github.com/diegosantdev/promptinel/issues)

---

> Made with ❤️ by [@diegosantdev](https://github.com/diegosantdev)
