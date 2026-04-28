# napcat-plugin-ai-chat-template

AI 聊天模板插件，带 WebUI 管理。装好后能在群聊和私聊里跟机器人聊天，人设、Prompt、记忆文件都可以通过 Web 页面直接改，不用重启。适合想先把 AI 聊天跑起来，再慢慢调教风格的场景。

![仪表盘预览](./assets/screenshots/dashboard.png)

## 准备工作

需要一个可用的大模型配置（API 地址、Key、模型名）。视觉模型和相关性评分这些高级功能不是必需的，后面再补也行。

仓库里有个示例文件可以参考：[templates/ai-model.example.json](./templates/ai-model.example.json)

复制一份填上你的 `apiBaseUrl`、`apiKey`、`model`，然后在插件配置页把 `aiConfigPath` 指向这份文件。

## 下载安装

从 [Releases](https://github.com/sanxi33/napcat-plugin-ai-chat-template/releases) 下载最新 `napcat-plugin-ai-chat-template.zip`，在 NapCat 插件管理里导入并启用。

NapCat ≥ `4.15.19` 可以点这个按钮直接跳转：

<a href="https://napneko.github.io/napcat-plugin-index?pluginId=napcat-plugin-ai-chat-template" target="_blank">
  <img src="https://github.com/NapNeko/napcat-plugin-index/blob/pages/button.png?raw=true" alt="在 NapCat WebUI 中打开" width="170">
</a>

## 默认行为

插件默认偏保守：`groupReplyProbability = 0`，群聊不会随便插嘴，只有被 `@`、被回复、或命中关键词时才会回。私聊则是直接对话。模型配好之后启用就能测。

## 修改人设和 Prompt

最建议先改的两个文件：

- `assistant_profile.md`
- `system_prompt.md`

想进一步调的话还有：

- `assistant_memory.md`
- `assistant_profile_relevance.md`
- `relevance_prompt.md`

这些都可以在 WebUI 里直接编辑，改完即生效。

## 界面预览

### 插件配置

![插件配置预览](./assets/screenshots/config.png)

### Prompt 文件编辑

![Prompt 文件预览](./assets/screenshots/prompt-files.png)

### 群管理

![群管理预览](./assets/screenshots/groups.png)

## 说在前面

- 插件不送大模型账号，模型得自己准备
- 视觉、随机接话、相关性评分默认不开，需要自己折腾
- 这是一套通用模板，不是固定角色的现成聊天机器人

## License

MIT
