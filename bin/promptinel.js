#!/usr/bin/env node

import { Command } from 'commander';
import { CLI } from '../src/cli.js';
import { readFileSync } from 'fs';

try {
  const envFile = readFileSync('.env', 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
}

const program = new Command();

program
  .name('promptinel')
  .description('LLM prompt monitoring and drift detection')
  .version('0.1.0');

program
  .command('add')
  .description('Add a prompt to the watchlist')
  .action(async () => {
    try {
      const cli = new CLI();
      await cli.add();
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command('check <prompt-id>')
  .description('Execute a specific prompt once and display output')
  .action(async (promptId) => {
    try {
      const cli = new CLI();
      await cli.check(promptId);
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Execute all watchlist prompts and compare against baselines')
  .option('--schedule <cron>', 'Run on a schedule')
  .action(async (options) => {
    try {
      const cli = new CLI();
      await cli.watch(options);
    } catch (error) {
      if (error.message === 'DRIFT_DETECTED_IN_CI') {
        process.exit(1);
      }
      process.exit(1);
    }
  });

program
  .command('diff <id1> [id2]')
  .description('Compare two snapshots or a prompt with its baseline')
  .option('--format <type>', 'Output format (text or json)', 'text')
  .action(async (id1, id2, options) => {
    try {
      const cli = new CLI();
      await cli.diff(id1, id2, options);
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command('baseline <prompt-id>')
  .description('Set baseline for a prompt')
  .option('--latest', 'Use latest snapshot')
  .option('--snapshot <id>', 'Use specific snapshot')
  .action(async (promptId, options) => {
    try {
      const cli = new CLI();
      await cli.baseline(promptId, options);
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Generate drift report')
  .option('--format <type>', 'Output format (json, csv, text)', 'text')
  .option('--prompt <id>', 'Report for specific prompt')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--output <path>', 'Write to file')
  .action(async (options) => {
    try {
      const cli = new CLI();
      await cli.report(options);
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command('cleanup')
  .description('Clean up old snapshots according to retention policy')
  .option('--keep-last <n>', 'Keep last N snapshots per prompt')
  .option('--keep-days <n>', 'Keep snapshots from last N days')
  .action(async (options) => {
    try {
      const cli = new CLI();
      await cli.cleanup(options);
    } catch (error) {
      process.exit(1);
    }
  });

program
  .command('dashboard')
  .description('Start the web dashboard')
  .option('-p, --port <port>', 'Port to run dashboard on', '3000')
  .action(async (options) => {
    try {
      const cli = new CLI();
      await cli.dashboard(options);
    } catch (error) {
      process.exit(1);
    }
  });

program.parse();
