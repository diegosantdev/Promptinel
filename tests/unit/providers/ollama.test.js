import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from '../../../src/providers/ollama.js';

describe('OllamaProvider', () => {
  let provider;
  let originalFetch;

  beforeEach(() => {
    provider = new OllamaProvider();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(provider.name).toBe('ollama');
      expect(provider.baseUrl).toBe('http://localhost:11434');
    });

    it('should use OLLAMA_BASE_URL environment variable if set', () => {
      const customUrl = 'http://custom:8080';
      process.env.OLLAMA_BASE_URL = customUrl;
      const customProvider = new OllamaProvider();
      expect(customProvider.baseUrl).toBe(customUrl);
      delete process.env.OLLAMA_BASE_URL;
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is running', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] })
      });

      const available = await provider.isAvailable();
      expect(available).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should return false when Ollama is not running', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    it('should return false when API returns error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });

    it('should timeout after 3 seconds', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      const available = await provider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute prompt and return response', async () => {
      const mockResponse = {
        model: 'llama3:latest',
        response: 'This is a test response',
        eval_count: 42
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.execute('Test prompt', 'llama3');

      expect(result).toMatchObject({
        output: 'This is a test response',
        model: 'llama3',
        actualModel: 'llama3:latest',
        provider: 'ollama',
        metadata: {
          tokens: 42
        }
      });
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.metadata.latency).toBeGreaterThanOrEqual(0);
    });

    it('should send correct request to Ollama API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'test', eval_count: 10 })
      });

      await provider.execute('Test prompt', 'llama3', {
        temperature: 0.5,
        maxTokens: 100
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3',
            prompt: 'Test prompt',
            stream: false,
            options: {
              temperature: 0.5,
              num_predict: 100
            }
          })
        }
      );
    });

    it('should handle missing eval_count gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'test' })
      });

      const result = await provider.execute('Test', 'llama3');
      expect(result.metadata.tokens).toBe(0);
    });

    it('should throw descriptive error when Ollama is not running', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        Object.assign(new Error('fetch failed'), { name: 'TypeError' })
      );

      await expect(provider.execute('Test', 'llama3')).rejects.toThrow(
        /Cannot connect to Ollama.*Please ensure Ollama is running/
      );
    });

    it('should throw error when API returns error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Model not found'
      });

      await expect(provider.execute('Test', 'invalid-model')).rejects.toThrow(
        /Ollama API error \(404\)/
      );
    });

    it('should propagate other errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(provider.execute('Test', 'llama3')).rejects.toThrow('Network error');
    });
  });

  describe('listModels', () => {
    it('should return list of available models', async () => {
      const mockModels = {
        models: [
          { name: 'llama3:latest' },
          { name: 'mistral:7b' },
          { name: 'codellama:13b' }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockModels
      });

      const models = await provider.listModels();
      expect(models).toEqual(['llama3:latest', 'mistral:7b', 'codellama:13b']);
    });

    it('should return empty array when no models installed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] })
      });

      const models = await provider.listModels();
      expect(models).toEqual([]);
    });

    it('should handle missing models field', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      const models = await provider.listModels();
      expect(models).toEqual([]);
    });

    it('should throw descriptive error when Ollama is not running', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        Object.assign(new Error('fetch failed'), { name: 'TypeError' })
      );

      await expect(provider.listModels()).rejects.toThrow(
        /Cannot connect to Ollama.*Please ensure Ollama is running/
      );
    });

    it('should throw error when API returns error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(provider.listModels()).rejects.toThrow(
        /Failed to list Ollama models/
      );
    });
  });

  describe('integration scenarios', () => {
    it('should work with custom base URL', async () => {
      const customProvider = new OllamaProvider();
      customProvider.baseUrl = 'http://custom-host:8080';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'test', eval_count: 5 })
      });

      await customProvider.execute('Test', 'llama3');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://custom-host:8080/api/generate',
        expect.any(Object)
      );
    });

    it('should handle execution without options', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ response: 'test', eval_count: 5 })
      });

      const result = await provider.execute('Test', 'llama3');
      expect(result.output).toBe('test');
    });
  });
});


  describe('connection errors', () => {
    it('should show clear error message when Ollama is not running', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'));

      const provider = new OllamaProvider();

      await expect(provider.execute('test prompt')).rejects.toThrow();
    });

    it('should handle network timeout gracefully', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      const provider = new OllamaProvider();

      await expect(provider.execute('test prompt')).rejects.toThrow();
    });
  });
