import { useCallback, useEffect, useState } from 'react';
import { noAuthFetch } from '../utils/api';
import { showToast } from '../hooks/useToast';
import type { PluginConfig } from '../types';
import { IconTerminal } from '../components/icons';

export default function ConfigPage() {
  const [config, setConfig] = useState<PluginConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await noAuthFetch<PluginConfig>('/config');
      if (res.code === 0 && res.data) setConfig(res.data);
    } catch {
      showToast('获取配置失败', 'error');
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = useCallback(async (nextConfig: PluginConfig) => {
    setSaving(true);
    try {
      await noAuthFetch('/config', {
        method: 'POST',
        body: JSON.stringify(nextConfig),
      });
      setConfig(nextConfig);
      showToast('配置已保存', 'success');
    } catch {
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  }, []);

  const updateField = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) => {
    if (!config) return;
    const updated = { ...config, [key]: value };
    setConfig(updated);
    void saveConfig(updated);
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64 empty-state">
        <div className="flex flex-col items-center gap-3">
          <div className="loading-spinner text-primary" />
          <div className="text-gray-400 text-sm">加载配置中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 stagger-children">
      <div className="card p-5 hover-lift">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
          <IconTerminal size={16} className="text-gray-400" />
          基础配置
        </h3>
        <div className="space-y-5">
          <ToggleRow label="启用插件" desc="关闭后不响应任何消息" checked={config.enabled} onChange={(v) => updateField('enabled', v)} />
          <ToggleRow label="调试模式" desc="输出更详细的日志" checked={config.debug} onChange={(v) => updateField('debug', v)} />
          <InputRow label="AI 配置文件路径" desc="留空时需要手动提供可用配置文件" value={config.aiConfigPath} onChange={(v) => updateField('aiConfigPath', v)} />
          <InputRow label="关键词正则" desc="命中后强制触发回复" value={config.keywordRegex} onChange={(v) => updateField('keywordRegex', v)} />
          <InputRow label="随机回复概率" desc="群聊自然接话的基础概率" value={String(config.groupReplyProbability)} type="number" onChange={(v) => updateField('groupReplyProbability', Number(v) || 0)} />
          <InputRow label="群聊建议字数" desc="仅写入提示词，不会硬截断" value={String(config.groupMaxReplyChars)} type="number" onChange={(v) => updateField('groupMaxReplyChars', Number(v) || 20)} />
          <ToggleRow label="启用相关性评分" desc="先评分再决定是否随机回复" checked={config.relevanceEnabled} onChange={(v) => updateField('relevanceEnabled', v)} />
          <InputRow label="相关性模型别名" desc="留空则使用主模型" value={config.relevanceModel} onChange={(v) => updateField('relevanceModel', v)} />
          <InputRow label="相关性阈值" desc="低于阈值时不随机回复" value={String(config.relevanceThreshold)} type="number" onChange={(v) => updateField('relevanceThreshold', Number(v) || 0)} />
          <InputRow label="相关性超时(ms)" desc="超时会降级成中间分数" value={String(config.relevanceTimeoutMs)} type="number" onChange={(v) => updateField('relevanceTimeoutMs', Number(v) || 2000)} />
          <InputRow label="主设定文件路径" desc="相对 dataPath 或绝对路径" value={config.profilePath} onChange={(v) => updateField('profilePath', v)} />
          <InputRow label="动态记忆文件路径" desc="相对 dataPath 或绝对路径" value={config.memoryProfilePath} onChange={(v) => updateField('memoryProfilePath', v)} />
          <InputRow label="系统 Prompt 模板路径" desc="相对 dataPath 或绝对路径" value={config.systemPromptPath} onChange={(v) => updateField('systemPromptPath', v)} />
          <InputRow label="相关性设定文件路径" desc="相对 dataPath 或绝对路径" value={config.relevanceProfilePath} onChange={(v) => updateField('relevanceProfilePath', v)} />
          <InputRow label="相关性 Prompt 模板路径" desc="相对 dataPath 或绝对路径" value={config.relevancePromptPath} onChange={(v) => updateField('relevancePromptPath', v)} />
          <InputRow label="设定缓存秒数" desc="建议 30 秒" value={String(config.profileCacheSeconds)} type="number" onChange={(v) => updateField('profileCacheSeconds', Number(v) || 30)} />
          <ToggleRow label="导出群聊事件" desc="输出为 JSONL，供外部管道消费" checked={config.groupEventExportEnabled} onChange={(v) => updateField('groupEventExportEnabled', v)} />
          <InputRow label="事件导出路径" desc="相对 dataPath 或绝对路径" value={config.groupEventExportPath} onChange={(v) => updateField('groupEventExportPath', v)} />
        </div>
      </div>

      {saving && (
        <div className="saving-indicator fixed bottom-4 right-4 bg-primary text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="loading-spinner !w-3 !h-3 !border-[1.5px]" />
          保存中...
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="slider" />
      </label>
    </div>
  );
}

function InputRow({ label, desc, value, type = 'text', onChange }: { label: string; desc: string; value: string; type?: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  const handleBlur = () => {
    if (local !== value) onChange(local);
  };

  return (
    <div>
      <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{label}</div>
      <div className="text-xs text-gray-400 mb-2">{desc}</div>
      <input
        className="input-field"
        type={type}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
      />
    </div>
  );
}
