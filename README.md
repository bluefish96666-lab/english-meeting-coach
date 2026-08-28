# Dave · 英文会议陪练

一个纯前端静态网页，让一个会打断、会追问、会纠错的 AI「产品经理 Dave」陪你练英文会议口语。

> 全程中文界面，练习内容是英文。数据（API 设置 / 历史会话 / 表达收藏）只存在你本机浏览器 `localStorage`，不上传任何服务器。

## 功能

- 📘 **学习中心（私人导师）**：侧栏选初级/中级 + 工作/会话/旅行目标，一键生成 **4 周计划**；按目标生成 **核心 100 词/短语**（场景+优先级）。
- ⏱ **今日 20 分钟习惯**：听读 5 个高优表达 → 真对话纠错 → 复盘复习；记录连续天数。
- 🎭 **多角色扮演陪练**：产品经理 Dave、英文面试官、商务客户、雅思口语考官、旅行实景，顶部下拉一键切换。
- 🗂 **每个角色独立场景**：Dave 的 5 个会议场景 / 面试官 5 类问题 / 客户 5 类商务沟通 / 雅思 Part 1–3 / 旅行 5 场景。
- 📝 **逐轮中文纠错**：按 `① 你说的是 / ② 更地道的是（母语者说法） / ③ 为什么`；可点 **语法讲人话 / 练发音 / 记忆法** 加深。
- 🎤 **语音输入 / 输出**：麦克风说英文（Web Speech API），AI 回复自动朗读。
- ⌨️ **流式输出**：默认开启；模型不支持时自动回退。
- 🎧 **免提模式**：对方朗读结束 → 自动听你说 → 识别完自动发送。
- ⭐ **表达收藏**：纠错 ☆ 收藏；侧栏可朗读、练发音、生成记忆法。
- 🕘 **历史会话**：练习记录保存在本机。
- 🔌 **通用模型**：兼容 OpenAI 接口格式，Key 只存本机。
- 📱 **手机端**：窄屏侧栏收起，底部「学习 / 收藏 / 历史」抽屉。

## 在线 Demo（GitHub Pages）

仓库已推送 `gh-pages` 分支。若尚未开启 Pages，请到仓库 **Settings → Pages → Build and deployment**，Source 选 **Deploy from a branch**，Branch 选 `gh-pages` / `/ (root)`，保存后访问：

**https://bluefish96666-lab.github.io/english-meeting-coach/**

（也可在合并到 `main` 后，用 Actions 工作流 `.github/workflows/pages.yml` 自动发布。）

本地预览仍推荐：

```bash
# 方式一：Python（推荐，最简单）
cd english-meeting-coach
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 运行

这是纯静态页面，但**语音识别要求 `localhost` 或 `HTTPS`**，所以不要双击 `file://` 直接开。任选一种：

```bash
# 方式一：Python（推荐，最简单）
cd english-meeting-coach
python -m http.server 8000
# 浏览器打开 http://localhost:8000

# 方式二：Node
npx serve .
# 浏览器打开 http://localhost:3000
```

## 配置模型

打开页面右上角「⚙ 设置」，选一个预设或手动填：

| 服务 | Base URL | 模型名 |
| --- | --- | --- |
| DeepSeek（默认） | `https://api.deepseek.com/v1` | `deepseek-chat` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| xAI Grok | `https://api.x.ai/v1` | `grok-4.6` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| 通义 Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |

- **API Key**：填你自己的 Key，只存本机浏览器。
- **强制 JSON 输出**：默认开启（DeepSeek/OpenAI 支持）。若某个模型报错或返回格式混乱，关掉它，程序会自动兜底解析。
- **流式输出**：默认开启。关掉则恢复一次性请求。流式失败（不支持 SSE 等）会自动回退，不必手关。
- **免提模式**：默认关闭。保存开启后：若正在朗读，会等这次朗读结束（`onend`）再开麦；当前没有朗读才立即开始听。点 🎤 开始录音时才会取消 TTS。点 🎤 可随时打断。
- **测试连接**只用当前表单里的临时配置，**不会写入设置**。看到「连接成功，记得点保存」后再点「保存」才生效。
- 常见错误会映射成中文：401 Key 无效、404 模型名/Base URL 不对、429 限流。

## 使用流程

1. 顶部选角色（产品经理 / 面试官 / 客户 / 雅思考官 / 旅行），再选场景（或直接点欢迎列表里的数字）。旅行角色会按场景切换成地勤、海关官、航司柜台、餐厅服务员或酒店前台。
2. 对方说英文开场白 → 你打字或点 🎤 说话回应。若开了免提，开场白读完会自动听你说。
3. Dave 在角色里用英文追问/打断 → 然后跳出角色给出中文纠错。
4. 觉得某句「更地道的」有用，点 ☆ 收藏；会后可在「表达收藏」里朗读或点「朗读全部」。
5. 练得差不多了，点右上角「结束复盘」，让 AI 给出今日复盘 + 明天重点 + 最该补的一个表达。
6. 以后想回看：打开「历史」，点卡片即可恢复当时对话。

## 浏览器要求

- 语音识别/合成用 Web Speech API：**Chrome / Edge** 效果最好；Safari 语音输入支持有限。
- 必须通过 `localhost` 或 `HTTPS` 访问，麦克风才会被允许。

## 文件结构

```
english-meeting-coach/
├── index.html    # 页面结构
├── styles.css    # 样式
├── app.js        # 全部逻辑（提示词、LLM 调用、语音、存储）
└── README.md
```

想改角色的人设、语气或场景，打开 `app.js`，改顶部的 `PERSONAS`（每个角色含 `promptBody` 人设规则 + `scenarios` 场景/开场白 + `focusDims` 纠错侧重）即可；`buildSystemPrompt()` 负责把角色和通用纠错格式拼在一起。
