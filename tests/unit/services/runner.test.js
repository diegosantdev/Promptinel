import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Runner } from '../../../src/services/runner.js';
import { MockProvider } from '../../../src/providers/mock.js';
import { Watchlist } from '../../../src/services/watchlist.js';
import { Storage } from '../../../src/services/storage.js';
import { Scorer } from '../../../src/services/scorer.js';
import { promises as fs } from 'fs';

const TEST_WATCHLIST = '.promptinel-test/watchlist-runner.json';
const TEST_STORAGE = '.promptinel-test/snapshots-runner';

describe('Runner', () => {
  let runner;
  let providers;
  let watchlist;
  let storage;
  let scorer;

  beforeEach(async () => {
    try {
      await fs.rm('.promptinel-test', { recursive: true, force: true });
    } catch (error) {
    }


    providers = new Map();
    providers.set('mock', new MockProvider());
    
    watchlist = new Watchlist(TEST_WATCHLIST);
    storage = new Storage(TEST_STORAGE);
    scorer = new Scorer();
    
    runner = new Runner(providers, watchlist, storage, scorer);
  });

  afterEach(async () => {
    try {
      await fs.rm('.promptinel-test', { recursive: true, force: true });
    } catch (error) {
    }
  });

  describe('executePrompt', () => {
    it('should execute prompt and create snapshot', async () => {
      await watchlist.add({
        id: 'test_prompt_1',
        prompt: 'What is AI?',
        model: 'mock-default',
        provider: 'mock',
        threshold: 0.3
      });

      const snapshot = await runner.executePrompt('test_prompt_1');

      expect(snapshot).toHaveProperty('id');
      expect(snapshot).toHaveProperty('promptId', 'test_prompt_1');
      expect(snapshot).toHaveProperty('prompt', 'What is AI?');
      expect(snapshot).toHaveProperty('output');
      expect(snapshot).toHaveProperty('model', 'mock-default');
      expect(snapshot).toHaveProperty('provider', 'mock');
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('metadata');
    });

    it('should save snapshot to storage', async () => {
      await watchlist.add({
        id: 'test_prompt_2',
        prompt: 'Explain quantum computing',
        model: 'mock-default',
        provider: 'mock',
        threshold: 0.3
      });

      const snapshot = await runner.executePrompt('test_prompt_2');

      const retrieved = await storage.getSnapshot('test_prompt_2', snapshot.id);
      expect(retrieved.id).toBe(snapshot.id);
      expect(retrieved.output).toBe(snapshot.output);
    });

    it('should throw error if provider not available', async () => {
      await watchlist.add({
        id: 'test_prompt_3',
        prompt: 'test',
        model: 'gpt-4',
        provider: 'openai',
        threshold: 0.3
      });

      await expect(
        runner.executePrompt('test_prompt_3')
      ).rejects.toThrow('Provider openai not available');
    });

    it('should compare with baseline if exists', async () => {

      await watchlist.add({
        id: 'test_prompt_4',
        prompt: 'What is machine learning?',
        model: 'mock-default',
        provider: 'mock',
        threshold: 0.3
      });


      const baseline = await runner.executePrompt('test_prompt_4');


      await watchlist.updateBaseline('test_prompt_4', baseline.id);


      const current = await runner.executePrompt('test_prompt_4');

      expect(current).toHaveProperty('driftScore');
      expect(current).toHaveProperty('baselineId', baseline.id);
      expect(current.driftScore).toBeGreaterThanOrEqual(0);
      expect(current.driftScore).toBeLessThanOrEqual(1);
    });

    it('should not have drift score if no baseline', async () => {
      await watchlist.add({
        id: 'test_prompt_5',
        prompt: 'test',
        model: 'mock-default',
        provider: 'mock',
        threshold: 0.3
      });

      const snapshot = await runner.executePrompt('test_prompt_5');

      expect(snapshot.driftScore).toBeUndefined();
      expect(snapshot.baselineId).toBeUndefined();
    });
  });

  describe('executeWatchlist', () => {
    it('should execute all prompts in watchlist', async () => {
      await watchlist.add({
        id: 'prompt_1',
        prompt: 'First prompt',
        model: 'mock-default',
        provider: 'mock',
        threshold: 0.3
      });

      await watchlist.add({
        id: 'prompt_2',
        prompt: 'Second prompt',
        model: 'mock-default',
        provider: 'mock',
        threshold: 0.3
      });

      const snapshots = await runner.executeWatchlist();

      expect(snapshots.length).toBe(2);
      expect(snapshots[0].promptId).toBe('prompt_1');
      expect(snapshots[1].promptId).toBe('prompt_2');
    });

    it('should return empty array if watchlist is empty', async () => {
      const snapshots = await runner.executeWatchlist();

      expect(snapshots).toEqual([]);
    });

    it('should continue on error and log failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const badEntryId = 'bad_prompt';
      
      runner.watchlist.getAll = vi.fn().mockResolvedValue([
        { id: badEntryId },
        { id: 'good_prompt' }
      ]);

      runner.executePrompt = vi.fn()
        .mockRejectedValueOnce(new Error('Provider nonexistent not available'))
        .mockResolvedValueOnce({ promptId: 'good_prompt' });

      const snapshots = await runner.executeWatchlist();

      expect(snapshots.length).toBe(1);
      expect(snapshots[0].promptId).toBe('good_prompt');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to execute prompt bad_prompt')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('scheduleWatchlist', () => {
    it('should accept cron expression', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      runner.scheduleWatchlist('0 * * * *');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('0 * * * *')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('stopSchedule', () => {
    it('should stop scheduled execution', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});


      runner._cronTask = { stop: vi.fn() };
      runner.stopSchedule();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('stopped')
      );

      consoleSpy.mockRestore();
    });
  });
});
