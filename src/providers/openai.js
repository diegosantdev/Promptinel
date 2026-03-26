import { replayableFetch } from '../utils/replayFetch.js';

export class OpenAIProvider {
  constructor() {
    this.name = 'openai';
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  async isAvailable() {
    return !!this.apiKey;
  }

  async execute(prompt, model, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable.');
    }

    const resolvedModel = typeof model === 'string' && model ? model : 'gpt-4o-mini';
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
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
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
          latency,
          systemFingerprint: data.system_fingerprint || null
        }
      };
    } catch (error) {
      throw new Error(`OpenAI execution failed: ${error.message}`);
    }
  }

  async listModels() {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ];
  }
}
