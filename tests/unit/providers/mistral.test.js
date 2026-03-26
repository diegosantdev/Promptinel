import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MistralProvider } from '../../../src/providers/mistral.js';

describe('MistralProvider', () => {
  let provider;
  let originalEnv;
  let fetchMock;

  beforeEach(() => {
    originalEnv = process.env.MISTRAL_API_KEY;
    process.env.MISTRAL_API_KEY = 'test-api-key';
    provider = new MistralProvider();

    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env.MISTRAL_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      expect(provider.name).toBe('mistral');
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
      delete process.env.MISTRAL_API_KEY;
      const newProvider = new MistralProvider();
      const available = await newProvider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute prompt successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'mistral-small-latest-2407',
          choices: [
            { message: { content: 'Test response' } }
          ],
          usage: { total_tokens: 10 }
        })
      });

      const result = await provider.execute('Test prompt');

      expect(result).toMatchObject({
        output: 'Test response',
        model: 'mistral-small-latest',
        actualModel: 'mistral-small-latest-2407',
        provider: 'mistral'
      });
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('metadata');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.mistral.ai/v1/chat/completions',
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
          choices: [
            { message: { content: 'Test response' } }
          ]
        })
      });

      const result = await provider.execute('Test prompt', 'mistral-large-latest');

      expect(result.model).toBe('mistral-large-latest');
      
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.model).toBe('mistral-large-latest');
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.MISTRAL_API_KEY;
      const newProvider = new MistralProvider();

      await expect(newProvider.execute('Test prompt')).rejects.toThrow(
        'Mistral API key not found'
      );
    });

    it('should handle API errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: async () => ({
          message: 'Invalid request'
        })
      });

      await expect(provider.execute('Test prompt')).rejects.toThrow(
        'Mistral API error: Invalid request'
      );
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.execute('Test prompt')).rejects.toThrow(
        'Mistral execution failed: Network error'
      );
    });

    it('should handle empty response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
          choices: [
            { message: { content: 'Test response' } }
          ]
        })
      });

      await provider.execute('Test prompt', 'mistral-small-latest', {
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
      expect(models).toContain('mistral-large-latest');
      expect(models).toContain('mistral-small-latest');
    });
  });
});
