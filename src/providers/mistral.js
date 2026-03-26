import { replayableFetch } from '../utils/replayFetch.js';

export class MistralProvider {
  constructor() {
    this.name = 'mistral';
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.baseUrl = 'https://api.mistral.ai/v1';
  }

  async isAvailable() {
    return !!this.apiKey;
  }

  async execute(prompt, model, options = {}) {
    if (!this.apiKey) {
      throw new Error('Mistral API key not found. Set MISTRAL_API_KEY environment variable.');
    }

    const resolvedModel = typeof model === 'string' && model ? model : 'mistral-small-latest';
    const startTime = Date.now();

    try {
      const response = await replayableFetch({
        provider: this.name,
        url: `${this.baseUrl}/chat/completions`,
        init: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: resolvedModel,
            messages: [
              { role: 'user', content: prompt }
            ],
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 1000
          })
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(`Mistral API error: ${error.error?.message || error.message || response.statusText}`);
      }

      const data = await response.json();
      const output = data.choices[0]?.message?.content || '';
      const latency = Date.now() - startTime;

      return {
        output,
        model: resolvedModel,
        actualModel: data.model,
        provider: this.name,
        timestamp: Date.now(),
        metadata: {
          tokens: data.usage?.total_tokens || 0,
          latency
        }
      };
    } catch (error) {
      throw new Error(`Mistral execution failed: ${error.message}`);
    }
  }

  async listModels() {
    return [
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
      'mistral-tiny'
    ];
  }
}
