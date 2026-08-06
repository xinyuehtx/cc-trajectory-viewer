# Claude Code 轨迹查看器（Trajectory Viewer）

[English](README.md) · **简体中文**

将 [Claude Code](https://claude.com/claude-code) 的**轨迹（trajectory）**文件——
即 Claude Code 写入 `~/.claude/projects/` 下的 `.jsonl` 会话日志——渲染为一个清爽、
易读的网页界面。你可以完整查看用户提问、助手回复、思考块、工具调用与工具结果的时间线；
当某次会话修改了文件时，还能以 **红/绿代码 diff** 的形式查看改动。

**在线演示：** <https://xinyuehtx.github.io/cc-trajectory-viewer/>（把 `.jsonl` 拖进页面即可）

> 🔗 **姊妹项目 —— [Harbor Trajectory Viewer](https://github.com/xinyuehtx/harbor-trajectory-viewer)**
> 同样的思路，面向 **Harbor 的 ATIF**（Agent Trajectory Interchange Format）`.json` 轨迹：
> 浏览器端查看时间线、Token / 成本指标、子智能体下钻与按文件的代码差异。
> _（[Harbor](https://github.com/harbor-framework/harbor) 是一个用于评估与改进 AI Agent 的框架，也是 Terminal-Bench 2.0 的官方运行器。）_
> 如果本工具对你有帮助，也欢迎给 **[harbor-trajectory-viewer](https://github.com/xinyuehtx/harbor-trajectory-viewer)** 点个 ⭐。

## 界面预览

| 时间线 | 差异 |
| --- | --- |
| ![时间线标签页](docs/screenshots/timeline-dark.png) | ![差异标签页](docs/screenshots/diffs-dark.png) |

浅色主题 —— 按文件聚合的 diff 与左侧目录树：

![差异标签页 · 浅色](docs/screenshots/diffs-light.png)

## 功能特性

- 🧭 **时间线（Timeline）标签页** —— 直接展示用户 / 助手消息与可折叠的思考块，并将**连续的工具调用聚合为可折叠的分组（cluster）**，让对话保持可读
- 🌈 **Diff 标签页** —— 每一处文件改动（`Edit`、`MultiEdit`、`Write`、`NotebookEdit`）都以带语法高亮的 diff 呈现，可在**单栏（unified）**与**双栏（split）**视图间切换
- 🔧 **工具调用** —— 精简摘要，输入可展开、（过长的）结果可截断；编辑类调用可一键跳转到对应 diff
- 🌐 **标注（面向 Agent 的 skill）** —— 生成一个 sidecar 文件，为**每个工具调用分组添加一行摘要**，并把**每条消息翻译**为目标语言，与原文并排展示
- 📊 **会话侧边栏** —— cwd、git 分支、模型、版本、token 用量，以及可跳转的已修改文件列表
- 🖥️ **两种打开方式** —— 从命令行打开文件，或在浏览器里拖拽 / 上传（纯静态，可部署到 GitHub Pages）
- 🔒 **纯本地** —— CLI 的所有内容都由 `localhost` 提供，不会上传任何数据

## 快速开始（命令行）

无需安装：

```bash
npx @xinyuehtx/cc-trajectory-viewer ~/.claude/projects/<项目>/<会话>.jsonl
```

或全局安装：

```bash
npm install -g @xinyuehtx/cc-trajectory-viewer
trajv path/to/session.jsonl
```

不带参数运行则以上传模式打开浏览器：

```bash
trajv
```

### 命令行用法

```
trajv [file.jsonl] [options]         打开一个轨迹文件（默认命令）
trajv extract <file.jsonl> [opts]    生成标注脚手架（.trajv.json）
trajv skill install [--dir <dir>]    把 Claude Code skill 安装到 .claude/skills

view 选项：
  -p, --port <n>   监听端口（默认 4179）
  -a, --ann <f>    要叠加的标注 JSON（默认使用同目录的 <file>.trajv.json）
      --no-open    不自动打开浏览器

extract 选项：
  -o, --out <f>    输出路径（默认 <file>.trajv.json）
      --lang <s>   记录在脚手架中的目标语言（例如 "简体中文"）

  -h, --help       显示帮助
  -v, --version    显示版本
```

## 轨迹文件在哪里？

Claude Code 会把每个会话保存在：

```
~/.claude/projects/<编码后的-cwd>/<sessionId>.jsonl
```

其中 `<编码后的-cwd>` 是项目绝对路径，把 `/` 和 `.` 都替换成 `-`。
打开当前项目最近一次会话：

```bash
DIR="$HOME/.claude/projects/$(pwd | sed 's#[/.]#-#g')"
trajv "$(ls -t "$DIR"/*.jsonl | head -1)"
```

## 仅用浏览器

查看器是纯静态 SPA，无需后端。打开
[在线演示](https://xinyuehtx.github.io/cc-trajectory-viewer/)（或你自己的 Pages 部署），
把 `.jsonl` 文件拖到页面上即可。也可以通过 `?src=<url>` 指向一个已托管的文件。

## 标注：摘要与翻译

查看器可以叠加一个同目录的 sidecar 文件 `*.trajv.json`，为**每组连续工具调用**添加一行
**摘要（summary）**，并为**每条消息**添加**翻译（translation）**。可由 `view-trajectory`
这个 skill 驱动 Agent 自动生成，也可以手动完成：

```bash
# 1) 生成脚手架 —— 枚举所有消息与工具调用分组，并正确绑定 key
trajv extract session.jsonl --lang "简体中文"

# 2) 在 session.jsonl.trajv.json 中填写空的 "summary" / "translation" 字段

# 3) 查看 —— 会自动加载同目录的 .trajv.json
trajv session.jsonl
```

摘要会显示在每个分组的标题栏；翻译显示在每条消息下方（可在侧边栏开关）。
只需编辑 `summary` / `translation` 字段——`id` / `original` / `tools` 字段用于把标注
绑定到界面上的正确位置，请勿改动。

## Claude Code skill

npm 包内置了一个位于 `skill/view-trajectory/` 的 skill。把它安装到项目级（或用户级）的
`.claude/skills/`：

```bash
trajv skill install            # 安装到 ./.claude/skills
trajv skill install --dir ~    # 安装到 ~/.claude/skills（对所有项目生效）
```

之后你就可以让 Claude Code 按需执行——例如 *“看看这个会话的轨迹”* 或
*“把这段轨迹总结并翻译成中文”*——它会定位最新的 `.jsonl`，按需生成标注，并打开查看器。

## 本地开发

```bash
npm install
npm run dev        # Vite 开发服务器（上传模式）
npm run build      # 产物输出到 dist/
node bin/cli.js path/to/session.jsonl   # 用真实构建产物测试 CLI
npm run typecheck
```

技术栈：React 18 + Vite + TypeScript。Markdown 使用 `marked` + `DOMPurify`，语法高亮使用
`highlight.js`，diff 使用 `diff`（jsdiff）。CLI（`bin/cli.js`）仅使用 Node.js 内置模块。

## 自行部署（GitHub Pages）

推送到 `main` 分支后，[Pages 工作流](.github/workflows/deploy-pages.yml) 会自动构建并部署。
在仓库设置中把 **Pages → Source 设为 GitHub Actions**。构建使用 `base: './'`，因此可在任意
子路径下工作。

## 发布到 npm

发布由 [`npm-publish.yml`](.github/workflows/npm-publish.yml) 自动完成：
先添加仓库密钥 `NPM_TOKEN`，然后创建一个 GitHub Release。也可手动发布：

```bash
npm login
npm publish --access public   # 通过 prepublishOnly 触发构建
```

## 轨迹格式

每一行都是一个 JSON 对象。查看器渲染 `user`、`assistant`、`system` 三类行，并忽略记账类的行
（`queue-operation`、`mode`、`file-history-*` 等）。助手的内容块为 `thinking` / `text` /
`tool_use`；工具结果会出现在之后的 `user` 行里，以 `tool_result` 块的形式存在，并通过 id
与对应的 `tool_use` 匹配。

## 许可证

MIT © xinyuehtx
