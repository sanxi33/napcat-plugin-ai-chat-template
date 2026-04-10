import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AIModelConfig {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
}

export interface AIConfig {
  main: AIModelConfig;
  vision?: AIModelConfig;
  relevance?: AIModelConfig;
}

export function resolveDefaultConfigPath(): string {
  return path.resolve(__dirname, '..', '..', 'templates', 'ai-model.example.json');
}

export function validateAIConfig(config: unknown): asserts config is AIConfig {
  const cfg = config as Partial<AIConfig>;
  if (!cfg?.main?.apiBaseUrl || !cfg?.main?.apiKey || !cfg?.main?.model) {
    throw new Error('AI config missing main model configuration');
  }
}

export function loadAIConfig(configPath?: string): AIConfig {
  const finalPath = configPath || resolveDefaultConfigPath();
  if (!fs.existsSync(finalPath)) {
    throw new Error(`AI config not found: ${finalPath}`);
  }
  const raw = fs.readFileSync(finalPath, 'utf-8');
  const config = JSON.parse(raw);
  validateAIConfig(config);
  return config;
}

export function getDefaultConfigPath(): string {
  return resolveDefaultConfigPath();
}
