export class OllamaProvider {
  constructor() {
    this.name = 'ollama';
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async execute(prompt, model, options = {}) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature,
            num_predict: options.maxTokens
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const latency = Date.now() - startTime;

      return {
        output: data.response,
        model,
        actualModel: data.model,
        provider: this.name,
        timestamp: Date.now(),
        metadata: {
          latency,
          tokens: data.eval_count || 0
        }
      };
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(
          `Cannot connect to Ollama at ${this.baseUrl}. ` +
          `Please ensure Ollama is running. Install from https://ollama.ai or run 'ollama serve'.`
        );
      }
      throw error;
    }
  }

  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Failed to list Ollama models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models ? data.models.map(m => m.name) : [];
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(
          `Cannot connect to Ollama at ${this.baseUrl}. ` +
          `Please ensure Ollama is running. Install from https://ollama.ai or run 'ollama serve'.`
        );
      }
      throw error;
    }
  }
}
