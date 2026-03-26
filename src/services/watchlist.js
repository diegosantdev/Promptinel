import { promises as fs } from 'fs';
import path from 'path';
import { assertSafePathSegment } from '../utils/safePath.js';
import { Logger } from './logger.js';

export function generatePromptId() {
  return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export class Watchlist {
  constructor(filePath = '.promptinel/watchlist.json') {
    this.filePath = filePath;
    this.logger = new Logger();
  }

  async add(entry) {
    const entries = await this.getAll();
    const id = entry.id || generatePromptId();
    assertSafePathSegment(id, 'promptId');
    entries.push({
      ...entry,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    await this.save(entries);
  }

  async get(promptId) {
    assertSafePathSegment(promptId, 'promptId');
    const entries = await this.getAll();
    const entry = entries.find(e => e.id === promptId);
    if (!entry) {
      throw new Error(`Prompt ${promptId} not found in watchlist`);
    }
    return entry;
  }

  async getAll() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const entries = JSON.parse(data);
      
      if (!Array.isArray(entries)) {
        this.logger.warn('Watchlist file is not an array, returning empty array');
        return [];
      }
      
      return entries;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      if (error instanceof SyntaxError) {
        this.logger.warn('Watchlist file contains invalid JSON, returning empty array');
        return [];
      }
      throw error;
    }
  }

  async remove(promptId) {
    assertSafePathSegment(promptId, 'promptId');
    const entries = await this.getAll();
    const filtered = entries.filter(e => e.id !== promptId);
    await this.save(filtered);
  }

  async updateBaseline(promptId, snapshotId) {
    assertSafePathSegment(promptId, 'promptId');
    assertSafePathSegment(snapshotId, 'snapshotId');
    const entries = await this.getAll();
    const entry = entries.find(e => e.id === promptId);
    if (!entry) {
      throw new Error(`Prompt ${promptId} not found`);
    }
    entry.baselineId = snapshotId;
    entry.updatedAt = Date.now();
    await this.save(entries);
  }

  async search(searchTerm) {
    const entries = await this.getAll();
    const term = searchTerm.toLowerCase();
    
    return entries.filter(entry => {
      if (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(term))) {
        return true;
      }
      
      if (entry.description && entry.description.toLowerCase().includes(term)) {
        return true;
      }
      
      if (entry.prompt.toLowerCase().includes(term)) {
        return true;
      }
      
      return false;
    });
  }

  async save(entries) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(entries, null, 2));
  }
}
