import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CLI } from '../../../src/cli.js';
import { promises as fs } from 'fs';

const TEST_DIR = '.promptinel-test/cli-report';

describe('CLI - Report Command', () => {
  let cli;

  beforeEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
    }
    cli = new CLI();
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
    }
  });

  describe('format options', () => {
    it('should support text format', async () => {
      await cli.watchlist.add({
        prompt: 'test',
        provider: 'mock',
        model: 'mock-default',
        threshold: 0.5
      });

      await expect(cli.report({ format: 'text' })).resolves.not.toThrow();
    });

    it('should support json format', async () => {
      await cli.watchlist.add({
        prompt: 'test',
        provider: 'mock',
        model: 'mock-default',
        threshold: 0.5
      });

      await expect(cli.report({ format: 'json' })).resolves.not.toThrow();
    });

    it('should support csv format', async () => {
      await cli.watchlist.add({
        prompt: 'test',
        provider: 'mock',
        model: 'mock-default',
        threshold: 0.5
      });

      await expect(cli.report({ format: 'csv' })).resolves.not.toThrow();
    });
  });

  describe('filtering', () => {
    it('should filter by prompt ID', async () => {
      await cli.watchlist.add({
        prompt: 'test1',
        provider: 'mock',
        model: 'mock-default',
        threshold: 0.5
      });

      await cli.watchlist.add({
        prompt: 'test2',
        provider: 'mock',
        model: 'mock-default',
        threshold: 0.5
      });

      const entries = await cli.watchlist.getAll();
      
      await expect(cli.report({ prompt: entries[0].id })).resolves.not.toThrow();
    });

    it('should filter by tags', async () => {
      await cli.watchlist.add({
        prompt: 'test',
        provider: 'mock',
        model: 'mock-default',
        threshold: 0.5,
        tags: ['production', 'critical']
      });

      await expect(cli.report({ tags: 'production' })).resolves.not.toThrow();
    });
  });

  describe('file output', () => {
    it('should write report to file when output option provided', async () => {
      await cli.watchlist.add({
        prompt: 'test',
        provider: 'mock',
        model: 'mock-default',
        threshold: 0.5
      });

      const outputPath = `${TEST_DIR}/report.txt`;
      await cli.report({ format: 'text', output: outputPath });

      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
    });
  });
});
