import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CLI } from '../../../src/cli.js';

describe('CLI cleanup command', () => {
  let cli;
  let mockWatchlist;
  let mockStorage;
  let mockConfig;

  beforeEach(() => {
    cli = new CLI();
    
    mockWatchlist = {
      getAll: vi.fn()
    };
    cli.watchlist = mockWatchlist;
    
    mockStorage = {
      deleteOldSnapshots: vi.fn()
    };
    cli.storage = mockStorage;
    
    mockConfig = {
      getRetentionPolicy: vi.fn()
    };
    cli.config = mockConfig;
    

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should delete old snapshots using retention policy from config', async () => {
    mockWatchlist.getAll.mockResolvedValue([
      { id: 'prompt1', baselineId: 'snap1' },
      { id: 'prompt2', baselineId: null }
    ]);
    
    mockConfig.getRetentionPolicy.mockReturnValue({
      maxAgeDays: 30,
      preserveBaselines: true
    });
    
    mockStorage.deleteOldSnapshots
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);

    await cli.cleanup({});

    expect(mockStorage.deleteOldSnapshots).toHaveBeenCalledTimes(2);
    expect(mockStorage.deleteOldSnapshots).toHaveBeenCalledWith(
      'prompt1',
      { type: 'keep-days-n', value: 30 },
      'snap1'
    );
    expect(mockStorage.deleteOldSnapshots).toHaveBeenCalledWith(
      'prompt2',
      { type: 'keep-days-n', value: 30 },
      null
    );
  });

  it('should use --keep-last option when provided', async () => {
    mockWatchlist.getAll.mockResolvedValue([
      { id: 'prompt1', baselineId: null }
    ]);
    
    mockConfig.getRetentionPolicy.mockReturnValue({
      maxAgeDays: 30
    });
    
    mockStorage.deleteOldSnapshots.mockResolvedValue(2);

    await cli.cleanup({ keepLast: '10' });

    expect(mockStorage.deleteOldSnapshots).toHaveBeenCalledWith(
      'prompt1',
      { type: 'keep-last-n', value: 10 },
      null
    );
  });

  it('should use --keep-days option when provided', async () => {
    mockWatchlist.getAll.mockResolvedValue([
      { id: 'prompt1', baselineId: null }
    ]);
    
    mockConfig.getRetentionPolicy.mockReturnValue({
      maxAgeDays: 30
    });
    
    mockStorage.deleteOldSnapshots.mockResolvedValue(4);

    await cli.cleanup({ keepDays: '7' });

    expect(mockStorage.deleteOldSnapshots).toHaveBeenCalledWith(
      'prompt1',
      { type: 'keep-days-n', value: 7 },
      null
    );
  });

  it('should preserve baseline snapshots', async () => {
    mockWatchlist.getAll.mockResolvedValue([
      { id: 'prompt1', baselineId: 'baseline-snap-123' }
    ]);
    
    mockConfig.getRetentionPolicy.mockReturnValue({
      maxAgeDays: 30,
      preserveBaselines: true
    });
    
    mockStorage.deleteOldSnapshots.mockResolvedValue(3);

    await cli.cleanup({});


    expect(mockStorage.deleteOldSnapshots).toHaveBeenCalledWith(
      'prompt1',
      expect.any(Object),
      'baseline-snap-123'
    );
  });

  it('should display count of deleted snapshots', async () => {
    mockWatchlist.getAll.mockResolvedValue([
      { id: 'prompt1', baselineId: null },
      { id: 'prompt2', baselineId: null }
    ]);
    
    mockConfig.getRetentionPolicy.mockReturnValue({
      maxAgeDays: 30
    });
    
    mockStorage.deleteOldSnapshots
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);

    await cli.cleanup({});

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Deleted 8 snapshot(s) total')
    );
  });

  it('should handle empty watchlist', async () => {
    mockWatchlist.getAll.mockResolvedValue([]);

    await cli.cleanup({});

    expect(mockStorage.deleteOldSnapshots).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('No prompts in watchlist')
    );
  });

  it('should handle no snapshots to delete', async () => {
    mockWatchlist.getAll.mockResolvedValue([
      { id: 'prompt1', baselineId: null }
    ]);
    
    mockConfig.getRetentionPolicy.mockReturnValue({
      maxAgeDays: 30
    });
    
    mockStorage.deleteOldSnapshots.mockResolvedValue(0);

    await cli.cleanup({});

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('No snapshots to delete')
    );
  });

  it('should handle errors gracefully', async () => {
    mockWatchlist.getAll.mockRejectedValue(new Error('Watchlist error'));

    await expect(cli.cleanup({})).rejects.toThrow('Watchlist error');
    
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Watchlist error')
    );
  });

  it('should use maxSnapshots from config when maxAgeDays not set', async () => {
    mockWatchlist.getAll.mockResolvedValue([
      { id: 'prompt1', baselineId: null }
    ]);
    
    mockConfig.getRetentionPolicy.mockReturnValue({
      maxSnapshots: 50,
      preserveBaselines: true
    });
    
    mockStorage.deleteOldSnapshots.mockResolvedValue(2);

    await cli.cleanup({});

    expect(mockStorage.deleteOldSnapshots).toHaveBeenCalledWith(
      'prompt1',
      { type: 'keep-last-n', value: 50 },
      null
    );
  });

  it('should display per-prompt deletion counts', async () => {
    mockWatchlist.getAll.mockResolvedValue([
      { id: 'prompt1', baselineId: null },
      { id: 'prompt2', baselineId: null }
    ]);
    
    mockConfig.getRetentionPolicy.mockReturnValue({
      maxAgeDays: 30
    });
    
    mockStorage.deleteOldSnapshots
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0);

    await cli.cleanup({});

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('prompt1: Deleted 5 snapshot(s)')
    );
  });
});
