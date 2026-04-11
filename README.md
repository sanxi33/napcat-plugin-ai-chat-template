# napcat-plugin-ai-chat-template

一个通用的 NapCat AI 群聊 / 私聊模板插件。

它的设计目标很简单：

- 新用户可以先用最少的配置把插件跑起来
- 熟悉之后，再逐步启用图片理解、相关性评分、动态记忆等高级能力

![仪表盘预览](./assets/screenshots/dashboard.png)

## 你最需要先知道的事

**默认情况下，你只需要准备一个主模型，就可以开始使用这个模板。**

不需要一上来就理解三种模型。

### 默认最小可用方案

只需要：

1. 一个主模型配置
2. 一份主人设
3. 一次构建

就能跑起来。

下面这些都是可选增强项，不配也不影响基础聊天：

- 视觉模型
- 相关性评分专用模型
- 随机接话
- 动态记忆导出管道

## 最低可用方案

### 1. 安装依赖

```powershell
pnpm install
```

### 2. 构建插件

```powershell
pnpm run build
```

### 3. 准备 AI 配置

从这个最简文件开始：

- [templates/ai-model.example.json](./templates/ai-model.example.json)

它默认只包含一个 `main` 模型配置。

你只需要：

1. 复制它
2. 填入自己的 `apiBaseUrl`、`apiKey`、`model`
3. 在插件配置里把 `aiConfigPath` 指向这份文件

### 4. 调整主人设

先只改这两个文件就够了：

- [templates/assistant_profile.md](./templates/assistant_profile.md)
- [templates/assistant_memory.md](./templates/assistant_memory.md)

### 5. 导入 NapCat

构建产物位于：

- `dist/index.mjs`
- `dist/package.json`
- `dist/webui/index.html`
- `dist/templates/*`

你可以把这些文件打包成 zip，然后在 NapCat 插件管理中导入。

## 默认行为

为了降低新用户心智负担，这个模板默认是：

- `groupReplyProbability = 0`
- `relevanceEnabled = false`

这意味着：

- 群聊里只有明确触发才回复：
  - `@机器人`
  - 命中关键词
  - 回复机器人消息
- 不会默认随机插话

这样新用户先跑通，再逐步加高级能力，会更稳。

## 进阶能力

等你用顺手之后，再考虑这些增强项：

### 图片理解

如果你增加：

- `vision` 模型配置

插件就能给图片生成描述，再把描述拼进模型输入。

如果不配置视觉模型，插件仍然能正常运行，只是不会理解图片内容。

### 相关性评分

如果你开启：

- `relevanceEnabled = true`

插件才会开始在群聊里做“要不要随机接话”的判断。

此时有两种用法：

1. **简单用法**
   不额外配置 `relevance` 模型
   这时相关性评分会自动复用 `main` 模型

2. **进阶用法**
   再单独配置 `relevance` 模型
   这样可以把评分和主回复分离

### 高级 AI 配置示例

如果你想把主模型、视觉模型、相关性模型拆开，可以参考：

- [templates/ai-model.advanced.example.json](./templates/ai-model.advanced.example.json)

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

这意味着：

- 静态人设可以分开维护
- 动态记忆只维护一份

## WebUI 预览

### 插件配置

![插件配置预览](./assets/screenshots/config.png)

### Prompt 文件编辑

![Prompt 文件预览](./assets/screenshots/prompt-files.png)

### 群管理

![群管理预览](./assets/screenshots/groups.png)

## WebUI 页面

- 仪表盘
- 插件配置
- Prompt 文件
- 群管理

其中 “Prompt 文件” 页面可以直接编辑：

- 主人设
- 动态记忆
- 相关性人设
- 系统 Prompt
- 相关性 Prompt

## 仓库结构

- `src/`
  插件源码
- `src/webui/`
  WebUI 前端源码
- `templates/`
  默认模板文件
- `assets/screenshots/`
  README 展示图
- `tests/`
  基础单元测试
- `ARCHITECTURE.md`
  架构说明

## 测试

```powershell
pnpm test
```

## 发布

仓库已内置：

- GitHub Release 工作流
- NapCat 官方索引自动更新工作流

当你准备发布自己的版本时，只需要：

1. 更新模板内容和 `package.json`
2. 配置仓库 secret：`INDEX_PAT`
3. 推送 tag，例如 `v0.1.0`

## 参考文档

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [config.example.json](./config.example.json)

## License

MIT
