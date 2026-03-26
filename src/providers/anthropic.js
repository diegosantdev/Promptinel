import { replayableFetch } from '../utils/replayFetch.js';

export class AnthropicProvider {
  constructor() {
    this.name = 'anthropic';
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.baseUrl = 'https://api.anthropic.com/v1';
    this.apiVersion = '2023-06-01';
  }

  async isAvailable() {
    return !!this.apiKey;
  }

  async execute(prompt, model, options = {}) {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.');
    }

    const resolvedModel = typeof model === 'string' && model ? model : 'claude-3-5-haiku-20241022';
    const startTime = Date.now();

    try {
      const response = await replayableFetch({
        provider: this.name,
        url: `${this.baseUrl}/messages`,
        init: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': this.apiVersion
          },
          body: JSON.stringify({
            model: resolvedModel,
            messages: [
              { role: 'user', content: prompt }
            ],
            max_tokens: options.maxTokens || 1024,
            temperature: options.temperature || 1.0
          })
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const output = data.content[0]?.text || '';
      const latency = Date.now() - startTime;

      return {
        output,
        model: resolvedModel,
        actualModel: data.model,
        provider: this.name,
        timestamp: Date.now(),
        metadata: {
          tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
          latency
        }
      };
    } catch (error) {
      throw new Error(`Anthropic execution failed: ${error.message}`);
    }
  }

  async listModels() {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0'
    ];
  }
}
