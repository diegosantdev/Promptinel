# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |

---

## Security Overview

Promptinel may interact with cloud LLM providers, local model runtimes, prompt snapshots, CI/CD systems, and webhook-based notifications. Because of that, secure handling of credentials, prompt data, logs, and network configuration is essential.

This document explains the security expectations, best practices, and reporting process for Promptinel users and contributors.

---

## Security Best Practices

### API Keys

**Critical: never commit API keys or secrets to version control.**

#### Do

- Store API keys in a local `.env` file
- Use environment variables in CI/CD
- Rotate keys regularly
- Use separate keys for development and production
- Restrict key permissions when the provider supports it
- Revoke keys immediately if compromise is suspected

#### Do not

- Hardcode keys in source code
- Commit `.env` files
- Share keys in chat, email, screenshots, or issue comments
- Use production keys in local development unless necessary
- Store secrets in public repositories or client-side code

---

## Environment Variables

All sensitive configuration should be supplied through environment variables.

```bash
# Cloud providers
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
MISTRAL_API_KEY=your_key_here

# Optional integrations
SLACK_WEBHOOK_URL=your_webhook_here

# Local runtime
OLLAMA_BASE_URL=http://localhost:11434
```

### Recommendations

- Keep `.env` in `.gitignore`
- Prefer CI secrets over plaintext config files
- Avoid printing full environment values in logs
- Use different secrets for each environment

---

## Network Security

### Ollama Provider

By default, Promptinel assumes:

```bash
OLLAMA_BASE_URL=http://localhost:11434
```

This is the safest default because it keeps traffic local to your machine.

#### Recommendations

- Keep Ollama bound to localhost unless remote access is intentionally required
- Do not expose Ollama directly to the public internet without authentication and network controls
- Use SSH tunneling, a VPN, or a private network for remote Ollama access
- Review firewall rules before exposing any local model server

### Cloud Providers

Cloud providers are accessed over HTTPS using provider SDKs or authenticated HTTP requests.

#### Recommendations

- Use only official endpoints
- Send credentials through environment variables, not inline config
- Do not log request headers containing secrets
- Review each provider's data retention and privacy terms before sending sensitive prompt content

---

## Data Security

Promptinel is designed to avoid storing secrets in snapshots or watchlists, but prompt content itself may still be sensitive.

### Snapshots

Snapshots are stored locally in the `.promptinel/` directory.

Snapshots may contain:

- prompt text
- model outputs
- drift metadata
- timestamps
- scoring results

#### Recommendations

- Treat snapshots as potentially sensitive
- Review snapshot contents before sharing them
- Keep `.promptinel/` gitignored
- Apply retention policies where appropriate
- Avoid using production personal data in prompt examples when possible

### Watchlist

The watchlist may contain:

- prompt IDs
- prompt text or message arrays
- provider settings
- model names
- thresholds
- tags or metadata

#### Recommendations

- Treat watchlist entries as configuration with possible business sensitivity
- Avoid placing confidential customer data directly in watchlist fixtures
- Keep local watchlist files private unless intentionally publishing example prompts

### Logs

Promptinel should not log API keys, authorization headers, or raw secrets.

#### Recommendations

- Sanitize provider errors before writing logs
- Keep logs in a gitignored path such as `.promptinel/logs/`
- Review logs before attaching them to public issues
- Redact prompt content if it may contain sensitive information

---

## CI/CD Security

Promptinel is designed to work well in CI/CD, but pipelines should be configured carefully.

### GitHub Actions Best Practices

- Store API keys as repository or organization secrets
- Never place raw secrets directly in workflow files
- Limit workflow permissions to the minimum required
- Enable branch protection for the default branch
- Review third-party actions before adding them
- Avoid echoing environment variables to logs

### Secure example

```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Insecure example

```yaml
env:
  OPENAI_API_KEY: sk-xxxxxxxxxxxxxxxx
```

### Additional Recommendations

- Prefer mock mode for default CI test coverage
- Use real provider credentials only in workflows that actually require them
- Separate security-sensitive monitoring workflows from public fork workflows when needed
- Review secret exposure rules for pull requests from forks

---

## Dependency Security

Promptinel depends on the Node.js ecosystem, so dependency hygiene matters.

### Recommended practices

```bash
npm audit
npm audit fix
npm update
```

### Recommendations

- Review dependency updates regularly
- Enable Dependabot or equivalent automated scanning
- Avoid adding unnecessary dependencies
- Prefer well-maintained packages with active security support
- Pin or constrain critical packages when appropriate

---

## Input Validation and Prompt Safety

Promptinel monitors prompts, but it does not guarantee that prompt content is safe or free from injection risks.

### Important considerations

- Promptinel sends configured prompt content to the selected provider as-is
- User-generated prompts should be reviewed before being added to the watchlist
- Outputs should be treated as untrusted content until validated by the consuming system
- Drift detection does not replace application-level safety validation

### Recommendations

- Validate prompt structure before saving
- Be cautious with prompts derived from external user input
- Do not assume monitored prompts are safe simply because they are stable
- Review tool-calling or agent prompts carefully, especially when they affect downstream systems

---

## File System Safety

Promptinel writes local files for snapshots, history, reports, and logs.

### Recommendations

- Sanitize prompt IDs before using them in filenames
- Prevent path traversal by resolving and validating storage paths
- Use safe path joining for all file operations
- Restrict file permissions where appropriate for shared environments

---

## Secrets Handling

Promptinel should never intentionally persist secrets in watchlists, snapshots, reports, or logs.

### Best practices

- Keep provider credentials only in environment variables or secret managers
- Avoid embedding secrets in prompt text
- Review exported reports before sharing externally
- Redact integration URLs such as private Slack webhooks before publishing examples

---

## Reporting a Security Vulnerability

**Do not open a public issue for security vulnerabilities.**

Please contact me privately on GitHub: **[@diegosantdev](https://github.com/diegosantdev)**

Include:

- a clear description of the issue
- steps to reproduce
- affected versions or environments
- potential impact
- any suggested mitigation or fix, if available

### Response expectations

- Initial response target: within 48 hours
- Validation and triage as quickly as possible
- Coordinated disclosure after a fix is available when appropriate

---

## Security Checklist

Before deploying Promptinel in a real environment, verify the following:

- API keys are stored in environment variables
- `.env` is gitignored
- no credentials are hardcoded in the codebase
- `.promptinel/` is gitignored
- logs do not expose secrets
- Ollama is bound to localhost or otherwise secured
- CI workflows use secrets properly
- Slack webhook URLs are kept private
- dependencies have been checked with `npm audit`
- snapshot retention is appropriate for your data sensitivity
- prompt content has been reviewed for confidential data exposure
- provider usage is aligned with your compliance requirements

---

## Known Security Considerations

### Mock Provider

- No external API calls
- No credentials required
- Safe for local testing and CI by default
- Suitable for public demos and contributor onboarding

### Ollama Provider

- Runs locally by default
- No API keys required
- Keeps data on your own machine unless reconfigured
- Be cautious when overriding `OLLAMA_BASE_URL`

### Cloud Providers

- Prompt and output data may be sent to external providers
- Security posture depends partly on the selected provider
- Review provider terms, retention policies, and regional controls
- Consider local models for sensitive workloads

---

## Privacy and Compliance Considerations

### Personal Data

Prompt content may contain personal or sensitive information depending on how Promptinel is used.

#### Recommendations

- Avoid using real personal data in examples when possible
- Apply retention controls for snapshots and logs
- Delete outdated monitoring data when no longer needed
- Prefer local providers such as Ollama for sensitive workloads

### GDPR

If prompts or outputs contain personal data:

- define a lawful basis for processing
- minimize the data sent to providers
- document retention periods
- support deletion where required
- review cross-border data transfer implications

### SOC 2 and Internal Controls

Promptinel can support auditability, but secure operation depends on deployment choices.

Helpful controls include:

- gitignored local storage
- access control through OS and file permissions
- HTTPS for cloud provider traffic
- CI secret management
- regular dependency updates
- local audit logs when enabled

---

## Disclosure Policy

When a valid vulnerability is confirmed, Promptinel maintainers should aim to:

- acknowledge receipt quickly
- assess severity and impact
- prepare and test a fix
- publish a patch when available
- disclose the issue responsibly after mitigation

---

## Security Updates

This policy should be reviewed periodically and updated as the project evolves.

Last updated: 2026-03-26

---

Built and maintained by [@diegosantdev](https://github.com/diegosantdev)