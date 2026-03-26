import { describe, it, expect } from 'vitest';
import { MockProvider, simpleHash, generateMockResponse } from '../../../src/providers/mock.js';

describe('MockProvider', () => {
  describe('simpleHash', () => {
    it('should generate consistent hash for same input', () => {
      const input = 'test prompt';
      const hash1 = simpleHash(input);
      const hash2 = simpleHash(input);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = simpleHash('prompt 1');
      const hash2 = simpleHash('prompt 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return positive numbers', () => {
      const hash = simpleHash('test');
      expect(hash).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateMockResponse', () => {
    it('should generate deterministic response for same hash', () => {
      const hash = 12345;
      const model = 'mock-default';
      const response1 = generateMockResponse(hash, model);
      const response2 = generateMockResponse(hash, model);
      expect(response1).toBe(response2);
    });

    it('should include model and hash in response', () => {
      const hash = 12345;
      const model = 'mock-test';
      const response = generateMockResponse(hash, model);
      expect(response).toContain(model);
      expect(response).toContain(String(hash));
    });
  });

  describe('MockProvider', () => {
    it('should have name "mock"', () => {
      const provider = new MockProvider();
      expect(provider.name).toBe('mock');
    });

    it('should always be available', async () => {
      const provider = new MockProvider();
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    it('should execute prompt and return response', async () => {
      const provider = new MockProvider();
      const prompt = 'What is quantum computing?';
      const response = await provider.execute(prompt);

      expect(response).toHaveProperty('output');
      expect(response).toHaveProperty('model', 'mock-default');
      expect(response).toHaveProperty('actualModel', 'mock-default-v1.2.3');
      expect(response).toHaveProperty('provider', 'mock');
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('metadata');
      expect(response.metadata).toHaveProperty('tokens');
      expect(response.metadata).toHaveProperty('latency');
    });

    it('should generate deterministic output for same prompt', async () => {
      const provider = new MockProvider();
      const prompt = 'Explain machine learning';
      
      const response1 = await provider.execute(prompt);
      const response2 = await provider.execute(prompt);

      expect(response1.output).toBe(response2.output);
    });

    it('should use provided model name', async () => {
      const provider = new MockProvider();
      const model = 'mock-quality';
      const response = await provider.execute('test', model);

      expect(response.model).toBe(model);
    });

    it('should use default model if not provided', async () => {
      const provider = new MockProvider();
      const response = await provider.execute('test');

      expect(response.model).toBe('mock-default');
    });

    it('should list available models', async () => {
      const provider = new MockProvider();
      const models = await provider.listModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('mock-default');
      expect(models).toContain('mock-fast');
      expect(models).toContain('mock-quality');
    });

    it('should include metadata with tokens and latency', async () => {
      const provider = new MockProvider();
      const response = await provider.execute('test prompt');

      expect(response.metadata.tokens).toBeGreaterThan(0);
      expect(response.metadata.latency).toBeGreaterThanOrEqual(0);
    });
  });
});
