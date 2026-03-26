import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Storage, generateSnapshotId } from '../../../src/services/storage.js';
import { promises as fs } from 'fs';
import path from 'path';

const TEST_DIR = '.promptinel-test/snapshots-test';

describe('Storage', () => {
  let storage;

  beforeEach(async () => {
    storage = new Storage(TEST_DIR);
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (error) {
    }
  });

  describe('generateSnapshotId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateSnapshotId();
      const id2 = generateSnapshotId();
      expect(id1).not.toBe(id2);
    });

    it('should start with snap_', () => {
      const id = generateSnapshotId();
      expect(id).toMatch(/^snap_/);
    });
  });

  describe('saveSnapshot', () => {
    it('should save snapshot to correct directory', async () => {
      const snapshot = {
        id: 'snap_test_123',
        promptId: 'prompt_1',
        prompt: 'test prompt',
        output: 'test output',
        model: 'mock-default',
        provider: 'mock',
        timestamp: Date.now(),
        metadata: {}
      };

      await storage.saveSnapshot(snapshot);

      const dir = path.join(TEST_DIR, snapshot.promptId);
      const files = await fs.readdir(dir);
      expect(files.length).toBe(1);
      expect(files[0]).toContain(snapshot.id);
    });

    it('should create directory if it does not exist', async () => {
      const snapshot = {
        id: 'snap_test_456',
        promptId: 'prompt_new',
        prompt: 'test',
        output: 'output',
        model: 'mock',
        provider: 'mock',
        timestamp: Date.now(),
        metadata: {}
      };

      await storage.saveSnapshot(snapshot);

      const dir = path.join(TEST_DIR, snapshot.promptId);
      const stats = await fs.stat(dir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve saved snapshot', async () => {
      const snapshot = {
        id: 'snap_test_789',
        promptId: 'prompt_2',
        prompt: 'test prompt',
        output: 'test output',
        model: 'mock-default',
        provider: 'mock',
        timestamp: Date.now(),
        metadata: { tokens: 10 }
      };

      await storage.saveSnapshot(snapshot);
      const retrieved = await storage.getSnapshot(snapshot.promptId, snapshot.id);

      expect(retrieved.id).toBe(snapshot.id);
      expect(retrieved.prompt).toBe(snapshot.prompt);
      expect(retrieved.output).toBe(snapshot.output);
    });

    it('should throw error if snapshot not found', async () => {
      await expect(
        storage.getSnapshot('nonexistent', 'snap_fake')
      ).rejects.toThrow('not found');
    });
  });

  describe('getSnapshots', () => {
    it('should return empty array if no snapshots exist', async () => {
      const snapshots = await storage.getSnapshots('nonexistent');
      expect(snapshots).toEqual([]);
    });

    it('should return all snapshots for a prompt', async () => {
      const promptId = 'prompt_3';
      const snapshot1 = {
        id: 'snap_1',
        promptId,
        prompt: 'test',
        output: 'output1',
        model: 'mock',
        provider: 'mock',
        timestamp: Date.now() - 1000,
        metadata: {}
      };
      const snapshot2 = {
        id: 'snap_2',
        promptId,
        prompt: 'test',
        output: 'output2',
        model: 'mock',
        provider: 'mock',
        timestamp: Date.now(),
        metadata: {}
      };

      await storage.saveSnapshot(snapshot1);
      await storage.saveSnapshot(snapshot2);

      const snapshots = await storage.getSnapshots(promptId);
      expect(snapshots.length).toBe(2);
    });

    it('should sort snapshots by timestamp descending', async () => {
      const promptId = 'prompt_4';
      const older = {
        id: 'snap_older',
        promptId,
        prompt: 'test',
        output: 'old',
        model: 'mock',
        provider: 'mock',
        timestamp: Date.now() - 2000,
        metadata: {}
      };
      const newer = {
        id: 'snap_newer',
        promptId,
        prompt: 'test',
        output: 'new',
        model: 'mock',
        provider: 'mock',
        timestamp: Date.now(),
        metadata: {}
      };

      await storage.saveSnapshot(older);
      await storage.saveSnapshot(newer);

      const snapshots = await storage.getSnapshots(promptId);
      expect(snapshots[0].id).toBe(newer.id);
      expect(snapshots[1].id).toBe(older.id);
    });

    it('should limit results when limit is provided', async () => {
      const promptId = 'prompt_5';
      
      for (let i = 0; i < 5; i++) {
        await storage.saveSnapshot({
          id: `snap_${i}`,
          promptId,
          prompt: 'test',
          output: `output${i}`,
          model: 'mock',
          provider: 'mock',
          timestamp: Date.now() + i,
          metadata: {}
        });
      }

      const snapshots = await storage.getSnapshots(promptId, 3);
      expect(snapshots.length).toBe(3);
    });

    it('should skip corrupted files and continue', async () => {
      const promptId = 'prompt_6';
      const validSnapshot = {
        id: 'snap_valid',
        promptId,
        prompt: 'test',
        output: 'output',
        model: 'mock',
        provider: 'mock',
        timestamp: Date.now(),
        metadata: {}
      };

      await storage.saveSnapshot(validSnapshot);


      const dir = path.join(TEST_DIR, promptId);
      await fs.writeFile(path.join(dir, 'corrupted.json'), 'invalid json{');

      const snapshots = await storage.getSnapshots(promptId);
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].id).toBe(validSnapshot.id);
    });
  });

  describe('deleteOldSnapshots', () => {
    it('should not delete anything with keep-all policy', async () => {
      const promptId = 'prompt_7';
      await storage.saveSnapshot({
        id: 'snap_1',
        promptId,
        prompt: 'test',
        output: 'output',
        model: 'mock',
        provider: 'mock',
        timestamp: Date.now() - 100000,
        metadata: {}
      });

      const deleted = await storage.deleteOldSnapshots(promptId, { type: 'keep-all' });
      expect(deleted).toBe(0);

      const snapshots = await storage.getSnapshots(promptId);
      expect(snapshots.length).toBe(1);
    });

    it('should delete old snapshots with keep-last-n policy', async () => {
      const promptId = 'prompt_8';
      

      for (let i = 0; i < 5; i++) {
        await storage.saveSnapshot({
          id: `snap_${i}`,
          promptId,
          prompt: 'test',
          output: `output${i}`,
          model: 'mock',
          provider: 'mock',
          timestamp: Date.now() + (i * 1000),
          metadata: {}
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const deleted = await storage.deleteOldSnapshots(promptId, { type: 'keep-last-n', value: 2 });
      expect(deleted).toBe(3);

      const remaining = await storage.getSnapshots(promptId);
      expect(remaining.length).toBe(2);
    });

    it('should delete old snapshots with keep-days-n policy', async () => {
      const promptId = 'prompt_9';
      const oldTimestamp = Date.now() - (40 * 24 * 60 * 60 * 1000);
      const recentTimestamp = Date.now() - (10 * 24 * 60 * 60 * 1000);

      await storage.saveSnapshot({
        id: 'snap_old',
        promptId,
        prompt: 'test',
        output: 'old',
        model: 'mock',
        provider: 'mock',
        timestamp: oldTimestamp,
        metadata: {}
      });

      await storage.saveSnapshot({
        id: 'snap_recent',
        promptId,
        prompt: 'test',
        output: 'recent',
        model: 'mock',
        provider: 'mock',
        timestamp: recentTimestamp,
        metadata: {}
      });

      const deleted = await storage.deleteOldSnapshots(promptId, { type: 'keep-days-n', value: 30 });
      expect(deleted).toBe(1);

      const remaining = await storage.getSnapshots(promptId);
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('snap_recent');
    });

    it('should preserve baseline snapshot', async () => {
      const promptId = 'prompt_10';
      const baselineId = 'snap_baseline';

      await storage.saveSnapshot({
        id: baselineId,
        promptId,
        prompt: 'test',
        output: 'baseline',
        model: 'mock',
        provider: 'mock',
        timestamp: Date.now() - 100000,
        metadata: {}
      });


      await new Promise(resolve => setTimeout(resolve, 10));

      await storage.saveSnapshot({
        id: 'snap_new',
        promptId,
        prompt: 'test',
        output: 'new',
        model: 'mock',
        provider: 'mock',
        timestamp: Date.now(),
        metadata: {}
      });

      await storage.deleteOldSnapshots(
        promptId,
        { type: 'keep-last-n', value: 1 },
        baselineId
      );

      const remaining = await storage.getSnapshots(promptId);
      expect(remaining.length).toBe(2);
      expect(remaining.some(s => s.id === baselineId)).toBe(true);
    });
  });
});
