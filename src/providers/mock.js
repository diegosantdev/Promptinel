export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function generateMockResponse(hash, model) {
  const templates = [
    "This is a mock response for testing purposes.",
    "Mock provider generated this deterministic output.",
    "Simulated LLM response based on prompt characteristics."
  ];
  const index = hash % templates.length;
  return `${templates[index]} [Model: ${model}, Hash: ${hash}]`;
}

export class MockProvider {
  constructor() {
    this.name = 'mock';
  }

  async isAvailable() {
    return true;
  }

  async execute(prompt, model = 'mock-default') {
    const hash = simpleHash(prompt);
    const output = generateMockResponse(hash, model);
    
    const latency = 50;
    
    return {
      output,
      model,
      actualModel: `${model}-v1.2.3`,
      provider: 'mock',
      timestamp: Date.now(),
      metadata: {
        tokens: output.length,
        latency
      }
    };
  }

  async listModels() {
    return ['mock-default', 'mock-fast', 'mock-quality'];
  }
}
