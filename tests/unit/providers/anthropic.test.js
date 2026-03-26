import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AnthropicProvider } from '../../../src/providers/anthropic.js';

describe('AnthropicProvider', () => {
  let provider;
  let originalEnv;
  let fetchMock;

  beforeEach(() => {
    originalEnv = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    provider = new AnthropicProvider();

    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      expect(provider.name).toBe('anthropic');
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
      delete process.env.ANTHROPIC_API_KEY;
      const newProvider = new AnthropicProvider();
      const available = await newProvider.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute prompt successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'claude-3-5-haiku-20241022',
          content: [
            { text: 'Test response' }
          ],
          usage: { input_tokens: 5, output_tokens: 5 }
        })
      });

      const result = await provider.execute('Test prompt');

      expect(result).toMatchObject({
        output: 'Test response',
        model: 'claude-3-5-haiku-20241022',
        actualModel: 'claude-3-5-haiku-20241022',
        provider: 'anthropic'
      });
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('metadata');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01'
          })
        })
      );
    });

    it('should use custom model when specified', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            { text: 'Test response' }
          ]
        })
      });

      const result = await provider.execute('Test prompt', 'claude-3-opus-20240229');

      expect(result.model).toBe('claude-3-opus-20240229');
      
      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.model).toBe('claude-3-opus-20240229');
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const newProvider = new AnthropicProvider();

      await expect(newProvider.execute('Test prompt')).rejects.toThrow(
        'Anthropic API key not found'
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
        'Anthropic API error: Invalid request'
      );
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.execute('Test prompt')).rejects.toThrow(
        'Anthropic execution failed: Network error'
      );
    });

    it('should handle empty response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: []
        })
      });

      const result = await provider.execute('Test prompt');
      expect(result.output).toBe('');
    });

    it('should pass temperature and maxTokens options', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            { text: 'Test response' }
          ]
        })
      });

      await provider.execute('Test prompt', 'claude-3-sonnet-20240229', {
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
      expect(models).toContain('claude-3-opus-20240229');
      expect(models).toContain('claude-3-sonnet-20240229');
    });
  });
});
