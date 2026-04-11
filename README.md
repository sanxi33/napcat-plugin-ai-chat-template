# napcat-plugin-ai-chat-template

一个通用的 NapCat AI 群聊 / 私聊模板插件。

它来自对实际项目的源码级整理，适合作为你自己的角色化聊天插件起点：提示词全部外置、动态记忆可独立维护、相关性评分可控，并且自带可直接使用的 WebUI 管理面板。

![仪表盘预览](./assets/screenshots/dashboard.png)

## 适用场景

- 需要在 QQ 群聊 / 私聊中扮演一个数字角色
- 需要 `@机器人`、关键词、回复机器人消息、随机接话这些基础触发逻辑
- 需要相关性评分来控制“该不该回”
- 需要把人设、 Prompt、动态记忆从代码中拆出去
- 需要 WebUI 直接管理配置和 Prompt 文件

## 特性

- 支持群聊 / 私聊两种会话模式
- 支持 `@机器人`、关键词、回复机器人消息触发
- 支持基于相关性评分的随机接话
- 支持图片理解
- 支持群维度启用 / 禁用
- 支持群聊事件导出为 JSONL
- 支持在 WebUI 中直接编辑 Prompt / Profile 文件

## WebUI 预览

### 插件配置

![插件配置预览](./assets/screenshots/config.png)

### Prompt 文件编辑

![Prompt 文件预览](./assets/screenshots/prompt-files.png)

### 群管理

![群管理预览](./assets/screenshots/groups.png)

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

这样可以把主回复和相关性评分的人设分开，同时共享同一份动态记忆。

## 快速开始

### 方式一：作为现成插件安装

适合只想用模板，不打算修改源码的人。

1. 打开 Releases，下载最新的 `napcat-plugin-ai-chat-template.zip`
2. 在 NapCat 插件管理中导入压缩包
3. 启动插件一次，让它自动生成默认的 prompt / profile 文件
4. 在 WebUI 中填写 `aiConfigPath`，或指向你自己的 AI 配置文件
5. 根据需要编辑 Prompt 文件页中的人设和模板

### 方式二：从源码开发

适合准备基于这个模板继续开发自己插件的人。

1. 安装依赖

```powershell
pnpm install
```

2. 构建插件

```powershell
pnpm run build
```

3. 使用构建产物

构建完成后，运行产物位于：

- `dist/index.mjs`
- `dist/package.json`
- `dist/webui/index.html`
- `dist/templates/*`

你可以：

- 将这些文件打包成 zip 导入 NapCat
- 或手动放入 NapCat 的插件目录

4. 按需修改示例配置和模板文件

- [config.example.json](./config.example.json)
- [templates/assistant_profile.md](./templates/assistant_profile.md)
- [templates/assistant_memory.md](./templates/assistant_memory.md)
- [templates/assistant_profile_relevance.md](./templates/assistant_profile_relevance.md)
- [templates/system_prompt.md](./templates/system_prompt.md)
- [templates/relevance_prompt.md](./templates/relevance_prompt.md)
- [templates/ai-model.example.json](./templates/ai-model.example.json)

## AI 配置说明

这个模板不会自带可直接使用的模型密钥。

你需要准备一份自己的 AI 配置文件。可以从这里开始：

- [templates/ai-model.example.json](./templates/ai-model.example.json)

推荐做法：

1. 复制 `templates/ai-model.example.json`
2. 填入你自己的 `apiBaseUrl`、`apiKey`、`model`
3. 在插件配置里把 `aiConfigPath` 指向这份文件

如果不配置真实可用的 AI 文件，插件结构虽然能启动，但聊天功能不会真正可用。

## 第一次启动后会生成什么

插件第一次运行时，会自动生成或初始化这些文件：

- `assistant_profile.md`
- `assistant_memory.md`
- `assistant_profile_relevance.md`
- `system_prompt.md`
- `relevance_prompt.md`

后续你可以在 WebUI 的 “Prompt 文件” 页面直接编辑它们，不需要手改源码。

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
