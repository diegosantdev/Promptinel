import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Watchlist, generatePromptId } from '../../../src/services/watchlist.js';
import { promises as fs } from 'fs';

const TEST_FILE = '.promptinel-test/watchlist-test.json';

describe('Watchlist', () => {
  let watchlist;

  beforeEach(async () => {
    watchlist = new Watchlist(TEST_FILE);
    try {
      await fs.unlink(TEST_FILE);
    } catch (error) {
    }
  });

  afterEach(async () => {
    try {
      await fs.unlink(TEST_FILE);
      await fs.rmdir('.promptinel-test');
    } catch (error) {
    }
  });

  describe('generatePromptId', () => {
    it('should generate unique IDs', () => {
      const id1 = generatePromptId();
      const id2 = generatePromptId();
      expect(id1).not.toBe(id2);
    });

    it('should start with prompt_', () => {
      const id = generatePromptId();
      expect(id).toMatch(/^prompt_/);
    });
  });

  describe('getAll', () => {
    it('should return empty array when file does not exist', async () => {
      const entries = await watchlist.getAll();
      expect(entries).toEqual([]);
    });

    it('should return empty array when file contains invalid JSON', async () => {
      await fs.mkdir('.promptinel-test', { recursive: true });
      await fs.writeFile(TEST_FILE, 'not an array');
      
      const entries = await watchlist.getAll();
      expect(entries).toEqual([]);
    });

    it('should create file when first entry is added', async () => {
      try {
        await fs.unlink(TEST_FILE);
      } catch (error) {
      }

      const entriesBefore = await watchlist.getAll();
      expect(entriesBefore).toEqual([]);

      await watchlist.add({
        prompt: 'test',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      });


      const fileContent = await fs.readFile(TEST_FILE, 'utf-8');
      const entries = JSON.parse(fileContent);
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBe(1);
    });
  });

  describe('add', () => {
    it('should add prompt to watchlist', async () => {
      const entry = {
        prompt: 'What is AI?',
        model: 'mock-default',
        provider: 'mock',
        threshold: 0.3
      };

      await watchlist.add(entry);

      const entries = await watchlist.getAll();
      expect(entries.length).toBe(1);
      expect(entries[0].prompt).toBe(entry.prompt);
      expect(entries[0].model).toBe(entry.model);
      expect(entries[0].provider).toBe(entry.provider);
      expect(entries[0].threshold).toBe(entry.threshold);
    });

    it('should generate ID if not provided', async () => {
      const entry = {
        prompt: 'test',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      };

      await watchlist.add(entry);

      const entries = await watchlist.getAll();
      expect(entries[0].id).toBeDefined();
      expect(entries[0].id).toMatch(/^prompt_/);
    });

    it('should use provided ID', async () => {
      const entry = {
        id: 'custom_id',
        prompt: 'test',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      };

      await watchlist.add(entry);

      const entries = await watchlist.getAll();
      expect(entries[0].id).toBe('custom_id');
    });

    it('should add timestamps', async () => {
      const entry = {
        prompt: 'test',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      };

      await watchlist.add(entry);

      const entries = await watchlist.getAll();
      expect(entries[0].createdAt).toBeDefined();
      expect(entries[0].updatedAt).toBeDefined();
      expect(typeof entries[0].createdAt).toBe('number');
      expect(typeof entries[0].updatedAt).toBe('number');
    });

    it('should preserve existing entries', async () => {
      await watchlist.add({
        prompt: 'first',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      });

      await watchlist.add({
        prompt: 'second',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      });

      const entries = await watchlist.getAll();
      expect(entries.length).toBe(2);
    });
  });

  describe('get', () => {
    it('should retrieve specific prompt', async () => {
      const entry = {
        id: 'test_prompt_1',
        prompt: 'What is quantum computing?',
        model: 'mock-default',
        provider: 'mock',
        threshold: 0.3
      };

      await watchlist.add(entry);
      const retrieved = await watchlist.get('test_prompt_1');

      expect(retrieved.id).toBe(entry.id);
      expect(retrieved.prompt).toBe(entry.prompt);
    });

    it('should throw error if prompt not found', async () => {
      await expect(
        watchlist.get('nonexistent')
      ).rejects.toThrow('not found');
    });
  });

  describe('remove', () => {
    it('should remove prompt from watchlist', async () => {
      const entry = {
        id: 'to_remove',
        prompt: 'test',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      };

      await watchlist.add(entry);
      await watchlist.remove('to_remove');

      const entries = await watchlist.getAll();
      expect(entries.length).toBe(0);
    });

    it('should only remove specified prompt', async () => {
      await watchlist.add({
        id: 'keep',
        prompt: 'keep this',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      });

      await watchlist.add({
        id: 'remove',
        prompt: 'remove this',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      });

      await watchlist.remove('remove');

      const entries = await watchlist.getAll();
      expect(entries.length).toBe(1);
      expect(entries[0].id).toBe('keep');
    });
  });

  describe('updateBaseline', () => {
    it('should update baseline for prompt', async () => {
      const entry = {
        id: 'test_prompt',
        prompt: 'test',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      };

      await watchlist.add(entry);
      await watchlist.updateBaseline('test_prompt', 'snap_baseline_123');

      const updated = await watchlist.get('test_prompt');
      expect(updated.baselineId).toBe('snap_baseline_123');
    });

    it('should update updatedAt timestamp', async () => {
      const entry = {
        id: 'test_prompt_time',
        prompt: 'test',
        model: 'mock',
        provider: 'mock',
        threshold: 0.3
      };

      await watchlist.add(entry);
      const before = await watchlist.get('test_prompt_time');
      const beforeTime = before.updatedAt;


      await new Promise(resolve => setTimeout(resolve, 10));

      await watchlist.updateBaseline('test_prompt_time', 'snap_new');
      const after = await watchlist.get('test_prompt_time');

      expect(after.updatedAt).toBeGreaterThan(beforeTime);
    });

    it('should throw error if prompt not found', async () => {
      await expect(
        watchlist.updateBaseline('nonexistent', 'snap_123')
      ).rejects.toThrow('not found');
    });
  });

  describe('round-trip persistence', () => {
    it('should preserve all fields when saving and loading', async () => {
      const entry = {
        id: 'test_id',
        prompt: 'What is machine learning?',
        model: 'mock-quality',
        provider: 'mock',
        threshold: 0.25,
        baselineId: 'snap_baseline',
        tags: ['ml', 'ai'],
        description: 'Test prompt for ML'
      };

      await watchlist.add(entry);
      const retrieved = await watchlist.get('test_id');

      expect(retrieved.id).toBe(entry.id);
      expect(retrieved.prompt).toBe(entry.prompt);
      expect(retrieved.model).toBe(entry.model);
      expect(retrieved.provider).toBe(entry.provider);
      expect(retrieved.threshold).toBe(entry.threshold);
      expect(retrieved.baselineId).toBe(entry.baselineId);
      expect(retrieved.tags).toEqual(entry.tags);
      expect(retrieved.description).toBe(entry.description);
    });
  });
});
