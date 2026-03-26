import { Logger } from './logger.js';

export function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  
  return Math.max(0, Math.min(1, similarity));
}

export class Scorer {
  constructor(config = { method: 'llm-judge' }) {
    this.config = config;
    this.logger = new Logger();
  }

  async score(baseline, current, provider, options = {}) {
    const method = options.method || this.config.method || 'llm-judge';

    if (method === 'embeddings') {
      try {
        return await this.scoreWithEmbeddings(baseline, current);
      } catch (error) {
        this.logger.warn(`Embeddings scoring failed, falling back to LLM judge: ${error.message}`);
      }
    }

    return await this.scoreWithLLMJudge(baseline, current, provider);
  }

  async scoreWithLLMJudge(baseline, current, provider) {
    const judgePrompt = `Compare these two outputs semantically and rate their similarity from 0 to 1.
0 means completely different meaning, 1 means identical meaning.
Ignore minor wording differences, focus on semantic content.

Output 1:
${baseline}

Output 2:
${current}

Respond with only a number between 0 and 1.`;

    try {
      let model;
      if (provider.name === 'openai') {
        model = 'gpt-4o-mini';
      } else {
        try {
          const models = await provider.listModels();
          model = models[0];
        } catch {
          model = null;
        }
      }

      if (!model) {
        this.logger.warn('Cannot determine model for LLM judge, falling back to exact match');
        return baseline === current ? 0 : 1;
      }
      
      const response = await provider.execute(judgePrompt, model);
      const score = parseFloat(response.output.trim());

      if (isNaN(score) || score < 0 || score > 1) {
        this.logger.warn('Invalid score from LLM judge, falling back to exact match');
        return baseline === current ? 0 : 1;
      }

      return 1 - score;
    } catch (error) {
      this.logger.error(`LLM judge failed: ${error.message}`);
      return baseline === current ? 0 : 1;
    }
  }

  async explain(baseline, current, provider, model) {
    if (provider.name === 'mock') {
      return this.generateMockExplanation(baseline, current);
    }

    const explanationPrompt = `Compare these two LLM outputs and explain concisely (in 1-2 sentences) what changed in the behavior or semantic content. 
Focus on the essence of the change, not just wording. 

Baseline Output:
${baseline}

Current Output:
${current}

Provide a human-readable explanation of the difference:`;

    try {
      const response = await provider.execute(explanationPrompt, model);
      return response.output.trim();
    } catch (error) {
      this.logger.error(`Failed to generate drift explanation: ${error.message}`);
      return "Unable to generate automated explanation of the drift.";
    }
  }

  generateMockExplanation(baseline, current) {
    if (baseline === current) return "No behavioral changes detected.";
    
    const possibleExplanations = [
      "The model has become more verbose and added technical details not present in the baseline.",
      "The tone has shifted from professional to more casual/conversational.",
      "Specific entities or categories are being prioritized differently than in the baseline.",
      "The response now includes a refusal or hedging that was absent in the original output."
    ];
    
    const index = (baseline.length + current.length) % possibleExplanations.length;
    return possibleExplanations[index];
  }

  async scoreWithEmbeddings(baseline, current) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key required for embeddings');
    }

    const [baselineEmb, currentEmb] = await Promise.all([
      this.getEmbedding(baseline, apiKey),
      this.getEmbedding(current, apiKey)
    ]);

    const similarity = cosineSimilarity(baselineEmb, currentEmb);
    return 1 - similarity;
  }

  async getEmbedding(text, apiKey) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI embeddings API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}
