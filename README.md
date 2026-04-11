# napcat-plugin-ai-chat-template

一个为 NapCat 设计的 AI 聊天模板插件。适合想先把 AI 聊天能力装起来，再慢慢改人设、Prompt 和交互方式的用户。

![仪表盘预览](./assets/screenshots/dashboard.png)

## 适用场景

- 想在 NapCat 中快速装一个能用的 AI 聊天插件
- 希望同时支持群聊和私聊
- 想通过 WebUI 修改人设、记忆和 Prompt 文件
- 后续有继续二开的打算，但不想一上来就从空白脚手架开始

## 环境要求

- 已部署 NapCat，并了解如何导入插件包 (`.zip`)
- 需要准备一个可用的大模型配置
- 视觉模型、相关性评分模型等高级能力不是必须项，后续再配也可以

## 安装步骤

### 1. 下载插件

前往 [Releases](https://github.com/sanxi33/napcat-plugin-ai-chat-template/releases) 页面，下载最新版本的 `napcat-plugin-ai-chat-template.zip`。

### 2. 导入 NapCat

在 NapCat 的插件管理界面中导入 zip 文件，并启用插件。

### 3. 配置模型

仓库里提供了一个模型配置示例文件：

- [templates/ai-model.example.json](./templates/ai-model.example.json)

复制一份后填入你自己的：

- `apiBaseUrl`
- `apiKey`
- `model`

然后在插件配置页中把 `aiConfigPath` 指向这份文件。

### 4. 保守默认值

插件默认是偏保守的配置，方便第一次判断是否真的跑通：

- `groupReplyProbability = 0`
- `relevanceEnabled = false`

这表示群聊里不会默认随机插话，只会在明确触发时回复。

## 使用方法

插件默认支持以下交互方式：

- 群聊中 `@机器人`
- 回复机器人上一条消息
- 命中关键词时回复
- 私聊直接对话

如果模型配置正确，插件启用后就可以直接开始测试聊天。

## Prompt 与人设修改

第一次使用时，最建议先改的是：

1. `assistant_profile.md`
2. `system_prompt.md`

其余文件可以在后面再慢慢调：

- `assistant_memory.md`
- `assistant_profile_relevance.md`
- `relevance_prompt.md`

## 验证安装

建议按这个顺序确认插件是否工作正常：

1. 先在私聊中发送一条普通消息
2. 再在群聊中 `@` 机器人
3. 确认插件能正常回复后，再去改 Prompt 文件

## 快捷安装链接

NapCat 版本 ≥ `4.15.19` 时，可点击下方按钮快速跳转至插件安装页面：

<a href="https://napneko.github.io/napcat-plugin-index?pluginId=napcat-plugin-ai-chat-template" target="_blank">
  <img src="https://github.com/NapNeko/napcat-plugin-index/blob/pages/button.png?raw=true" alt="在 NapCat WebUI 中打开" width="170">
</a>

## 界面预览

### 插件配置

![插件配置预览](./assets/screenshots/config.png)

### Prompt 文件编辑

![Prompt 文件预览](./assets/screenshots/prompt-files.png)

### 群管理

![群管理预览](./assets/screenshots/groups.png)

## 已知限制

- 插件本身不附带可直接商用的大模型账号，需要你自行准备模型配置
- 视觉模型、随机接话、相关性评分等能力默认不开启
- 模板更偏向“先装起来再改”，不是一套现成固定角色插件

## License

MIT
