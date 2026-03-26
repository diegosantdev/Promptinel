# Promptinel Dashboard

> The visual monitoring interface for Promptinel, inspect prompt status, drift history, snapshots, and trends in real time.

---

## Overview

The Promptinel dashboard is a [Next.js](https://nextjs.org) application that reads data from the local `.promptinel/` directory and presents it visually.

Features:

- 📊 Drift score history and trend charts
- 🔍 Snapshot inspector with side-by-side diff
- 📋 Prompt watchlist status overview
- ⚠️ Drift alert summary

---

## Getting Started

Install dependencies from the project root:

```bash
npm install
```

Then start the dashboard:

```bash
cd dashboard
npm install
npm run dev
```

Open [`http://localhost:3000`](http://localhost:3000) in your browser.

---

## Requirements

- Node.js 18 or later
- At least one prompt added via `node bin/promptinel.js add`
- At least one snapshot created via `node bin/promptinel.js check <id>`

The dashboard reads from `.promptinel/` in the project root. Make sure you run the CLI commands from the root of the project before opening the dashboard.

---

## Data Flow

```text
CLI commands → .promptinel/ (JSON files) → Dashboard API routes → UI
```

The dashboard does not write any data. It is read-only.

---

## Building for Production

```bash
cd dashboard
npm run build
npm start
```

---

## Related

- [Main README](../README.md), project overview and CLI reference
- [QUICKSTART.md](../QUICKSTART.md), step-by-step first run guide
- [USAGE.md](../USAGE.md), full CLI usage reference

---

> Made with ❤️ by [@diegosantdev](https://github.com/diegosantdev)
