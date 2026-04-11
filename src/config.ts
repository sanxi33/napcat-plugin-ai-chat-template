import type { NapCatPluginContext, PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin/types';
import type { PluginConfig } from './types';

export const DEFAULT_CONFIG: PluginConfig = {
  enabled: true,
  debug: false,
  groupConfigs: {},

  aiConfigPath: '',

  keywordRegex: '^.*(机器人|助手|bot).*$',
  groupReplyProbability: 0,
  groupMaxReplyChars: 20,
  relevanceEnabled: false,
  relevanceModel: '',
  relevanceThreshold: 0.35,
  relevanceTimeoutMs: 2000,
  relevanceProfilePath: 'assistant_profile_relevance.md',
  relevancePromptPath: 'relevance_prompt.md',

  profilePath: 'assistant_profile.md',
  memoryProfilePath: 'assistant_memory.md',
  systemPromptPath: 'system_prompt.md',
  profileCacheSeconds: 30,

  groupEventExportEnabled: false,
  groupEventExportPath: 'data/group_events_inbox.jsonl',
};

export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
  return ctx.NapCatConfig.combine(
    ctx.NapCatConfig.html(`
      <div style="padding: 16px; background: #0F766E; border-radius: 12px; margin-bottom: 20px; color: white;">
        <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600;">NapCat × AI Chat Template</h3>
        <p style="margin: 0; font-size: 13px; opacity: 0.9;">通用 AI 群聊 / 私聊模板插件</p>
      </div>
    `),
    ctx.NapCatConfig.boolean('enabled', '启用插件', true, '总开关'),
    ctx.NapCatConfig.boolean('debug', '调试模式', false, '输出详细日志'),
    ctx.NapCatConfig.text('aiConfigPath', 'AI 配置文件路径', '', '留空时需手动指定；可参考 templates/ai-model.example.json'),
    ctx.NapCatConfig.text('keywordRegex', '关键词正则', DEFAULT_CONFIG.keywordRegex, '群聊强触发关键词（不区分大小写）'),
    ctx.NapCatConfig.number('groupReplyProbability', '群聊基础随机回复概率', 0.01, '0~1，例如 0.01 = 1%'),
    ctx.NapCatConfig.number('groupMaxReplyChars', '群聊回复建议字数', 20, '仅写入提示词，不会硬截断'),
    ctx.NapCatConfig.boolean('relevanceEnabled', '启用相关性评分', true, '启用后先评分，再决定随机回复'),
    ctx.NapCatConfig.text('relevanceModel', '相关性评分模型', '', '留空则使用主模型'),
    ctx.NapCatConfig.number('relevanceThreshold', '相关性阈值', 0.35, '低于阈值时不触发随机回复'),
    ctx.NapCatConfig.number('relevanceTimeoutMs', '相关性评分超时(ms)', 2000, '超时会降级为中间分数'),
    ctx.NapCatConfig.text('relevanceProfilePath', '相关性评分设定文件', 'assistant_profile_relevance.md', '相对 dataPath 或绝对路径'),
    ctx.NapCatConfig.text('relevancePromptPath', '相关性评分 Prompt 模板', 'relevance_prompt.md', '相对 dataPath 或绝对路径'),
    ctx.NapCatConfig.text('profilePath', '主设定文件路径', 'assistant_profile.md', '相对 dataPath 或绝对路径'),
    ctx.NapCatConfig.text('memoryProfilePath', '动态记忆文件路径', 'assistant_memory.md', '相对 dataPath 或绝对路径'),
    ctx.NapCatConfig.text('systemPromptPath', '系统 Prompt 模板', 'system_prompt.md', '相对 dataPath 或绝对路径'),
    ctx.NapCatConfig.number('profileCacheSeconds', '设定缓存秒数', 30, '建议 30'),
    ctx.NapCatConfig.boolean('groupEventExportEnabled', '导出群聊事件到 JSONL', false, '开启后会把群消息写入 JSONL'),
    ctx.NapCatConfig.text('groupEventExportPath', '群聊事件导出路径', 'data/group_events_inbox.jsonl', '相对 dataPath 或绝对路径')
  );
}
