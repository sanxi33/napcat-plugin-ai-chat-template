import { useCallback, useEffect, useMemo, useState } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { PromptFileKind, PromptFilesPayload } from '../types'
import { IconFileText, IconRefresh, IconSave } from '../components/icons'

const FILE_META: Record<PromptFileKind, { title: string; desc: string }> = {
    profile: {
        title: '主人设文件',
        desc: '定义角色身份、背景、风格和备注映射',
    },
    memory: {
        title: '动态记忆文件',
        desc: '记录近期摘要、热门话题和长期记忆',
    },
    relevanceProfile: {
        title: '相关性人设文件',
        desc: '给相关性评分模型看的精简版设定',
    },
    systemPrompt: {
        title: '系统 Prompt 模板',
        desc: '控制主回复模型的系统提示词骨架',
    },
    relevancePrompt: {
        title: '相关性 Prompt 模板',
        desc: '控制相关性评分模型的提示词骨架',
    },
}

export default function PromptFilesPage() {
    const [files, setFiles] = useState<PromptFilesPayload | null>(null)
    const [active, setActive] = useState<PromptFileKind>('profile')
    const [drafts, setDrafts] = useState<Partial<Record<PromptFileKind, string>>>({})
    const [saving, setSaving] = useState<PromptFileKind | null>(null)

    const fetchFiles = useCallback(async () => {
        try {
            const res = await noAuthFetch<PromptFilesPayload>('/prompt-files')
            if (res.code === 0 && res.data) {
                setFiles(res.data)
                setDrafts({
                    profile: res.data.profile.content,
                    memory: res.data.memory.content,
                    relevanceProfile: res.data.relevanceProfile.content,
                    systemPrompt: res.data.systemPrompt.content,
                    relevancePrompt: res.data.relevancePrompt.content,
                })
            }
        } catch {
            showToast('读取 Prompt 文件失败', 'error')
        }
    }, [])

    useEffect(() => {
        fetchFiles()
    }, [fetchFiles])

    const currentMeta = FILE_META[active]
    const currentFile = files?.[active]
    const currentDraft = drafts[active] ?? ''

    const isDirty = useMemo(() => {
        if (!files) return false
        return currentDraft !== files[active].content
    }, [active, currentDraft, files])

    const saveCurrent = useCallback(async () => {
        if (!files) return
        setSaving(active)
        try {
            await noAuthFetch(`/prompt-files/${active}`, {
                method: 'POST',
                body: JSON.stringify({ content: currentDraft }),
            })
            setFiles((prev) => prev ? {
                ...prev,
                [active]: {
                    ...prev[active],
                    content: currentDraft,
                },
            } : prev)
            showToast('文件已保存', 'success')
        } catch {
            showToast('保存失败', 'error')
        } finally {
            setSaving(null)
        }
    }, [active, currentDraft, files])

    if (!files || !currentFile) {
        return (
            <div className="flex items-center justify-center h-64 empty-state">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner text-primary" />
                    <div className="text-gray-400 text-sm">正在读取 Prompt 文件...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {(Object.keys(FILE_META) as PromptFileKind[]).map((kind) => (
                    <button
                        key={kind}
                        className={`btn text-xs ${active === kind ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActive(kind)}
                    >
                        {FILE_META[kind].title}
                    </button>
                ))}
                <button className="btn btn-ghost text-xs" onClick={fetchFiles}>
                    <IconRefresh size={13} />
                    重新读取
                </button>
            </div>

            <div className="card p-5 hover-lift">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <IconFileText size={16} className="text-gray-400" />
                            {currentMeta.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">{currentMeta.desc}</p>
                        <p className="text-[11px] text-gray-400 mt-2 break-all">路径：{currentFile.path}</p>
                    </div>
                    <button className="btn btn-primary text-xs" onClick={saveCurrent} disabled={!isDirty || saving === active}>
                        <IconSave size={13} />
                        {saving === active ? '保存中...' : '保存'}
                    </button>
                </div>

                <textarea
                    className="input-field min-h-[420px] font-mono text-xs leading-6"
                    value={currentDraft}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [active]: e.target.value }))}
                />
            </div>
        </div>
    )
}
