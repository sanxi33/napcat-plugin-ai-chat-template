import path from 'path';
import { chromium } from 'playwright-core';

const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const ROOT = 'C:/app/napcat-plugin-ai-chat-template';
const DIST_HTML = path.join(ROOT, 'dist', 'webui', 'index.html');
const OUT_DIR = path.join(ROOT, 'assets', 'screenshots');

const sampleConfig = {
  enabled: true,
  debug: false,
  aiConfigPath: '',
  keywordRegex: '^.*(机器人|助手|bot).*$',
  groupReplyProbability: 0.02,
  groupMaxReplyChars: 30,
  relevanceEnabled: true,
  relevanceModel: 'relevance',
  relevanceThreshold: 0.35,
  relevanceTimeoutMs: 2000,
  relevanceProfilePath: 'assistant_profile_relevance.md',
  relevancePromptPath: 'relevance_prompt.md',
  profilePath: 'assistant_profile.md',
  memoryProfilePath: 'assistant_memory.md',
  systemPromptPath: 'system_prompt.md',
  profileCacheSeconds: 30,
  groupEventExportEnabled: true,
  groupEventExportPath: 'data/group_events_inbox.jsonl',
  groupConfigs: {},
};

const sampleStatus = {
  code: 0,
  data: {
    pluginName: 'napcat-plugin-ai-chat-template',
    uptime: 1000 * 60 * 60 * 26,
    uptimeFormatted: '1天2小时',
    config: sampleConfig,
    stats: {
      processed: 152,
      todayProcessed: 38,
      lastUpdateDay: 'Sat Apr 11 2026',
    },
  },
};

const sampleGroups = {
  code: 0,
  data: [
    { group_id: 12345678, group_name: 'AI 测试群', member_count: 128, max_member_count: 500, enabled: true },
    { group_id: 87654321, group_name: 'NapCat 插件群', member_count: 42, max_member_count: 200, enabled: false },
    { group_id: 11223344, group_name: '动画讨论组', member_count: 73, max_member_count: 300, enabled: true },
  ],
};

const samplePromptFiles = {
  code: 0,
  data: {
    profile: {
      path: 'assistant_profile.md',
      content: '# 助手人设\n- 你是一个友好、自然的群聊数字角色。\n\n# 回复风格\n- 群聊优先短句\n- 不要刷屏',
    },
    memory: {
      path: 'assistant_memory.md',
      content: '## 自动记忆区\n- 最近大家在讨论动画新番和 live 活动\n- 近期热门话题：动画、歌单、演出',
    },
    relevanceProfile: {
      path: 'assistant_profile_relevance.md',
      content: '# 相关性评分设定\n- 优先判断当前消息是否和角色设定有关',
    },
    systemPrompt: {
      path: 'system_prompt.md',
      content: '你是一个在 QQ 群 / 私聊中扮演数字角色的聊天助手。\n\n{{profile}}\n\n{{length_rule}}',
    },
    relevancePrompt: {
      path: 'relevance_prompt.md',
      content: '[角色设定摘要]\n{{relevance_profile}}\n\n[近期消息]\n{{context_text}}\n\n[新消息]\n{{sender_name}}: {{message_text}}',
    },
  },
};

function apiResponse(url, method) {
  if (url.includes('/status') && method === 'GET') return sampleStatus;
  if (url.includes('/config') && method === 'GET') return { code: 0, data: sampleConfig };
  if (url.includes('/config') && method === 'POST') return { code: 0, message: 'ok' };
  if (url.includes('/groups') && method === 'GET') return sampleGroups;
  if (url.includes('/groups/') && method === 'POST') return { code: 0, message: 'ok' };
  if (url.includes('/groups/bulk-config') && method === 'POST') return { code: 0, message: 'ok' };
  if (url.includes('/prompt-files') && method === 'GET') return samplePromptFiles;
  if (url.includes('/prompt-files/') && method === 'POST') return { code: 0, message: 'ok' };
  return { code: 0 };
}

async function main() {
  const browser = await chromium.launch({
    executablePath: EDGE_PATH,
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 1.5,
  });

  await page.route('**/plugin/**/api/**', async (route) => {
    const request = route.request();
    const body = apiResponse(request.url(), request.method());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.goto(`file:///${DIST_HTML.replace(/\\/g, '/')}`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  await page.screenshot({ path: path.join(OUT_DIR, 'dashboard.png') });

  await page.getByText('插件配置').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, 'config.png') });

  await page.getByText('Prompt 文件').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, 'prompt-files.png') });

  await page.getByText('群管理').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT_DIR, 'groups.png') });

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
