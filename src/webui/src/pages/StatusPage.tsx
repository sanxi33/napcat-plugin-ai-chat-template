import { useEffect, useState } from 'react';
import type { PluginStatus } from '../types';
import { IconPower, IconClock, IconActivity, IconDownload, IconRefresh, IconTerminal } from '../components/icons';

interface StatusPageProps {
  status: PluginStatus | null;
  onRefresh: () => void;
}

function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}天 ${hours}小时 ${minutes}分 ${secs}秒`;
  if (hours > 0) return `${hours}小时 ${minutes}分 ${secs}秒`;
  if (minutes > 0) return `${minutes}分 ${secs}秒`;
  return `${secs}秒`;
}

export default function StatusPage({ status, onRefresh }: StatusPageProps) {
  const [displayUptime, setDisplayUptime] = useState('-');
  const [syncInfo, setSyncInfo] = useState<{ baseUptime: number; syncTime: number } | null>(null);

  useEffect(() => {
    if (status?.uptime !== undefined && status.uptime > 0) {
      setSyncInfo({ baseUptime: status.uptime, syncTime: Date.now() });
    }
  }, [status?.uptime]);

  useEffect(() => {
    if (!syncInfo) {
      setDisplayUptime('-');
      return;
    }
    const update = () => setDisplayUptime(formatUptime(syncInfo.baseUptime + (Date.now() - syncInfo.syncTime)));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [syncInfo]);

  if (!status) {
    return (
      <div className="flex items-center justify-center h-64 empty-state">
        <div className="flex flex-col items-center gap-3">
          <div className="loading-spinner text-primary" />
          <div className="text-gray-400 text-sm">正在获取插件状态...</div>
        </div>
      </div>
    );
  }

  const { config, stats } = status;
  const statCards = [
    {
      label: '插件状态',
      value: config.enabled ? '运行中' : '已停用',
      icon: <IconPower size={18} />,
      color: config.enabled ? 'text-emerald-500' : 'text-red-400',
      bg: config.enabled ? 'bg-emerald-500/10' : 'bg-red-500/10',
    },
    {
      label: '运行时长',
      value: displayUptime,
      icon: <IconClock size={18} />,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: '今日处理',
      value: String(stats.todayProcessed),
      icon: <IconActivity size={18} />,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: '累计处理',
      value: String(stats.processed),
      icon: <IconDownload size={18} />,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {statCards.map((card) => (
          <div key={card.label} className="card p-4 hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bg} ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-5 hover-lift animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <IconTerminal size={16} className="text-gray-400" />
            基础信息
          </h3>
          <button onClick={onRefresh} className="btn-ghost btn text-xs px-2.5 py-1.5">
            <IconRefresh size={13} />
            刷新
          </button>
        </div>
        <div className="space-y-3">
          <InfoRow label="AI 配置路径" value={config.aiConfigPath || '(未设置)'} />
          <InfoRow label="主设定文件" value={config.profilePath} />
          <InfoRow label="动态记忆文件" value={config.memoryProfilePath} />
          <InfoRow label="系统 Prompt 模板" value={config.systemPromptPath} />
          <InfoRow label="关键词正则" value={config.keywordRegex} />
          <InfoRow label="随机回复概率" value={String(config.groupReplyProbability)} />
          <InfoRow label="相关性评分" value={config.relevanceEnabled ? '开启' : '关闭'} />
          <InfoRow label="相关性 Prompt 模板" value={config.relevancePromptPath} />
          <InfoRow label="事件导出" value={config.groupEventExportEnabled ? '开启' : '关闭'} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 gap-4">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-right break-all">{value}</span>
    </div>
  );
}
