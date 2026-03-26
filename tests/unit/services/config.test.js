import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Config } from '../../../src/services/config.js';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';

describe('Config', () => {
  const testConfigPath = '.promptinel-test';
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    if (existsSync(testConfigPath)) {
      rmSync(testConfigPath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    process.env = originalEnv;
    
    if (existsSync(testConfigPath)) {
      rmSync(testConfigPath, { recursive: true, force: true });
    }
  });

  describe('constructor and loadConfig', () => {
    it('should use default config when no file exists', () => {
      const config = new Config();
      
      expect(config.getDefaultProvider()).toBe('mock');
      expect(config.getDefaultModel()).toBe('mock-default');
      expect(config.getDefaultThreshold()).toBe(0.3);
      expect(config.getRetentionDays()).toBe(30);
    });

    it('should load config from file when it exists', () => {

      mkdirSync('.promptinel', { recursive: true });
      const testConfig = {
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o-mini',
        defaultThreshold: 0.25
      };
      writeFileSync('.promptinel/config.json', JSON.stringify(testConfig));

      const config = new Config();
      
      expect(config.getDefaultProvider()).toBe('openai');
      expect(config.getDefaultModel()).toBe('gpt-4o-mini');
      expect(config.getDefaultThreshold()).toBe(0.25);


      rmSync('.promptinel', { recursive: true, force: true });
    });

    it('should merge user config with defaults', () => {
      mkdirSync('.promptinel', { recursive: true });
      const testConfig = {
        defaultProvider: 'openai',
      };
      writeFileSync('.promptinel/config.json', JSON.stringify(testConfig));

      const config = new Config();
      
      expect(config.getDefaultProvider()).toBe('openai');
      expect(config.getDefaultThreshold()).toBe(0.3);
      expect(config.getRetentionDays()).toBe(30);

      rmSync('.promptinel', { recursive: true, force: true });
    });

    it('should handle invalid JSON gracefully', () => {
      mkdirSync('.promptinel', { recursive: true });
      writeFileSync('.promptinel/config.json', 'invalid json{');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config = new Config();
      
      expect(config.getDefaultProvider()).toBe('mock');
      expect(consoleSpy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Using default configuration');

      consoleSpy.mockRestore();
      logSpy.mockRestore();
      rmSync('.promptinel', { recursive: true, force: true });
    });
  });

  describe('getDefaultProvider', () => {
    it('should return default provider', () => {
      const config = new Config();
      expect(config.getDefaultProvider()).toBe('mock');
    });
  });

  describe('getDefaultModel', () => {
    it('should return default model', () => {
      const config = new Config();
      expect(config.getDefaultModel()).toBe('mock-default');
    });
  });

  describe('getDefaultThreshold', () => {
    it('should return default threshold', () => {
      const config = new Config();
      expect(config.getDefaultThreshold()).toBe(0.3);
    });
  });

  describe('getSlackWebhook', () => {
    it('should return undefined when not configured', () => {
      const config = new Config();
      expect(config.getSlackWebhook()).toBeUndefined();
    });

    it('should return webhook from environment variable', () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      const config = new Config();
      
      expect(config.getSlackWebhook()).toBe('https://hooks.slack.com/test');
    });

    it('should prioritize environment variable over config file', () => {
      mkdirSync('.promptinel', { recursive: true });
      writeFileSync('.promptinel/config.json', JSON.stringify({
        slackWebhook: 'https://hooks.slack.com/config'
      }));

      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/env';
      const config = new Config();
      
      expect(config.getSlackWebhook()).toBe('https://hooks.slack.com/env');

      rmSync('.promptinel', { recursive: true, force: true });
    });
  });

  describe('getRetentionDays', () => {
    it('should return retention days', () => {
      const config = new Config();
      expect(config.getRetentionDays()).toBe(30);
    });
  });

  describe('getProviderConfig', () => {
    it('should return provider configuration', () => {
      const config = new Config();
      const ollamaConfig = config.getProviderConfig('ollama');
      
      expect(ollamaConfig).toEqual({
        enabled: true,
        baseUrl: 'http://localhost:11434'
      });
    });

    it('should return empty object for unknown provider', () => {
      const config = new Config();
      const unknownConfig = config.getProviderConfig('unknown');
      
      expect(unknownConfig).toEqual({});
    });
  });

  describe('isProviderEnabled', () => {
    it('should return true for enabled provider', () => {
      const config = new Config();
      expect(config.isProviderEnabled('mock')).toBe(true);
      expect(config.isProviderEnabled('ollama')).toBe(true);
    });

    it('should return true for unknown provider (default)', () => {
      const config = new Config();
      expect(config.isProviderEnabled('unknown')).toBe(true);
    });

    it('should return false for explicitly disabled provider', () => {
      mkdirSync('.promptinel', { recursive: true });
      writeFileSync('.promptinel/config.json', JSON.stringify({
        providers: {
          mock: { enabled: false }
        }
      }));

      const config = new Config();
      expect(config.isProviderEnabled('mock')).toBe(false);

      rmSync('.promptinel', { recursive: true, force: true });
    });
  });

  describe('getScoringConfig', () => {
    it('should return scoring configuration', () => {
      const config = new Config();
      const scoringConfig = config.getScoringConfig();
      
      expect(scoringConfig).toEqual({
        method: 'llm-judge',
        fallbackToExactMatch: true
      });
    });
  });

  describe('getNotificationConfig', () => {
    it('should return notification configuration', () => {
      const config = new Config();
      const notifConfig = config.getNotificationConfig();
      
      expect(notifConfig).toEqual({
        slack: { enabled: false, retryOnFailure: true },
        console: { enabled: true }
      });
    });
  });

  describe('getStorageConfig', () => {
    it('should return storage configuration', () => {
      const config = new Config();
      const storageConfig = config.getStorageConfig();
      
      expect(storageConfig.path).toBe('.promptinel');
      expect(storageConfig.retentionPolicy).toBeDefined();
    });
  });

  describe('getRetentionPolicy', () => {
    it('should return retention policy', () => {
      const config = new Config();
      const policy = config.getRetentionPolicy();
      
      expect(policy).toEqual({
        maxSnapshots: 100,
        maxAgeDays: 30,
        preserveBaselines: true
      });
    });
  });

  describe('getAll', () => {
    it('should return full configuration', () => {
      const config = new Config();
      const all = config.getAll();
      
      expect(all.defaultProvider).toBe('mock');
      expect(all.providers).toBeDefined();
      expect(all.scoring).toBeDefined();
      expect(all.notifications).toBeDefined();
      expect(all.storage).toBeDefined();
    });

    it('should return a copy not a reference', () => {
      const config = new Config();
      const all1 = config.getAll();
      const all2 = config.getAll();
      
      all1.defaultProvider = 'modified';
      expect(all2.defaultProvider).toBe('mock');
    });
  });

  describe('mergeConfig', () => {
    it('should deep merge nested objects', () => {
      const config = new Config();
      const defaults = {
        a: 1,
        b: { c: 2, d: 3 }
      };
      const user = {
        b: { c: 99 }
      };
      
      const merged = config.mergeConfig(defaults, user);
      
      expect(merged.a).toBe(1);
      expect(merged.b.c).toBe(99);
      expect(merged.b.d).toBe(3);
    });

    it('should handle arrays correctly', () => {
      const config = new Config();
      const defaults = {
        arr: [1, 2, 3]
      };
      const user = {
        arr: [4, 5]
      };
      
      const merged = config.mergeConfig(defaults, user);
      
      expect(merged.arr).toEqual([4, 5]);
    });
  });
});
