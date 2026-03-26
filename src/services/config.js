import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DEFAULT_CONFIG = {
  defaultProvider: 'mock',
  defaultModel: 'mock-default',
  defaultThreshold: 0.3,
  retentionDays: 30,
  providers: {
    mock: { enabled: true },
    ollama: { enabled: true, baseUrl: 'http://localhost:11434' }
  },
  scoring: {
    method: 'llm-judge',
    fallbackToExactMatch: true
  },
  notifications: {
    slack: { enabled: false, retryOnFailure: true },
    console: { enabled: true }
  },
  storage: {
    path: '.promptinel',
    retentionPolicy: {
      maxSnapshots: 100,
      maxAgeDays: 30,
      preserveBaselines: true
    }
  }
};

export class Config {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPath = join('.promptinel', 'config.json');
    
    if (!existsSync(configPath)) {
      return { ...DEFAULT_CONFIG };
    }

    try {
      const fileContent = readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(fileContent);
      
      return this.mergeConfig(DEFAULT_CONFIG, userConfig);
    } catch (error) {
      console.error(`Error loading config file: ${error.message}`);
      console.log('Using default configuration');
      return { ...DEFAULT_CONFIG };
    }
  }

  mergeConfig(defaults, user) {
    const result = { ...defaults };
    
    for (const key in user) {
      if (user[key] !== null && typeof user[key] === 'object' && !Array.isArray(user[key])) {
        result[key] = this.mergeConfig(defaults[key] || {}, user[key]);
      } else {
        result[key] = user[key];
      }
    }
    
    return result;
  }

  getDefaultProvider() {
    return this.config.defaultProvider;
  }

  getDefaultModel() {
    return this.config.defaultModel;
  }

  getDefaultThreshold() {
    return this.config.defaultThreshold;
  }

  getSlackWebhook() {
    if (process.env.SLACK_WEBHOOK_URL) {
      return process.env.SLACK_WEBHOOK_URL;
    }
    return this.config.slackWebhook;
  }

  getOllamaBaseUrl() {
    if (process.env.OLLAMA_BASE_URL) {
      return process.env.OLLAMA_BASE_URL;
    }
    return this.config.providers.ollama.baseUrl;
  }

  getRetentionDays() {
    return this.config.retentionDays;
  }

  getProviderConfig(providerName) {
    return this.config.providers[providerName] || {};
  }

  isProviderEnabled(providerName) {
    const providerConfig = this.getProviderConfig(providerName);
    return providerConfig.enabled !== false;
  }

  getScoringConfig() {
    return this.config.scoring;
  }

  getNotificationConfig() {
    return this.config.notifications;
  }

  getStorageConfig() {
    return this.config.storage;
  }

  getRetentionPolicy() {
    return this.config.storage.retentionPolicy;
  }

  getAll() {
    return { ...this.config };
  }
}
