export interface PluginConfig {
  enabled: boolean;
  debug: boolean;
  groupConfigs: Record<string, GroupConfig>;

  aiConfigPath: string;

  keywordRegex: string;
  groupReplyProbability: number;
  groupMaxReplyChars: number;
  relevanceEnabled: boolean;
  relevanceModel: string;
  relevanceThreshold: number;
  relevanceTimeoutMs: number;
  relevanceProfilePath: string;
  relevancePromptPath: string;

  profilePath: string;
  memoryProfilePath: string;
  systemPromptPath: string;
  profileCacheSeconds: number;

  groupEventExportEnabled: boolean;
  groupEventExportPath: string;
}

export interface GroupConfig {
  enabled?: boolean;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}

export type PromptFileKind = 'profile' | 'memory' | 'relevanceProfile' | 'systemPrompt' | 'relevancePrompt';

export interface PromptFileItem {
  path: string;
  content: string;
}

export type PromptFilesPayload = Record<PromptFileKind, PromptFileItem>;
