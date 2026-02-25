export interface ModelInfo {
  name: string;
  pricePerMillion: number;
}

// Model pricing (USD per 1M input tokens)
// Includes Feb 2026 public rates and speculative future models
export const MODELS: Record<string, number> = {
  'Gemini 3 Flash': 0.5,
  'GPT-5': 1.25,
  'Gemini 3.1 Pro': 2.0,
  'Claude Sonnet 4.5': 3.0,
};
