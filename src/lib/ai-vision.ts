import type { AIConfig } from './ai-config';

export async function describeImage(config: AIConfig, imageUrl: string): Promise<string> {
  if (!config.vision) return '[图片: 未配置视觉模型]';

  const { apiBaseUrl, apiKey, model } = config.vision;
  const url = `${String(apiBaseUrl).replace(/\/$/, '')}/v1/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: '请简要描述这张图片的内容。' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
      max_tokens: 300,
    }),
  });

  if (!res.ok) return `[图片描述失败: ${res.status}]`;
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '[无法描述图片]';
}

export async function describeImages(config: AIConfig, imageUrls: string[]): Promise<string> {
  if (!imageUrls?.length) return '';
  const descriptions = await Promise.all(
    imageUrls.map((url, index) => describeImage(config, url).then((text) => `图片${index + 1}: ${text}`))
  );
  return descriptions.join('\n');
}
