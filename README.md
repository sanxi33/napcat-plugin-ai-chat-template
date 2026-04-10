# napcat-plugin-ai-chat-template

一个通用的 NapCat AI 群聊 / 私聊模板仓库。

## 适用场景

- 需要在 QQ 群聊 / 私聊中扮演一个数字角色
- 需要 `@机器人`、关键词、回复机器人消息、随机接话这些基础触发逻辑
- 需要相关性评分来控制“该不该回”
- 需要把人设、Prompt、动态记忆从代码中拆出去
- 需要 WebUI 直接管理配置和 Prompt 文件

## 模板能力

- 群聊 / 私聊消息处理
- `@机器人`、关键词、回复机器人消息触发
- 基于相关性评分的随机接话
- 群维度启用 / 禁用控制
- 可选的群聊事件 JSONL 导出
- 可选的图片理解
- WebUI 仪表盘 / 配置页 / Prompt 文件页 / 群管理页

## Prompt 文件体系

模板默认使用以下 5 个文件：

- `assistant_profile.md`
- `assistant_memory.md`
- `assistant_profile_relevance.md`
- `system_prompt.md`
- `relevance_prompt.md`

推荐拼装方式：

- 主回复：`assistant_profile.md + assistant_memory.md`
- 相关性评分：`assistant_profile_relevance.md + assistant_memory.md`

这样既能把主回复和相关性评分的人设分开，又不会重复维护两份动态记忆。

## 仓库结构

- `src/`
  插件源码
- `src/webui/`
  WebUI 前端源码
- `templates/`
  默认模板文件
- `config.example.json`
  示例配置
- `tests/`
  基础单元测试
- `ARCHITECTURE.md`
  架构说明

## 默认模板文件

- [templates/assistant_profile.md](./templates/assistant_profile.md)
- [templates/assistant_memory.md](./templates/assistant_memory.md)
- [templates/assistant_profile_relevance.md](./templates/assistant_profile_relevance.md)
- [templates/system_prompt.md](./templates/system_prompt.md)
- [templates/relevance_prompt.md](./templates/relevance_prompt.md)
- [templates/ai-model.example.json](./templates/ai-model.example.json)


## 构建

主构建：

```powershell
pnpm run build
```

WebUI 单独构建：

```powershell
cd src/webui
pnpm run build
```

## 测试

```powershell
pnpm exec vitest run tests/prompt-utils.test.ts
```

## License

MIT
