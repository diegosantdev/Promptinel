import { promises as fs } from 'fs';
import path from 'path';
import { assertSafePathSegment, safeJoin } from '../utils/safePath.js';
import { Logger } from './logger.js';

export function generateSnapshotId() {
  return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class Storage {
  constructor(baseDir = '.promptinel/snapshots') {
    this.baseDir = baseDir;
    this.logger = new Logger();
  }

  async saveSnapshot(snapshot) {
    assertSafePathSegment(snapshot.promptId, 'promptId');
    assertSafePathSegment(snapshot.id, 'snapshotId');
    const dir = safeJoin(this.baseDir, snapshot.promptId, 'promptId');
    await fs.mkdir(dir, { recursive: true });

    const filename = `${snapshot.timestamp}_${snapshot.id}.json`;
    const filepath = path.join(dir, filename);

    await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2));
  }

  async getSnapshot(promptId, snapshotId) {
    assertSafePathSegment(promptId, 'promptId');
    assertSafePathSegment(snapshotId, 'snapshotId');
    const dir = safeJoin(this.baseDir, promptId, 'promptId');
    
    try {
      const files = await fs.readdir(dir);
      const file = files.find(f => f.includes(snapshotId));
      
      if (!file) {
        throw new Error(`Snapshot ${snapshotId} not found`);
      }

      const data = await fs.readFile(path.join(dir, file), 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Snapshot ${snapshotId} not found for prompt ${promptId}`);
      }
      throw error;
    }
  }

  async getSnapshots(promptId, limit) {
    assertSafePathSegment(promptId, 'promptId');
    const dir = safeJoin(this.baseDir, promptId, 'promptId');

    try {
      const files = await fs.readdir(dir);
      const snapshots = [];

      for (const file of files) {
        try {
          const data = await fs.readFile(path.join(dir, file), 'utf-8');
          const snapshot = JSON.parse(data);
          
          if (snapshot.id && snapshot.promptId && snapshot.timestamp) {
            snapshots.push(snapshot);
          } else {
            this.logger.warn(`Skipping invalid snapshot file: ${file}`);
          }
        } catch (parseError) {
          this.logger.error(`Corrupted snapshot file ${file}: ${parseError.message}`);
        }
      }

      snapshots.sort((a, b) => b.timestamp - a.timestamp);

      return limit ? snapshots.slice(0, limit) : snapshots;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async deleteOldSnapshots(promptId, policy, baselineId) {
    assertSafePathSegment(promptId, 'promptId');
    if (baselineId) {
      assertSafePathSegment(baselineId, 'baselineId');
    }
    const snapshots = await this.getSnapshots(promptId);
    let toDelete = [];

    switch (policy.type) {
      case 'keep-all':
        return 0;

      case 'keep-last-n':
        toDelete = snapshots.slice(policy.value || 10);
        break;

      case 'keep-days-n': {
        const cutoff = Date.now() - (policy.value || 30) * 24 * 60 * 60 * 1000;
        toDelete = snapshots.filter(s => s.timestamp < cutoff);
        break;
      }
    }

    if (baselineId) {
      toDelete = toDelete.filter(s => s.id !== baselineId);
    }

    for (const snapshot of toDelete) {
      const dir = safeJoin(this.baseDir, promptId, 'promptId');
      const files = await fs.readdir(dir);
      const file = files.find(f => f.includes(snapshot.id));
      if (file) {
        await fs.unlink(path.join(dir, file));
      }
    }

    return toDelete.length;
  }
}
