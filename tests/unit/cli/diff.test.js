import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLI } from '../../../src/cli.js';

describe('CLI - diff command', () => {
  let cli;
  let consoleLogSpy;
  let consoleErrorSpy;

  const mockSnapshot1 = {
    id: 'snap-1',
    promptId: 'test-prompt',
    prompt: 'What is AI?',
    output: 'AI is artificial intelligence.',
    model: 'mock-default',
    provider: 'mock',
    timestamp: 1700000000000,
    metadata: {}
  };

  const mockSnapshot2 = {
    id: 'snap-2',
    promptId: 'test-prompt',
    prompt: 'What is AI?',
    output: 'AI stands for artificial intelligence.',
    model: 'mock-default',
    provider: 'mock',
    timestamp: 1700001000000,
    metadata: {}
  };

  beforeEach(() => {
    cli = new CLI();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('text format (default)', () => {
    it('should display comparison of two snapshots', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockResolvedValue([
        { id: 'test-prompt', prompt: 'What is AI?', provider: 'mock', model: 'mock-default', threshold: 0.3 }
      ]);
      vi.spyOn(cli.storage, 'getSnapshots').mockResolvedValue([mockSnapshot1, mockSnapshot2]);
      vi.spyOn(cli.scorer, 'score').mockResolvedValue(0.25);

      await cli.diff('snap-1', 'snap-2');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('SNAPSHOT COMPARISON'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('snap-1'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('snap-2'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0.250'));
    });

    it('should show IDENTICAL status for zero drift', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockResolvedValue([
        { id: 'test-prompt', prompt: 'What is AI?', provider: 'mock', model: 'mock-default', threshold: 0.3 }
      ]);
      vi.spyOn(cli.storage, 'getSnapshots').mockResolvedValue([mockSnapshot1, mockSnapshot1]);
      vi.spyOn(cli.scorer, 'score').mockResolvedValue(0);

      await cli.diff('snap-1', 'snap-1');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('IDENTICAL'));
    });

    it('should show STABLE status for low drift', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockResolvedValue([
        { id: 'test-prompt', prompt: 'What is AI?', provider: 'mock', model: 'mock-default', threshold: 0.3 }
      ]);
      vi.spyOn(cli.storage, 'getSnapshots').mockResolvedValue([mockSnapshot1, mockSnapshot2]);
      vi.spyOn(cli.scorer, 'score').mockResolvedValue(0.1);

      await cli.diff('snap-1', 'snap-2');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('STABLE'));
    });

    it('should show WARNING status for moderate drift', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockResolvedValue([
        { id: 'test-prompt', prompt: 'What is AI?', provider: 'mock', model: 'mock-default', threshold: 0.3 }
      ]);
      vi.spyOn(cli.storage, 'getSnapshots').mockResolvedValue([mockSnapshot1, mockSnapshot2]);
      vi.spyOn(cli.scorer, 'score').mockResolvedValue(0.25);

      await cli.diff('snap-1', 'snap-2');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('WARNING'));
    });

    it('should show DRIFTED status for high drift', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockResolvedValue([
        { id: 'test-prompt', prompt: 'What is AI?', provider: 'mock', model: 'mock-default', threshold: 0.3 }
      ]);
      vi.spyOn(cli.storage, 'getSnapshots').mockResolvedValue([mockSnapshot1, mockSnapshot2]);
      vi.spyOn(cli.scorer, 'score').mockResolvedValue(0.5);

      await cli.diff('snap-1', 'snap-2');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DRIFTED'));
    });

    it('should display side-by-side output comparison', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockResolvedValue([
        { id: 'test-prompt', prompt: 'What is AI?', provider: 'mock', model: 'mock-default', threshold: 0.3 }
      ]);
      vi.spyOn(cli.storage, 'getSnapshots').mockResolvedValue([mockSnapshot1, mockSnapshot2]);
      vi.spyOn(cli.scorer, 'score').mockResolvedValue(0.25);

      await cli.diff('snap-1', 'snap-2');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('OUTPUT COMPARISON'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('SNAPSHOT 1'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('SNAPSHOT 2'));
    });
  });

  describe('JSON format', () => {
    it('should output JSON when format is json', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockResolvedValue([
        { id: 'test-prompt', prompt: 'What is AI?', provider: 'mock', model: 'mock-default', threshold: 0.3 }
      ]);
      vi.spyOn(cli.storage, 'getSnapshots').mockResolvedValue([mockSnapshot1, mockSnapshot2]);
      vi.spyOn(cli.scorer, 'score').mockResolvedValue(0.25);

      await cli.diff('snap-1', 'snap-2', { format: 'json' });

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);

      expect(parsed).toHaveProperty('snapshot1');
      expect(parsed).toHaveProperty('snapshot2');
      expect(parsed).toHaveProperty('driftScore');
      expect(parsed.driftScore).toBe(0.25);
      expect(parsed.snapshot1.id).toBe('snap-1');
      expect(parsed.snapshot2.id).toBe('snap-2');
    });

    it('should include comparison metadata in JSON', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockResolvedValue([
        { id: 'test-prompt', prompt: 'What is AI?', provider: 'mock', model: 'mock-default', threshold: 0.3 }
      ]);
      vi.spyOn(cli.storage, 'getSnapshots').mockResolvedValue([mockSnapshot1, mockSnapshot2]);
      vi.spyOn(cli.scorer, 'score').mockResolvedValue(0.25);

      await cli.diff('snap-1', 'snap-2', { format: 'json' });

      const jsonOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.comparison).toEqual({
        identical: false,
        similar: true,
        different: false
      });
    });
  });

  describe('error handling', () => {
    it('should error when first snapshot not found', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockResolvedValue([
        { id: 'test-prompt', prompt: 'What is AI?', provider: 'mock', model: 'mock-default', threshold: 0.3 }
      ]);
      vi.spyOn(cli.storage, 'getSnapshots').mockResolvedValue([]);

      await expect(cli.diff('snap-1', 'snap-2')).rejects.toThrow('snap-1 not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('snap-1 not found'));
    });

    it('should error when second snapshot not found', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockResolvedValue([
        { id: 'test-prompt', prompt: 'What is AI?', provider: 'mock', model: 'mock-default', threshold: 0.3 }
      ]);
      vi.spyOn(cli.storage, 'getSnapshots').mockResolvedValue([mockSnapshot1]);

      await expect(cli.diff('snap-1', 'snap-2')).rejects.toThrow('snap-2 not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('snap-2 not found'));
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(cli.watchlist, 'getAll').mockRejectedValue(new Error('Database error'));

      await expect(cli.diff('snap-1', 'snap-2')).rejects.toThrow('Database error');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Database error'));
    });
  });

  describe('helper methods', () => {
    it('should wrap text correctly', () => {
      const text = 'This is a long line that should be wrapped at the specified width';
      const lines = cli.wrapText(text, 20);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(line.length).toBeLessThanOrEqual(20);
      });
    });

    it('should handle empty text', () => {
      const lines = cli.wrapText('', 20);
      expect(lines).toEqual(['']);
    });

    it('should preserve line breaks', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const lines = cli.wrapText(text, 50);
      expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
    });

    it('should pad text to specified width', () => {
      expect(cli.pad('test', 10)).toBe('test      ');
      expect(cli.pad('test', 4)).toBe('test');
      expect(cli.pad('toolong', 4)).toBe('tool');
    });
  });
});
