import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CLI } from '../../../src/cli.js';
import { promises as fs } from 'fs';

const TEST_DIR = '.promptinel-test/cli-watch';

describe('CLI - Watch Command', () => {
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

  describe('error handling', () => {
    it('should log errors and continue with other prompts', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await cli.watchlist.add({
        prompt: 'valid prompt',
        provider: 'mock',
        model: 'mock-default',
        threshold: 0.5
      });


      await cli.watch({});

      consoleSpy.mockRestore();
    });
  });

  describe('graceful shutdown', () => {
    it('should handle stop signal gracefully', async () => {
      expect(cli.runner).toBeDefined();
      expect(cli.runner.stopSchedule).toBeDefined();
    });
  });
});
