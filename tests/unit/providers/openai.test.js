import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpenAIProvider } from '../../../src/providers/openai.js';

describe('OpenAIProvider', () => {
  let provider;
  let originalEnv;
  let fetchMock;

  beforeEach(() => {
    originalEnv = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-api-key';
    provider = new OpenAIProvider();

    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      expect(provider.name).toBe('openai');
    });

    it('should read API key from environment', () => {
      expect(provider.apiKey).toBe('test-api-key');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API key is present', async () => {
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      const newProvider = new OpenAIProvider();
      const available = await newProvider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute prompt successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'gpt-4o-mini-2024-07-18',
          system_fingerprint: 'fp_123',
          choices: [
            { message: { content: 'Test response' } }
          ],
          usage: { total_tokens: 10 }
        })
      });

      const result = await provider.execute('Test prompt');

      expect(result).toMatchObject({
        output: 'Test response',
        model: 'gpt-4o-mini',
        actualModel: 'gpt-4o-mini-2024-07-18',
        provider: 'openai'
      });
      expect(result.metadata.systemFingerprint).toBe('fp_123');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('metadata');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });

    it('should use custom model when specified', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'gpt-4',
          choices: [
            { message: { content: 'Test response' } }
          ]
        })
      });

      const result = await provider.execute('Test prompt', 'gpt-4');

      expect(result.model).toBe('gpt-4');
      
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.model).toBe('gpt-4');
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      const newProvider = new OpenAIProvider();

      await expect(newProvider.execute('Test prompt')).rejects.toThrow(
        'OpenAI API key not found'
      );
    });

    it('should handle API errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({
          error: { message: 'Invalid request' }
        })
      });

      await expect(provider.execute('Test prompt')).rejects.toThrow(
        'OpenAI API error: Invalid request'
      );
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.execute('Test prompt')).rejects.toThrow(
        'OpenAI execution failed: Network error'
      );
    });

    it('should handle empty response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'gpt-4o-mini',
          choices: []
        })
      });

      const result = await provider.execute('Test prompt');
      expect(result.output).toBe('');
    });

    it('should pass temperature and maxTokens options', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'gpt-4',
          choices: [
            { message: { content: 'Test response' } }
          ]
        })
      });

      await provider.execute('Test prompt', 'gpt-4', {
        temperature: 0.5,
        maxTokens: 500
      });

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.temperature).toBe(0.5);
      expect(callBody.max_tokens).toBe(500);
    });
  });

  describe('listModels', () => {
    it('should return list of supported models', async () => {
      const models = await provider.listModels();

      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-3.5-turbo');
    });
  });
});
