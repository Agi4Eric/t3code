> [!IMPORTANT]
> **Unofficial Privacy-Hardened Fork / 非官方隐私安全精简版**
>
> This repository (`Agi4Eric/t3code`) is an **unofficial**, independently maintained privacy-hardened fork of [`pingdotgg/t3code`](https://github.com/pingdotgg/t3code). It is **not affiliated with, endorsed by, or officially associated with T3 Tools, Inc.**
>
> 本仓库（`Agi4Eric/t3code`）是基于 [`pingdotgg/t3code`](https://github.com/pingdotgg/t3code) 维护的**非官方隐私安全精简版**，与 T3 Tools, Inc. 无关，亦未获得其官方背书。

### 安全与隐私改动说明（中文）

相较于上游官方版本，本 Fork 移除了以下全部数据收集、外发追踪、后台凭据读取及上游自动更新行为（共修改 15 个核心文件，编译产物经验证不含任何 `ingest.t3.codes` 或 PostHog Key）：

1. **移除全部产品遥测与 PostHog 数据上报（原默认开启）**
   - [`apps/server/src/telemetry/AnalyticsService.ts`](./apps/server/src/telemetry/AnalyticsService.ts)：彻底移除硬编码的 PostHog Key、向 `https://ingest.t3.codes/batch/` 批量上报事件（心跳、对话轮次、模型/Token 用量、功能点击、MCP 调用等）以及后台定时刷新协程，全部替换为纯空实现（no-op）。
   - [`apps/server/src/telemetry/Identify.ts`](./apps/server/src/telemetry/Identify.ts)：停止在本地生成/持久化匿名追踪文件 `anonymous-id`，停止读取 `CLOUD_LINKED_USER_ID` 上报安装所有者信息。
   - [`apps/web/src/connection/platform.ts`](./apps/web/src/connection/platform.ts)、[`apps/server/src/ws.ts`](./apps/server/src/ws.ts)：停止在浏览器 `localStorage` 生成 `t3code:analytics-device-id`，并停止在 WebSocket 握手阶段读取或上报客户端设备/账户哈希。
2. **彻底关闭对话内容与轨迹上传通道（Agent Feedback）**
   - [`apps/server/src/feedback/FeedbackStore.ts`](./apps/server/src/feedback/FeedbackStore.ts)：永久禁用 `agent.feedback` 提交与外发逻辑，确保对话轮次轨迹或消息文本不会以反馈报告形式离开本机。
3. **关闭 Relay OTLP 链路追踪外发（Axiom）**
   - [`packages/shared/src/otelEnvironment.ts`](./packages/shared/src/otelEnvironment.ts)、[`apps/server/src/cloud/relayTracing.ts`](./apps/server/src/cloud/relayTracing.ts)、[`apps/server/src/cloud/publicConfig.ts`](./apps/server/src/cloud/publicConfig.ts)、[`apps/web/src/cloud/publicConfig.ts`](./apps/web/src/cloud/publicConfig.ts)、[`apps/desktop/src/ipc/methods/window.ts`](./apps/desktop/src/ipc/methods/window.ts)：全链路禁用向外部 Axiom OTLP 端点发送 Relay 连接追踪。
4. **禁用后台读取外部工具钥匙串与凭据的额度探测**
   - [`apps/server/src/provider/antigravityUsageLimits.ts`](./apps/server/src/provider/antigravityUsageLimits.ts)：禁用后台读取系统钥匙串（`gemini:antigravity`）、`acp_token.json`、`antigravity-oauth-token` 及调用 Google OAuth / `userinfo` / `cloudcode-pa` 的额度探针。
   - [`apps/server/src/provider/claudeResetCredits.ts`](./apps/server/src/provider/claudeResetCredits.ts)：禁用后台读取 `.credentials.json` 与 `~/.claude.json` 查询重置额度的逻辑。
5. **禁用远程拉取上游模型清单与上游自动更新**
   - [`apps/server/src/provider/ModelManifest.ts`](./apps/server/src/provider/ModelManifest.ts)：仅使用随代码内置的 `BUNDLED_MODEL_MANIFEST`，不再在后台请求 `raw.githubusercontent.com/pingdotgg/t3code/.../model-manifest.json`。
   - [`apps/desktop/src/updates/DesktopUpdatePolicy.ts`](./apps/desktop/src/updates/DesktopUpdatePolicy.ts)、[`apps/server/src/cloud/selfUpdate.ts`](./apps/server/src/cloud/selfUpdate.ts)：禁用桌面端与服务端针对上游官方发布的自动更新，防止被覆盖回官方带遥测的版本。

---

### Privacy & Security Changes (English)

Compared to upstream `pingdotgg/t3code`, this fork strips all telemetry, conversation/feedback uploads, background credential/keychain probes, remote manifest fetches, and upstream auto-updates (compiled bundles verified free of `ingest.t3.codes` and PostHog keys):

1. **Product Analytics & Identity Tracking Removed (Previously Opt-Out / On by Default)**
   - [`apps/server/src/telemetry/AnalyticsService.ts`](./apps/server/src/telemetry/AnalyticsService.ts): Removed hardcoded PostHog key, `https://ingest.t3.codes/batch/` HTTP batching, and background flush loop; replaced with a strict no-op service.
   - [`apps/server/src/telemetry/Identify.ts`](./apps/server/src/telemetry/Identify.ts): Disabled persistent `anonymous-id` file generation and reading `CLOUD_LINKED_USER_ID` for owner telemetry.
   - [`apps/web/src/connection/platform.ts`](./apps/web/src/connection/platform.ts), [`apps/server/src/ws.ts`](./apps/server/src/ws.ts): Removed `localStorage["t3code:analytics-device-id"]` generation and client owner/device hash collection on WebSocket connections.
2. **Conversation / Feedback Upload Channel Disabled**
   - [`apps/server/src/feedback/FeedbackStore.ts`](./apps/server/src/feedback/FeedbackStore.ts): Permanently disabled `agent.feedback` submission and outbound delivery so no turn outlines or conversation text can leave the machine.
3. **Relay OTLP Tracing (Axiom) Disabled**
   - [`packages/shared/src/otelEnvironment.ts`](./packages/shared/src/otelEnvironment.ts), [`apps/server/src/cloud/relayTracing.ts`](./apps/server/src/cloud/relayTracing.ts), [`apps/server/src/cloud/publicConfig.ts`](./apps/server/src/cloud/publicConfig.ts), [`apps/web/src/cloud/publicConfig.ts`](./apps/web/src/cloud/publicConfig.ts), [`apps/desktop/src/ipc/methods/window.ts`](./apps/desktop/src/ipc/methods/window.ts): Permanently disabled external relay tracing across server, web, and desktop.
4. **Background Credential / Keychain Quota Probes Disabled**
   - [`apps/server/src/provider/antigravityUsageLimits.ts`](./apps/server/src/provider/antigravityUsageLimits.ts): Disabled reading OS keyring (`gemini:antigravity`), `acp_token.json`, and `antigravity-oauth-token`, as well as outbound Google OAuth / `userinfo` / `cloudcode-pa` quota requests.
   - [`apps/server/src/provider/claudeResetCredits.ts`](./apps/server/src/provider/claudeResetCredits.ts): Disabled background reading of `.credentials.json` and `~/.claude.json` for reset-credit probing.
5. **Remote Upstream Manifest Fetch & Auto-Updates Disabled**
   - [`apps/server/src/provider/ModelManifest.ts`](./apps/server/src/provider/ModelManifest.ts): Uses `BUNDLED_MODEL_MANIFEST` only; no background fetches to `raw.githubusercontent.com/pingdotgg/t3code/.../model-manifest.json`.
   - [`apps/desktop/src/updates/DesktopUpdatePolicy.ts`](./apps/desktop/src/updates/DesktopUpdatePolicy.ts), [`apps/server/src/cloud/selfUpdate.ts`](./apps/server/src/cloud/selfUpdate.ts): Disabled upstream desktop and server self-updates so official telemetry-enabled releases cannot overwrite local builds.

#### Build Locally / 本地编译

```sh
curl -fsSL https://vite.plus | bash
vp i
vp run build:desktop
```

---

<details>
<summary>Original Upstream README / 原上游说明</summary>

<p align="center">
  <a href="https://t3.codes">
    <img src="./assets/prod/t3-black-web-icon-192x192.png" width="80" height="80" alt="T3 Code logo" />
  </a>
</p>

<h1 align="center">T3 Code</h1>

<p align="center">The open-source control plane for coding agents.</p>

<p align="center">
  <a href="https://t3.codes/download"><strong>Download</strong></a> ·
  <a href="https://apps.apple.com/us/app/t3-code-remote-claude-more/id6787819824">iOS</a> ·
  <a href="https://play.google.com/store/apps/details?id=com.t3tools.t3code">Android</a> ·
  <a href="https://app.t3.codes">Web</a> ·
  <a href="./docs/README.md">Docs</a> ·
  <a href="https://discord.gg/jn4EGJjrvv">Discord</a>
</p>

<p align="center">
  <a href="https://t3.codes">
    <img src="./.github/readme/hero.webp" width="100%" alt="T3 Code on desktop with a finished Claude thread, next to the phone app asking to approve a command from Codex" />
  </a>
</p>

T3 Code runs the coding agents on your machine and gives them one fast interface. Start a thread at your desk, then approve the next step from your phone.

It works with Claude Code, Codex, Cursor, OpenCode, Grok Build, Antigravity, Kiro, Pi, Muse Code, fx, and any [ACP](./docs/user/providers-acp.md) agent. If an agent is set up on your computer, T3 Code can control it.

## What you get

- **Your subscriptions.** T3 Code does not resell tokens. It drives the agents you are already signed in to.
- **Every agent in one place.** Change models in the middle of a thread. Let Claude hand a task to Codex.
- **Desktop, web, and phone.** One server, and every client shows the same threads. There are apps for iOS and Android.
- **Remote ready.** Run agents on any machine. Connect over your local network, Tailscale, or [T3 Connect](./docs/user/remote-access.md).
- **Git built in.** Each thread can work in its own worktree. Review the diff, then commit, push, and open a pull request with one button.
- **Fast.** Performance is a feature here. We measure it, and we treat a dropped frame as a bug.
- **Open.** Source code is MIT licensed. If you don't like something, fork it under your own branding (see [Trademarks and forks](#trademarks-and-forks)).

## Install

### Desktop app

[Download T3 Code](https://t3.codes/download) for macOS, Windows, or Linux. You can also use a package manager:

| Platform       | Command                                                              |
| -------------- | -------------------------------------------------------------------- |
| macOS          | `brew install --cask t3-code`                                        |
| Windows        | `winget install T3Tools.T3Code` or `scoop install extras/t3code`     |
| Arch Linux     | `yay -S t3code-bin`                                                  |
| Nix            | `nix profile add github:NixOS/nixpkgs/nixos-unstable#t3code`         |
| Debian, Ubuntu | `.deb` from [Releases](https://github.com/pingdotgg/t3code/releases) |

### Command line

This installs the `t3` command. Run `t3` to start the server and open the web app.

```bash
curl -fsSL https://t3.codes/install.sh | sh
```

On Windows, in PowerShell:

```powershell
irm https://t3.codes/install.ps1 | iex
```

To try it once without an install, run `npx t3@latest`.

### Phone

Get the app from the [App Store](https://apps.apple.com/us/app/t3-code-remote-claude-more/id6787819824) or [Google Play](https://play.google.com/store/apps/details?id=com.t3tools.t3code). Then follow [remote access](./docs/user/remote-access.md) to connect it to your computer.

### Sign in to an agent

T3 Code needs one agent that is installed and signed in. For example, install [Claude Code](https://claude.com/product/claude-code) and run `claude auth login`, or install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`.

[Provider setup](./docs/user/install.md#providers) has the steps for each agent. [Install T3 Code](./docs/user/install.md) covers nightly builds, AppImage, WSL, and NixOS.

## "Wait, what are you selling me?"

Nothing. We built T3 Code because we wanted the best possible development experience with agents. We were inspired by existing solutions like the Codex desktop app, Conductor, Claude Desktop and Cursor Glass, but none met our bar.

We wanted something performant, remote-ready, and truly open. If we ever go the wrong direction, we want you to have everything you need to fork the source code and build the tool that you want, under your own name and branding.

## Documentation

- [Install and first run](./docs/user/install.md)
- [Remote access from a phone or another machine](./docs/user/remote-access.md)
- [Permission modes](./docs/user/permission-modes.md)
- [Source control](./docs/user/source-control.md)
- [Connect outside agents over MCP](./docs/user/outside-agents.md)
- [FAQ](./docs/user/faq.md)

[All docs](./docs/README.md) has the full list.

## Contributing

We have limited review capacity. Small, focused fixes are the most likely to be merged. Features need an approved discussion first.

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) before you report a bug or open a pull request.
- Put feature requests in [Ideas](https://github.com/pingdotgg/t3code/discussions/categories/ideas).
- Build from source with the [development runbook](./docs/operations/00_development.md#first-checkout). The [architecture overview](./docs/internals/01_architecture.md) explains how it works.
- Get help in [Discord](https://discord.gg/jn4EGJjrvv).

## License

The source code in this repository is licensed under the [MIT License](./LICENSE).

## Trademarks and forks

The MIT license applies **only to the source code**. It does not grant any rights to T3 Tools, Inc.'s trademarks, branding, or trade dress, including the **T3 Code** name, wordmark, logos, and application icons.

If you fork, redistribute, or build on T3 Code's source code:

- **Use your own branding.** Replace the T3 Code name, wordmark, logos, and application icons in any public fork, redistributed build, website, package, or app store listing.
- **Be explicitly clear that your project is unofficial.** Do not use the T3 Code name, wordmark, logo, or branding in your own projects without making it unmistakably clear that your project is unofficial and not affiliated with or endorsed by T3 Tools, Inc.

Using our name, wordmark, logo, or branding in a way that suggests official status or affiliation is trademark infringement and unlawful. **Any project indicating or implying that it is an official version of T3 Code when it is not will be pursued to the full extent of the law.**

See [TRADEMARK.md](./TRADEMARK.md) for the full trademark and branding policy.

</details>
