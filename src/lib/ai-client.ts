import type { AIConfig } from './ai-config';

export async function chatCompletion(config: AIConfig, messages: unknown[], options: {
  modelKey?: 'main' | 'vision' | 'relevance';
  temperature?: number;
  maxTokens?: number;
  user?: string;
} = {}) {
  const modelKey = options.modelKey || 'main';
  const modelConfig = config[modelKey] || config.main;
  const { apiBaseUrl, apiKey, model } = modelConfig;

  let url = String(apiBaseUrl).replace(/\/$/, '');
  const hasCompletions = url.endsWith('/chat/completions') || url.endsWith('/v1/chat/completions') || url.includes('/completions');
  if (!hasCompletions) url += '/v1/chat/completions';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      user: options.user,
    }),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage,
  };
}

export async function simpleChat(config: AIConfig, systemPrompt: string, userContent: string, options: {
  modelKey?: 'main' | 'vision' | 'relevance';
  temperature?: number;
  maxTokens?: number;
  user?: string;
} = {}) {
  return chatCompletion(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ], options);
}
