# napcat-plugin-ai-chat-template 架构说明

## 目标

这个模板用于快速搭建 NapCat 上的 AI 群聊 / 私聊插件。

适合需要以下能力的场景：

- 角色化回复
- 群聊随机接话
- 相关性评分
- Prompt 外置
- WebUI 管理配置和 Prompt 文件

## 核心结构

- `src/index.ts`
  插件生命周期入口
- `src/core/state.ts`
  配置、路径解析、状态缓存
- `src/handlers/message-handler.ts`
  消息处理与模型调用
- `src/services/api-service.ts`
  WebUI API
- `src/lib/`
  AI 配置、AI 调用、视觉理解、QQ 身份辅助
- `src/utils/prompt-utils.ts`
  Prompt 模板渲染与动态记忆拼接

## Prompt 文件体系

- `assistant_profile.md`
  静态基础人设
- `assistant_memory.md`
  动态记忆
- `assistant_profile_relevance.md`
  相关性评分专用的人设摘要
- `system_prompt.md`
  主回复系统 Prompt 模板
- `relevance_prompt.md`
  相关性评分 Prompt 模板

推荐运行时拼装方式：

- 主回复：`assistant_profile.md + assistant_memory.md`
- 相关性评分：`assistant_profile_relevance.md + assistant_memory.md`

## WebUI

模板自带以下页面：

- 仪表盘
- 插件配置
- Prompt 文件
- 群管理

## 构建

- 主插件通过 `vite build` 生成 `dist/index.mjs`
- WebUI 在主构建时自动触发打包
- 适合后续接入 GitHub Release 工作流
