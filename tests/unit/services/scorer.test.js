import { describe, it, expect, vi } from 'vitest';
import { Scorer, cosineSimilarity } from '../../../src/services/scorer.js';

describe('Scorer', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4];
      const similarity = cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should return value between 0 and 1 for similar vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2, 4];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });
  });

  describe('score with LLM-as-judge', () => {
    it('should return drift score between 0 and 1', async () => {
      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockResolvedValue({
          output: '0.8',
          model: 'mock',
          provider: 'mock',
          timestamp: Date.now(),
          metadata: {}
        })
      };

      const scorer = new Scorer();
      const driftScore = await scorer.score('baseline', 'current', mockProvider);

      expect(driftScore).toBeGreaterThanOrEqual(0);
      expect(driftScore).toBeLessThanOrEqual(1);
      expect(driftScore).toBeCloseTo(0.2, 5);
    });

    it('should invoke provider with both outputs in prompt', async () => {
      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockResolvedValue({
          output: '0.5',
          model: 'mock',
          provider: 'mock',
          timestamp: Date.now(),
          metadata: {}
        })
      };

      const scorer = new Scorer();
      await scorer.score('baseline text', 'current text', mockProvider);

      expect(mockProvider.execute).toHaveBeenCalledTimes(1);
      const callArg = mockProvider.execute.mock.calls[0][0];
      expect(callArg).toContain('baseline text');
      expect(callArg).toContain('current text');
    });

    it('should return 0 for identical outputs when judge fails', async () => {
      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockRejectedValue(new Error('API error'))
      };

      const scorer = new Scorer();
      const driftScore = await scorer.score('same', 'same', mockProvider);

      expect(driftScore).toBe(0);
    });

    it('should return 1 for different outputs when judge fails', async () => {
      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockRejectedValue(new Error('API error'))
      };

      const scorer = new Scorer();
      const driftScore = await scorer.score('baseline', 'different', mockProvider);

      expect(driftScore).toBe(1);
    });

    it('should fallback to exact match when judge returns invalid score', async () => {
      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockResolvedValue({
          output: 'not a number',
          model: 'mock',
          provider: 'mock',
          timestamp: Date.now(),
          metadata: {}
        })
      };

      const scorer = new Scorer();
      const driftScore = await scorer.score('baseline', 'different', mockProvider);

      expect(driftScore).toBe(1);
    });

    it('should fallback when judge returns out of range score', async () => {
      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockResolvedValue({
          output: '1.5',
          model: 'mock',
          provider: 'mock',
          timestamp: Date.now(),
          metadata: {}
        })
      };

      const scorer = new Scorer();
      const driftScore = await scorer.score('baseline', 'current', mockProvider);

      expect(driftScore).toBe(1);
    });

    it('should convert similarity to drift score', async () => {
      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockResolvedValue({
          output: '1.0',
          model: 'mock',
          provider: 'mock',
          timestamp: Date.now(),
          metadata: {}
        })
      };

      const scorer = new Scorer();
      const driftScore = await scorer.score('baseline', 'current', mockProvider);

      expect(driftScore).toBe(0);
    });

    it('should handle whitespace in judge response', async () => {
      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockResolvedValue({
          output: '  0.75  \n',
          model: 'mock',
          provider: 'mock',
          timestamp: Date.now(),
          metadata: {}
        })
      };

      const scorer = new Scorer();
      const driftScore = await scorer.score('baseline', 'current', mockProvider);

      expect(driftScore).toBeCloseTo(0.25, 5);
    });
  });

  describe('configuration', () => {
    it('should accept configuration in constructor', () => {
      const config = { method: 'embeddings', judgeModel: 'gpt-4' };
      const scorer = new Scorer(config);

      expect(scorer.config).toEqual(config);
    });

    it('should use default configuration if not provided', () => {
      const scorer = new Scorer();

      expect(scorer.config.method).toBe('llm-judge');
    });
  });

  describe('scoreWithEmbeddings', () => {
    it('should score using embeddings when API key is available', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.1, 0.2, 0.3] }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.1, 0.2, 0.4] }]
          })
        });

      global.fetch = fetchMock;

      const scorer = new Scorer({ method: 'embeddings' });
      const driftScore = await scorer.scoreWithEmbeddings('baseline', 'current');

      expect(driftScore).toBeGreaterThanOrEqual(0);
      expect(driftScore).toBeLessThanOrEqual(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);

      process.env.OPENAI_API_KEY = originalKey;
      vi.restoreAllMocks();
    });

    it('should throw error when API key is missing', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const scorer = new Scorer({ method: 'embeddings' });

      await expect(scorer.scoreWithEmbeddings('baseline', 'current')).rejects.toThrow(
        'OpenAI API key required for embeddings'
      );

      process.env.OPENAI_API_KEY = originalKey;
    });

    it('should handle API errors', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';


      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized'
      });

      global.fetch = fetchMock;

      const scorer = new Scorer({ method: 'embeddings' });

      await expect(scorer.scoreWithEmbeddings('baseline', 'current')).rejects.toThrow(
        'OpenAI embeddings API error'
      );

      process.env.OPENAI_API_KEY = originalKey;
      vi.restoreAllMocks();
    });
  });

  describe('score with method selection', () => {
    it('should use embeddings when configured', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.1, 0.2, 0.3] }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.1, 0.2, 0.3] }]
          })
        });

      global.fetch = fetchMock;

      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn()
      };

      const scorer = new Scorer({ method: 'embeddings' });
      await scorer.score('baseline', 'current', mockProvider);


      expect(fetchMock).toHaveBeenCalled();
      expect(mockProvider.execute).not.toHaveBeenCalled();

      process.env.OPENAI_API_KEY = originalKey;
      vi.restoreAllMocks();
    });

    it('should fallback to LLM judge when embeddings fail', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      const fetchMock = vi.fn().mockRejectedValueOnce(new Error('API error'));
      global.fetch = fetchMock;

      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockResolvedValue({
          output: '0.9',
          model: 'mock',
          provider: 'mock'
        })
      };

      const scorer = new Scorer({ method: 'embeddings' });
      const driftScore = await scorer.score('baseline', 'current', mockProvider);


      expect(mockProvider.execute).toHaveBeenCalled();
      expect(driftScore).toBeCloseTo(0.1, 5);

      process.env.OPENAI_API_KEY = originalKey;
      vi.restoreAllMocks();
    });

    it('should use LLM judge by default', async () => {
      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockResolvedValue({
          output: '0.7',
          model: 'mock',
          provider: 'mock'
        })
      };

      const scorer = new Scorer({ method: 'llm-judge' });
      const driftScore = await scorer.score('baseline', 'current', mockProvider);

      expect(mockProvider.execute).toHaveBeenCalled();
      expect(driftScore).toBeCloseTo(0.3, 5);
    });

    it('should allow method override via options', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.1, 0.2, 0.3] }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.1, 0.2, 0.3] }]
          })
        });

      global.fetch = fetchMock;

      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn()
      };

      const scorer = new Scorer({ method: 'llm-judge' });
      await scorer.score('baseline', 'current', mockProvider, { method: 'embeddings' });


      expect(fetchMock).toHaveBeenCalled();
      expect(mockProvider.execute).not.toHaveBeenCalled();

      process.env.OPENAI_API_KEY = originalKey;
      vi.restoreAllMocks();
    });
  });
});


  describe('LLM judge fallback', () => {
    it('should fallback to exact match when judge fails', async () => {
      const mockProvider = {
        execute: async () => {
          throw new Error('Provider unavailable');
        }
      };

      const scorer = new Scorer();


      const score1 = await scorer.score('same text', 'same text', mockProvider);
      expect(score1).toBe(0);


      const score2 = await scorer.score('text A', 'text B', mockProvider);
      expect(score2).toBe(1);
    });

    it('should fallback when judge returns invalid score', async () => {
      const mockProvider = {
        execute: async () => ({
          output: 'not a valid number',
          model: 'mock',
          provider: 'mock'
        })
      };

      const scorer = new Scorer();
      const score = await scorer.score('baseline', 'current', mockProvider);

      expect(score).toBe(1);
    });

    it('should fallback when judge returns out of range score', async () => {
      const mockProvider = {
        execute: async () => ({
          output: '2.5',
          model: 'mock',
          provider: 'mock'
        })
      };

      const scorer = new Scorer();
      const score = await scorer.score('baseline', 'current', mockProvider);

      expect(score).toBe(1);
    });
  });


  describe('embeddings fallback', () => {
    it('should fallback to LLM judge when embeddings fail', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-key';

      global.fetch = vi.fn().mockRejectedValue(new Error('API error'));

      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockResolvedValue({
          output: '0.7',
          model: 'mock',
          provider: 'mock'
        })
      };

      const scorer = new Scorer({ method: 'embeddings' });
      const score = await scorer.score('baseline', 'current', mockProvider);

      expect(mockProvider.execute).toHaveBeenCalled();
      expect(score).toBeCloseTo(0.3, 5);

      process.env.OPENAI_API_KEY = originalKey;
    });

    it('should fallback when API key is missing', async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const mockProvider = {
        listModels: vi.fn().mockResolvedValue(["mock"]), execute: vi.fn().mockResolvedValue({
          output: '0.8',
          model: 'mock',
          provider: 'mock'
        })
      };

      const scorer = new Scorer({ method: 'embeddings' });
      const score = await scorer.score('baseline', 'current', mockProvider);

      expect(mockProvider.execute).toHaveBeenCalled();
      expect(score).toBeCloseTo(0.2, 5);

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });
  });
