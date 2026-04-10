import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { NapCatPluginContext, PluginLogger } from 'napcat-types/napcat-onebot/network/plugin/types';
import { DEFAULT_CONFIG } from '../config';
import type { GroupConfig, PluginConfig } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeConfig(raw: unknown): PluginConfig {
  if (!isObject(raw)) return { ...DEFAULT_CONFIG, groupConfigs: {} };

  const out: PluginConfig = { ...DEFAULT_CONFIG, groupConfigs: {} };

  if (typeof raw.enabled === 'boolean') out.enabled = raw.enabled;
  if (typeof raw.debug === 'boolean') out.debug = raw.debug;
  if (typeof raw.aiConfigPath === 'string') out.aiConfigPath = raw.aiConfigPath;
  if (typeof raw.keywordRegex === 'string') out.keywordRegex = raw.keywordRegex;
  if (typeof raw.groupReplyProbability === 'number') out.groupReplyProbability = raw.groupReplyProbability;
  if (typeof raw.groupMaxReplyChars === 'number') out.groupMaxReplyChars = raw.groupMaxReplyChars;
  if (typeof raw.relevanceEnabled === 'boolean') out.relevanceEnabled = raw.relevanceEnabled;
  if (typeof raw.relevanceModel === 'string') out.relevanceModel = raw.relevanceModel;
  if (typeof raw.relevanceThreshold === 'number') out.relevanceThreshold = raw.relevanceThreshold;
  if (typeof raw.relevanceTimeoutMs === 'number') out.relevanceTimeoutMs = raw.relevanceTimeoutMs;
  if (typeof raw.relevanceProfilePath === 'string') out.relevanceProfilePath = raw.relevanceProfilePath;
  if (typeof raw.relevancePromptPath === 'string') out.relevancePromptPath = raw.relevancePromptPath;
  if (typeof raw.profilePath === 'string') out.profilePath = raw.profilePath;
  if (typeof raw.memoryProfilePath === 'string') out.memoryProfilePath = raw.memoryProfilePath;
  if (typeof raw.systemPromptPath === 'string') out.systemPromptPath = raw.systemPromptPath;
  if (typeof raw.profileCacheSeconds === 'number') out.profileCacheSeconds = raw.profileCacheSeconds;
  if (typeof raw.groupEventExportEnabled === 'boolean') out.groupEventExportEnabled = raw.groupEventExportEnabled;
  if (typeof raw.groupEventExportPath === 'string') out.groupEventExportPath = raw.groupEventExportPath;

  if (isObject(raw.groupConfigs)) {
    for (const [groupId, groupConfig] of Object.entries(raw.groupConfigs)) {
      if (isObject(groupConfig)) {
        const cfg: GroupConfig = {};
        if (typeof groupConfig.enabled === 'boolean') cfg.enabled = groupConfig.enabled;
        out.groupConfigs[groupId] = cfg;
      }
    }
  }

  out.groupReplyProbability = Math.max(0, Math.min(1, out.groupReplyProbability));
  out.groupMaxReplyChars = Math.max(1, Math.floor(out.groupMaxReplyChars));
  out.relevanceThreshold = Math.max(0, Math.min(1, out.relevanceThreshold));
  out.relevanceTimeoutMs = Math.max(200, Math.floor(out.relevanceTimeoutMs));
  out.profileCacheSeconds = Math.max(0, Math.floor(out.profileCacheSeconds));

  return out;
}

class PluginState {
  private _ctx: NapCatPluginContext | null = null;
  config: PluginConfig = { ...DEFAULT_CONFIG };
  startTime = 0;
  selfId = '';

  stats = {
    processed: 0,
    todayProcessed: 0,
    lastUpdateDay: new Date().toDateString(),
  };

  get ctx(): NapCatPluginContext {
    if (!this._ctx) throw new Error('PluginState 尚未初始化，请先调用 init()');
    return this._ctx;
  }

  get logger(): PluginLogger {
    return this.ctx.logger;
  }

  init(ctx: NapCatPluginContext): void {
    this._ctx = ctx;
    this.startTime = Date.now();
    this.ensureDataDir();
    this.loadConfig();
    this.fetchSelfId();
    this.ensureTemplateFiles();
    this.ensureLogDir();
  }

  private async fetchSelfId(): Promise<void> {
    try {
      const res = await this.ctx.actions.call('get_login_info', {}, this.ctx.adapterName, this.ctx.pluginManager.config) as { user_id?: number | string };
      if (res?.user_id) {
        this.selfId = String(res.user_id);
        this.logger.info(`机器人QQ: ${this.selfId}`);
      }
    } catch (error) {
      this.logger.warn('获取机器人 QQ 号失败:', error);
    }
  }

  cleanup(): void {
    this.saveConfig();
    this._ctx = null;
  }

  private ensureDataDir(): void {
    const dataPath = this.ctx.dataPath;
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
  }

  private ensureLogDir(): void {
    const logPath = path.join(this.ctx.dataPath, 'logs');
    if (!fs.existsSync(logPath)) fs.mkdirSync(logPath, { recursive: true });
  }

  private ensureTemplateFiles(): void {
    const mainPath = this.resolveProfilePath();
    const memoryPath = this.resolveMemoryProfilePath();
    const relevancePath = this.resolveRelevanceProfilePath();
    const systemPromptPath = this.resolveSystemPromptPath();
    const relevancePromptPath = this.resolveRelevancePromptPath();
    this.ensureFileFromTemplate(mainPath, path.resolve(__dirname, '..', '..', 'templates', 'assistant_profile.md'), [
      '# 助手人设',
      '- 你是一个友好、自然的群聊数字角色。',
      '',
      '# 群成员备注',
      '- （可选）使用 `- 名称：QQ号` 格式补充备注',
      '',
      '# 回复风格/禁忌',
      '- 群聊默认短句优先',
      '- 避免刷屏和生硬切话题',
      '',
      '# 优先级规则',
      '- @机器人 > 关键词 > 回复机器人 > 随机触发',
      ''
    ].join('\n'));
    this.ensureFileFromTemplate(relevancePath, path.resolve(__dirname, '..', '..', 'templates', 'assistant_profile_relevance.md'), [
      '# 相关性评分设定',
      '- 判断这条消息是否值得当前角色回复。',
      '- 优先考虑角色设定相关性、上下文相关性和自然接话空间。',
      ''
    ].join('\n'));
    this.ensureFileFromTemplate(memoryPath, path.resolve(__dirname, '..', '..', 'templates', 'assistant_memory.md'), [
      '## 自动记忆区',
      '- 在这里放近期摘要、热门话题、长期记忆等动态内容。',
      ''
    ].join('\n'));
    this.ensureFileFromTemplate(systemPromptPath, path.resolve(__dirname, '..', '..', 'templates', 'system_prompt.md'), [
      '你是一个在 QQ 群 / 私聊中扮演数字角色的聊天助手。',
      '你的具体身份、语气和边界完全由设定文档定义。',
      '如果设定文档没有明确允许，不要冒充真实经历或真实身份。',
      '',
      '{{profile}}',
      '',
      '{{length_rule}}',
      ''
    ].join('\n'));
    this.ensureFileFromTemplate(relevancePromptPath, path.resolve(__dirname, '..', '..', 'templates', 'relevance_prompt.md'), [
      '你是群聊回复过滤器。请判断当前数字角色是否适合回复下面这条消息。',
      '',
      '[角色设定摘要]',
      '{{relevance_profile}}',
      '',
      '[近期消息]',
      '{{context_text}}',
      '',
      '[新消息]',
      '{{sender_name}}: {{message_text}}',
      '',
      '只输出 JSON，禁止其他内容：',
      '{"relevance":0~10, "engagement":0~10, "value":0~10, "reason":"<10字"}'
    ].join('\n'));
  }

  private ensureFileFromTemplate(targetPath: string, templatePath: string, fallbackContent: string): void {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(targetPath)) return;
    const content = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, 'utf-8') : fallbackContent;
    fs.writeFileSync(targetPath, content, 'utf-8');
  }

  resolveProfilePath(): string {
    const p = this.config.profilePath || 'assistant_profile.md';
    if (path.isAbsolute(p)) return p;
    if (p.startsWith('data/') || p.startsWith('data\\')) return path.join(this.ctx.dataPath, p.replace(/^data[\\/]/, ''));
    return path.join(this.ctx.dataPath, p);
  }

  resolveRelevanceProfilePath(): string {
    const p = this.config.relevanceProfilePath || 'assistant_profile_relevance.md';
    if (path.isAbsolute(p)) return p;
    if (p.startsWith('data/') || p.startsWith('data\\')) return path.join(this.ctx.dataPath, p.replace(/^data[\\/]/, ''));
    return path.join(this.ctx.dataPath, p);
  }

  resolveMemoryProfilePath(): string {
    const p = this.config.memoryProfilePath || 'assistant_memory.md';
    if (path.isAbsolute(p)) return p;
    if (p.startsWith('data/') || p.startsWith('data\\')) return path.join(this.ctx.dataPath, p.replace(/^data[\\/]/, ''));
    return path.join(this.ctx.dataPath, p);
  }

  resolveSystemPromptPath(): string {
    const p = this.config.systemPromptPath || 'system_prompt.md';
    if (path.isAbsolute(p)) return p;
    if (p.startsWith('data/') || p.startsWith('data\\')) return path.join(this.ctx.dataPath, p.replace(/^data[\\/]/, ''));
    return path.join(this.ctx.dataPath, p);
  }

  resolveRelevancePromptPath(): string {
    const p = this.config.relevancePromptPath || 'relevance_prompt.md';
    if (path.isAbsolute(p)) return p;
    if (p.startsWith('data/') || p.startsWith('data\\')) return path.join(this.ctx.dataPath, p.replace(/^data[\\/]/, ''));
    return path.join(this.ctx.dataPath, p);
  }

  resolveGroupEventExportPath(): string {
    const p = this.config.groupEventExportPath || 'group_events_inbox.jsonl';
    if (path.isAbsolute(p)) return p;
    if (p.startsWith('data/') || p.startsWith('data\\')) return path.join(this.ctx.dataPath, p.replace(/^data[\\/]/, ''));
    return path.join(this.ctx.dataPath, p);
  }

  appendLog(fileName: 'incoming.log' | 'outgoing.log' | 'error.log', payload: unknown): void {
    try {
      const line = `${new Date().toISOString()} ${JSON.stringify(payload)}\n`;
      fs.appendFileSync(path.join(this.ctx.dataPath, 'logs', fileName), line, 'utf-8');
    } catch (error) {
      this.logger.warn('写日志失败:', error);
    }
  }

  loadConfig(): void {
    const configPath = this.ctx.configPath;
    try {
      if (configPath && fs.existsSync(configPath)) {
        const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.config = sanitizeConfig(raw);
        if (isObject(raw) && isObject(raw.stats)) Object.assign(this.stats, raw.stats);
      } else {
        this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
        this.saveConfig();
      }
    } catch (error) {
      this.ctx.logger.error('加载配置失败，使用默认配置:', error);
      this.config = { ...DEFAULT_CONFIG, groupConfigs: {} };
    }
  }

  saveConfig(): void {
    if (!this._ctx) return;
    const configPath = this._ctx.configPath;
    try {
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      const data = { ...this.config, stats: this.stats };
      fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      this._ctx.logger.error('保存配置失败:', error);
    }
  }

  updateConfig(partial: Partial<PluginConfig>): void {
    this.config = sanitizeConfig({ ...this.config, ...partial });
    this.saveConfig();
  }

  replaceConfig(config: PluginConfig): void {
    this.config = sanitizeConfig(config);
    this.saveConfig();
  }

  updateGroupConfig(groupId: string, config: Partial<GroupConfig>): void {
    this.config.groupConfigs[groupId] = {
      ...this.config.groupConfigs[groupId],
      ...config,
    };
    this.saveConfig();
  }

  isGroupEnabled(groupId: string): boolean {
    return this.config.groupConfigs[groupId]?.enabled !== false;
  }

  incrementProcessed(): void {
    const today = new Date().toDateString();
    if (this.stats.lastUpdateDay !== today) {
      this.stats.todayProcessed = 0;
      this.stats.lastUpdateDay = today;
    }
    this.stats.todayProcessed++;
    this.stats.processed++;
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  getUptimeFormatted(): string {
    const ms = this.getUptime();
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}天${h % 24}小时`;
    if (h > 0) return `${h}小时${m % 60}分钟`;
    if (m > 0) return `${m}分钟${s % 60}秒`;
    return `${s}秒`;
  }
}

export const pluginState = new PluginState();
