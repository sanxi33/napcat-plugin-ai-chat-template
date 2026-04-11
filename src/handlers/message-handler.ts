import fs from 'fs';
import path from 'path';
import type { OB11Message, OB11PostSendMsg } from 'napcat-types/napcat-onebot';
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';
import { loadAIConfig, getDefaultConfigPath } from '../lib/ai-config';
import { simpleChat } from '../lib/ai-client';
import { describeImages } from '../lib/ai-vision';
import { parseMemberMapFromProfile, resolveDisplayName } from '../lib/qq-identity';
import { appendMemorySection, renderTemplate } from '../utils/prompt-utils';

let profileCache = '';
let profileCacheAt = 0;
let relevanceProfileCache = '';
let relevanceProfileCacheAt = 0;
let systemPromptTemplateCache = '';
let systemPromptTemplateCacheAt = 0;
let relevancePromptTemplateCache = '';
let relevancePromptTemplateCacheAt = 0;
let aiConfigCache: { at: number; config: ReturnType<typeof loadAIConfig> } | null = null;

const relevanceCache = new Map<string, { score: number; reason: string; at: number }>();
const relevanceUserThrottle = new Map<string, number>();

function getAIConfig() {
  const cfg = pluginState.config;
  const configPath = cfg.aiConfigPath || getDefaultConfigPath();
  const ttlMs = 30 * 1000;
  if (aiConfigCache && Date.now() - aiConfigCache.at < ttlMs) return aiConfigCache.config;
  const config = loadAIConfig(configPath);
  aiConfigCache = { at: Date.now(), config };
  return config;
}

export async function sendReply(ctx: NapCatPluginContext, event: OB11Message, message: OB11PostSendMsg['message']): Promise<boolean> {
  try {
    const params: OB11PostSendMsg = {
      message,
      message_type: event.message_type,
      ...(event.message_type === 'group' && event.group_id ? { group_id: String(event.group_id) } : {}),
      ...(event.message_type === 'private' && event.user_id ? { user_id: String(event.user_id) } : {}),
    };
    await ctx.actions.call('send_msg', params, ctx.adapterName, ctx.pluginManager.config);
    return true;
  } catch (error) {
    pluginState.logger.error('发送消息失败:', error);
    return false;
  }
}

function loadAssistantProfile(kind: 'main' | 'relevance' = 'main'): string {
  const ttlMs = pluginState.config.profileCacheSeconds * 1000;
  if (kind === 'main' && ttlMs > 0 && Date.now() - profileCacheAt < ttlMs && profileCache) return profileCache;
  if (kind === 'relevance' && ttlMs > 0 && Date.now() - relevanceProfileCacheAt < ttlMs && relevanceProfileCache) return relevanceProfileCache;

  const file = kind === 'relevance' ? pluginState.resolveRelevanceProfilePath() : pluginState.resolveProfilePath();
  const fallback = kind === 'relevance'
    ? '# 相关性评分设定\n- 判断当前消息是否值得回复。'
    : '# 助手人设\n- 你是一个友好、自然的群聊数字角色。';
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : fallback;
  let finalContent = content;
  const memoryPath = pluginState.resolveMemoryProfilePath();
  const memory = fs.existsSync(memoryPath) ? fs.readFileSync(memoryPath, 'utf-8').trim() : '';
  if (memory) finalContent = appendMemorySection(content, memory);

  if (kind === 'main') {
    profileCache = finalContent;
    profileCacheAt = Date.now();
  } else {
    relevanceProfileCache = finalContent;
    relevanceProfileCacheAt = Date.now();
  }
  return finalContent;
}

function loadPromptTemplate(kind: 'system' | 'relevance'): string {
  const ttlMs = pluginState.config.profileCacheSeconds * 1000;
  if (kind === 'system' && ttlMs > 0 && Date.now() - systemPromptTemplateCacheAt < ttlMs && systemPromptTemplateCache) {
    return systemPromptTemplateCache;
  }
  if (kind === 'relevance' && ttlMs > 0 && Date.now() - relevancePromptTemplateCacheAt < ttlMs && relevancePromptTemplateCache) {
    return relevancePromptTemplateCache;
  }

  const file = kind === 'system' ? pluginState.resolveSystemPromptPath() : pluginState.resolveRelevancePromptPath();
  const fallback = kind === 'system'
    ? '你是一个在 QQ 群 / 私聊中扮演数字角色的聊天助手。\n\n{{profile}}\n\n{{length_rule}}'
    : '你是群聊回复过滤器。\n\n[角色设定摘要]\n{{relevance_profile}}\n\n[近期消息]\n{{context_text}}\n\n[新消息]\n{{sender_name}}: {{message_text}}';
  const content = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : fallback;

  if (kind === 'system') {
    systemPromptTemplateCache = content;
    systemPromptTemplateCacheAt = Date.now();
  } else {
    relevancePromptTemplateCache = content;
    relevancePromptTemplateCacheAt = Date.now();
  }
  return content;
}

function resolveMemberByQQ(profile: string, userId: string): { canonicalName?: string; memberLine?: string } {
  const map = parseMemberMapFromProfile(profile);
  const canonicalName = map.get(userId);
  if (!canonicalName) return {};
  return { canonicalName, memberLine: `${canonicalName}：${userId}` };
}

function extractImageUrls(message: unknown, rawMessage = ''): string[] {
  const urls = new Set<string>();
  const pushUrl = (value: unknown) => {
    const url = String(value || '').trim();
    if (!url) return;
    if (/^(https?:\/\/|data:|file:|\/|[a-zA-Z]:[\\/])/.test(url)) urls.add(url);
  };

  if (Array.isArray(message)) {
    for (const seg of message) {
      const item = seg as Record<string, unknown>;
      if (String(item.type ?? '') !== 'image') continue;
      const data = item.data as Record<string, unknown> | undefined;
      pushUrl(data?.url);
      pushUrl(data?.file);
      pushUrl(data?.path);
      pushUrl(data?.src);
    }
  }

  const raw = String(rawMessage || '');
  const matches = [...raw.matchAll(/\[CQ:image([^\]]*)\]/gi)];
  for (const match of matches) {
    const attrs = String(match[1] || '');
    pushUrl(attrs.match(/(?:^|,)url=([^,\]]+)/i)?.[1]);
    pushUrl(attrs.match(/(?:^|,)file=([^,\]]+)/i)?.[1]);
    pushUrl(attrs.match(/(?:^|,)path=([^,\]]+)/i)?.[1]);
  }

  return [...urls];
}

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      const p = part as Record<string, unknown>;
      if (p.type === 'text') return String((p.data as Record<string, unknown> | undefined)?.text ?? '');
      return '';
    }).join('');
  }
  return '';
}

function cleanText(input: string): string {
  return input
    .replace(/\[CQ:image[^\]]*\]/gi, '[image]')
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function prefilterRelevance(rawMessage: string, text: string): { skip: boolean; score: number; reason: string } {
  const cleanRaw = cleanText(rawMessage || '');
  const cleanMsg = cleanText(text || '');

  if (!cleanMsg && /^\[image\]$/i.test(cleanRaw)) return { skip: true, score: 0.05, reason: 'prefilter_image_only' };
  if (cleanMsg.length > 0 && cleanMsg.length <= 3) return { skip: true, score: 0.1, reason: 'prefilter_too_short' };
  if (/^(6|66|666|草|啊|哦|嗯|哈|kk|ok|OK|\?{2,}|!{2,})$/i.test(cleanMsg)) return { skip: true, score: 0.1, reason: 'prefilter_water' };

  return { skip: false, score: 0.5, reason: 'pass' };
}

function isAtBot(event: OB11Message): boolean {
  const raw = event.raw_message || '';
  const selfId = pluginState.selfId;
  const evt = event as unknown as Record<string, unknown>;
  if (evt.atme === true) return true;
  if (selfId && raw.includes(`[CQ:at,qq=${selfId}]`)) return true;

  if (Array.isArray(evt.message) && selfId) {
    for (const seg of evt.message as Record<string, unknown>[]) {
      if (seg.type === 'at') {
        const qq = (seg.data as Record<string, unknown> | undefined)?.qq;
        if (String(qq ?? '') === selfId) return true;
      }
    }
  }
  return false;
}

async function isReplyToBot(ctx: NapCatPluginContext, event: OB11Message): Promise<boolean> {
  const evt = event as unknown as Record<string, unknown>;
  const reply = evt.reply as Record<string, unknown> | undefined;
  if (reply) {
    const sender = reply.sender as Record<string, unknown> | undefined;
    if (sender?.user_id && String(sender.user_id) === pluginState.selfId) return true;
  }

  const raw = event.raw_message || '';
  const match = raw.match(/\[CQ:reply,id=(\d+)\]/);
  if (!match) return false;

  try {
    const detail = await ctx.actions.call('get_msg', { message_id: Number(match[1]) }, ctx.adapterName, ctx.pluginManager.config) as { sender?: { user_id?: number | string } };
    return String(detail?.sender?.user_id ?? '') === pluginState.selfId;
  } catch {
    return false;
  }
}

function hitKeyword(text: string): boolean {
  try {
    return new RegExp(pluginState.config.keywordRegex, 'i').test(text);
  } catch (error) {
    pluginState.appendLog('error.log', { type: 'bad_keyword_regex', error: String(error) });
    return false;
  }
}

function computeFinalProbability(baseProb: number, score: number, threshold: number): number {
  if (score < threshold) return 0;
  const norm = (score - threshold) / Math.max(1 - threshold, 0.01);
  const curved = Math.pow(Math.max(0, Math.min(1, norm)), 1.5);
  return Math.max(0, Math.min(baseProb, baseProb * curved));
}

async function fetchRecentGroupContext(ctx: NapCatPluginContext, groupId: string, profile: string, excludeMessageId?: string): Promise<string[]> {
  try {
    const data = await ctx.actions.call('get_group_msg_history', { group_id: Number(groupId), count: 8 }, ctx.adapterName, ctx.pluginManager.config) as {
      messages?: Array<Record<string, unknown>>;
      list?: Array<Record<string, unknown>>;
    };
    const memberMap = parseMemberMapFromProfile(profile || '');

    const rows = (data?.messages || data?.list || [])
      .filter((msg) => {
        if (!excludeMessageId) return true;
        const mid = String(msg.message_id ?? msg.msg_id ?? msg.id ?? '');
        return mid !== excludeMessageId;
      })
      .map((msg) => {
        const userId = String(msg.user_id ?? (msg.sender as Record<string, unknown> | undefined)?.user_id ?? '');
        const sender = msg.sender as Record<string, unknown> | undefined;
        const name = resolveDisplayName({
          userId,
          card: String(sender?.card || ''),
          nickname: String(sender?.nickname || ''),
          memberMap,
        });
        const text = extractText(msg.message ?? msg.raw_message ?? msg.content ?? '');
        const clean = cleanText(String(text || msg.raw_message || ''));
        if (!clean) return '';
        return `${name}: ${clean}`;
      })
      .filter(Boolean);

    return rows.slice(-10);
  } catch {
    return [];
  }
}

function parseRelevanceScore(rawText: string): { score: number; reason: string } {
  const text = rawText.trim();
  try {
    const data = JSON.parse(text) as { relevance?: number; engagement?: number; value?: number; reason?: string };
    const r = Math.max(0, Math.min(10, Number(data.relevance ?? 5)));
    const e = Math.max(0, Math.min(10, Number(data.engagement ?? 5)));
    const v = Math.max(0, Math.min(10, Number(data.value ?? 5)));
    return {
      score: (r * 0.5 + e * 0.3 + v * 0.2) / 10,
      reason: String(data.reason ?? '').slice(0, 30),
    };
  } catch {
    return { score: 0.5, reason: 'parse_failed' };
  }
}

async function getRelevanceScore(input: {
  ctx: NapCatPluginContext;
  groupId: string;
  text: string;
  rawMessage: string;
  profile: string;
  senderName: string;
  messageId?: string;
}): Promise<{ score: number; reason: string }> {
  if (!pluginState.config.relevanceEnabled) return { score: 1, reason: 'disabled' };

  const contextRows = await fetchRecentGroupContext(input.ctx, input.groupId, input.profile, input.messageId);
  const messageText = cleanText(input.text || input.rawMessage || '');
  const contextText = contextRows.join('\n').slice(-12000);
  const cacheKey = `${input.groupId}|${messageText}|${contextText}`;
  const now = Date.now();
  const cache = relevanceCache.get(cacheKey);
  if (cache && now - cache.at < 5 * 60 * 1000) return { score: cache.score, reason: `${cache.reason}|cache` };

  const prompt = [
    renderTemplate(loadPromptTemplate('relevance'), {
      relevance_profile: loadAssistantProfile('relevance').slice(0, 4000),
      context_text: contextText || '无',
      sender_name: input.senderName,
      message_text: messageText,
    }),
  ].join('\n');

  try {
    const aiConfig = getAIConfig();
    const result = await simpleChat(aiConfig, '', prompt, {
      temperature: 0.1,
      maxTokens: 120,
      user: `qq:group:${input.groupId}:relevance:${input.messageId || Date.now()}`,
      modelKey: 'relevance',
    });

    const parsed = parseRelevanceScore(result.content || '');
    relevanceCache.set(cacheKey, { ...parsed, at: now });
    if (relevanceCache.size > 200) relevanceCache.delete(relevanceCache.keys().next().value as string);
    return parsed;
  } catch (error) {
    pluginState.appendLog('error.log', { type: 'relevance_timeout_or_error', error: String(error) });
    return { score: 0.5, reason: 'timeout_or_error' };
  }
}

function exportGroupEventToMemoryPipeline(event: OB11Message, text: string, rawMessage: string): void {
  try {
    if (!pluginState.config.groupEventExportEnabled) return;
    if (event.message_type !== 'group') return;

    const outPath = pluginState.resolveGroupEventExportPath();
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const userId = String(event.user_id ?? '');
    const profile = loadAssistantProfile('main');
    const memberMap = parseMemberMapFromProfile(profile);
    const payload = {
      source_event_id: String(event.message_id ?? ''),
      ts: new Date().toISOString(),
      author: resolveDisplayName({
        userId,
        card: String((event.sender as Record<string, unknown> | undefined)?.card || ''),
        nickname: String((event.sender as Record<string, unknown> | undefined)?.nickname || ''),
        memberMap,
      }),
      author_id: userId,
      text: (text || rawMessage || '').trim(),
      url: null,
      meta: {
        group_id: String(event.group_id ?? ''),
        message_id: String(event.message_id ?? ''),
      },
    };
    fs.appendFileSync(outPath, `${JSON.stringify(payload)}\n`, 'utf-8');
  } catch (error) {
    pluginState.appendLog('error.log', { type: 'group_event_export_error', error: String(error) });
  }
}

async function callAIModel(input: {
  sessionKey: string;
  userMessage: string;
  contextText: string;
  sender: {
    user_id: string;
    nickname: string;
    card: string;
    canonical_name?: string;
    member_profile_line?: string;
    group_id: string;
    message_id: string;
    raw_message: string;
  };
  images: string[];
  isGroup: boolean;
}): Promise<{ reply: string; usage?: unknown }> {
  const profile = loadAssistantProfile();
  const cfg = pluginState.config;
  const systemPrompt = renderTemplate(loadPromptTemplate('system'), {
    profile,
    length_rule: input.isGroup ? `群聊回复尽量不超过 ${cfg.groupMaxReplyChars} 字。` : '私聊回复长度不限。',
  });

  let userContent = [
    '[发送者信息]',
    JSON.stringify(input.sender, null, 2),
    '',
    input.contextText ? `[群聊上下文]\n${input.contextText}\n` : '',
    '[用户消息]',
    input.userMessage,
  ].join('\n');

  if (input.images.length > 0) {
    try {
      const aiConfig = getAIConfig();
      const descriptions = await describeImages(aiConfig, input.images);
      if (descriptions) userContent += `\n\n[图片内容]\n${descriptions}`;
    } catch (error) {
      pluginState.appendLog('error.log', { type: 'vision_error', error: String(error) });
    }
  }

  const aiConfig = getAIConfig();
  const result = await simpleChat(aiConfig, systemPrompt, userContent, {
    temperature: 0.7,
    user: input.sessionKey,
  });
  return { reply: result.content || '嗯嗯', usage: result.usage };
}

export async function handleMessage(ctx: NapCatPluginContext, event: OB11Message): Promise<void> {
  try {
    const rawMessage = event.raw_message || '';
    const text = extractText(event.message);
    const isGroup = event.message_type === 'group';

    exportGroupEventToMemoryPipeline(event, text, rawMessage);
    const groupId = String(event.group_id ?? '');
    const userId = String(event.user_id ?? '');
    if (isGroup && groupId && !pluginState.isGroupEnabled(groupId)) return;

    let shouldReply = false;
    let trigger = '';
    let relevanceScore: number | null = null;
    let relevanceReason = '';
    let finalProb: number | null = null;

    if (!isGroup) {
      shouldReply = true;
      trigger = 'private_always';
    } else {
      const atBot = isAtBot(event);
      const keyword = hitKeyword(text || rawMessage);
      const repliedToBot = await isReplyToBot(ctx, event);

      if (atBot) {
        shouldReply = true;
        trigger = 'at';
      } else if (keyword) {
        shouldReply = true;
        trigger = 'keyword';
      } else if (repliedToBot) {
        shouldReply = true;
        trigger = 'reply_bot';
      } else {
        const pre = prefilterRelevance(rawMessage, text);
        if (pre.skip) {
          relevanceScore = pre.score;
          relevanceReason = pre.reason;
          finalProb = computeFinalProbability(pluginState.config.groupReplyProbability, pre.score, pluginState.config.relevanceThreshold);
        } else {
          const throttleKey = `${groupId}:${userId}`;
          const now = Date.now();
          const lastAt = relevanceUserThrottle.get(throttleKey) || 0;
          if (now - lastAt < 20000) {
            relevanceScore = 0.2;
            relevanceReason = 'prefilter_throttle';
            finalProb = computeFinalProbability(pluginState.config.groupReplyProbability, 0.2, pluginState.config.relevanceThreshold);
          } else {
            relevanceUserThrottle.set(throttleKey, now);
            const profile = loadAssistantProfile('main');
            const memberMap = parseMemberMapFromProfile(profile);
            const sender = resolveDisplayName({
              userId,
              card: String((event.sender as Record<string, unknown> | undefined)?.card || ''),
              nickname: String((event.sender as Record<string, unknown> | undefined)?.nickname || ''),
              memberMap,
            });
            const rs = await getRelevanceScore({
              ctx,
              groupId,
              text,
              rawMessage,
              profile,
              senderName: sender,
              messageId: String(event.message_id ?? ''),
            });
            relevanceScore = rs.score;
            relevanceReason = rs.reason;
            finalProb = computeFinalProbability(pluginState.config.groupReplyProbability, rs.score, pluginState.config.relevanceThreshold);
          }
        }

        if (Math.random() < (finalProb ?? 0)) {
          shouldReply = true;
          trigger = 'random_relevance';
        }
      }
    }

    pluginState.appendLog('incoming.log', {
      message_type: event.message_type,
      trigger,
      shouldReply,
      group_id: groupId || null,
      user_id: userId || null,
      message_id: String(event.message_id ?? ''),
      raw_message: rawMessage,
      relevance_score: relevanceScore,
      relevance_reason: relevanceReason || null,
      final_probability: finalProb,
    });

    if (!shouldReply) return;

    const sessionKey = isGroup ? `qq:group:${groupId}:session` : `qq:user:${userId}:session`;
    const profile = loadAssistantProfile('main');
    const memberMap = parseMemberMapFromProfile(profile);
    const senderNickname = String((event.sender as Record<string, unknown> | undefined)?.nickname ?? '');
    const senderCard = String((event.sender as Record<string, unknown> | undefined)?.card ?? '');
    const canonicalName = resolveDisplayName({ userId, card: senderCard, nickname: senderNickname, memberMap });
    const member = resolveMemberByQQ(profile, userId);

    let contextText = '';
    if (isGroup) {
      const contextRows = await fetchRecentGroupContext(ctx, groupId, profile, String(event.message_id ?? ''));
      contextText = contextRows.join('\n');
    }

    const result = await callAIModel({
      sessionKey,
      userMessage: text || rawMessage,
      contextText,
      sender: {
        user_id: userId,
        nickname: senderNickname,
        card: senderCard,
        canonical_name: canonicalName,
        member_profile_line: member.memberLine || '',
        group_id: isGroup ? groupId : '',
        message_id: String(event.message_id ?? ''),
        raw_message: rawMessage,
      },
      images: extractImageUrls(event.message, rawMessage),
      isGroup,
    });

    const reply = cleanText(result.reply);
    const sent = await sendReply(ctx, event, reply);
    if (sent) {
      pluginState.incrementProcessed();
      pluginState.appendLog('outgoing.log', {
        sessionKey,
        trigger,
        message_type: event.message_type,
        group_id: groupId || null,
        user_id: userId,
        reply,
        usage: result.usage || null,
      });
    }
  } catch (error) {
    pluginState.appendLog('error.log', { type: 'handle_message_error', error: String(error) });
    pluginState.logger.error('处理消息时出错:', error);
  }
}
