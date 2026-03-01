
<p align="center">
  <img src="src/assets/logo.svg" width="128" height="128" alt="Oclaw Logo" />
</p>

<h1 align="center">Oclaw</h1>

<p align="center">
  <strong>增强版 OpenClaw AI 代理桌面界面</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#与-clawx-的区别">与 ClawX 的区别</a> •
  <a href="#开发">开发</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-MacOS%20%7C%20Windows%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/electron-40+-47848F?logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/react-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

<p align="center">
  <a href="README.md">English</a> | 简体中文
</p>

---

## 概述

**Oclaw** 是一个基于 [ClawX](https://github.com/ValueCell-ai/ClawX) 的 OpenClaw AI 代理桌面应用，提供增强功能和优化。

> **注意**：本项目基于 ClawX（OpenClaw 官方桌面界面）构建。我们在保持上游兼容性的同时，添加了针对特定使用场景的独特功能。

---

## 与 ClawX 的区别

Oclaw 在 ClawX 基础上增加了以下增强功能：

### 🎨 **精致的视觉设计**
- 圆角图标设计，呈现现代、精致的外观
- 优化 macOS 应用图标尺寸，更好地融入系统
- 增强所有平台的 UI 一致性

### 🛠️ **双 CLI 系统**
两个独立的命令行界面，用于不同目的：

**`oclaw`** - 应用控制 CLI
```bash
oclaw status              # 检查应用状态
oclaw provider list       # 管理 AI 提供商
oclaw gateway start       # 控制网关
oclaw skill status        # 查看技能状态
```

**`openclaw`** - OpenClaw 平台 CLI
```bash
openclaw gateway start    # 启动网关服务
openclaw channels login   # 配置频道
openclaw agent --message  # 与代理交互
```

### 🔧 **增强的开发体验**
- 改进的构建脚本和自动化
- 更好的错误处理和日志记录
- 简化的开发工作流程

### 🌐 **本地化改进**
- 增强的中文语言支持
- 更好的多语言配置处理

---

## 功能特性

包含 ClawX 的所有功能，以及：

### ✨ Oclaw 独有功能

- **双 CLI 界面**：应用控制和 OpenClaw 平台操作的独立命令
- **精致图标**：所有平台采用现代圆角设计
- **增强品牌**：整个应用中一致的 Oclaw 品牌
- **优化构建**：改进的打包和分发流程

### 🎯 继承自 ClawX

- 零配置设置向导
- 与 AI 代理的智能聊天界面
- 多频道管理（Telegram、Discord、WhatsApp 等）
- 基于 Cron 的任务自动化
- 可扩展的技能系统和市场
- 与系统钥匙串的安全提供商集成
- 自适应主题（浅色/深色模式）

---

## 快速开始

### 系统要求

- **操作系统**：macOS 11+、Windows 10+ 或 Linux（Ubuntu 20.04+）
- **内存**：最低 4GB RAM（推荐 8GB）
- **存储**：1GB 可用磁盘空间

### 安装

#### 预构建版本（推荐）

从 [Releases](https://github.com/wang48/oclaw/releases) 页面下载适合您平台的最新版本。

#### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/wang48/oclaw.git
cd oclaw

# 初始化项目（安装依赖并下载 uv 二进制文件）
pnpm run init

# 以开发模式启动
pnpm dev
```

### 首次启动

**设置向导**将引导您完成：

1. **语言和地区** – 配置您的首选语言环境
2. **AI 提供商** – 输入您的 API 密钥（OpenAI、Anthropic 等）
3. **技能包** – 选择预配置的技能
4. **验证** – 测试您的配置

---

## CLI 使用

安装后，您可以访问两个 CLI 命令：

### 应用控制（`oclaw`）

控制 Oclaw 桌面应用：

```bash
# 查看帮助
oclaw --help

# 检查应用状态
oclaw status

# 管理 AI 提供商
oclaw provider list
oclaw provider save '{"id":"my-openai","name":"OpenAI","type":"openai"}' --api-key sk-xxx

# 控制网关
oclaw gateway status
oclaw gateway start
oclaw gateway stop

# 管理技能
oclaw skill status
oclaw skill enable web-search

# 管理定时任务
oclaw cron list
oclaw cron trigger <job-id>
```

### OpenClaw 平台（`openclaw`）

访问完整的 OpenClaw CLI：

```bash
# 网关操作
openclaw gateway --port 18789

# 频道管理
openclaw channels login
openclaw message send --target +1234567890 --message "你好"

# 代理交互
openclaw agent --to +1234567890 --message "总结这个" --deliver

# 查看完整文档
openclaw --help
```

---

## 开发

### 前置要求

- **Node.js**：22+（推荐 LTS）
- **包管理器**：pnpm 10+

### 可用命令

```bash
# 开发
pnpm dev                  # 启动热重载
pnpm lint                 # 运行 ESLint 并自动修复
pnpm typecheck            # TypeScript 验证

# 测试
pnpm test                 # 运行单元测试
pnpm test:e2e             # 运行 E2E 测试

# 构建和打包
pnpm build                # 完整生产构建
pnpm package:mac          # 打包 macOS（DMG + ZIP）
pnpm package:win          # 打包 Windows（NSIS 安装程序）
pnpm package:linux        # 打包 Linux（AppImage、deb、rpm）
```

### 技术栈

| 层级 | 技术 |
|-------|------------|
| 运行时 | Electron 40+ |
| UI 框架 | React 19 + TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态 | Zustand |
| 构建 | Vite + electron-builder |
| 测试 | Vitest + Playwright |

---

## 架构

Oclaw 使用**双进程架构**：

```
┌─────────────────────────────────────┐
│   Electron 主进程                    │
│   - 窗口和生命周期管理               │
│   - 网关进程监督                     │
│   - IPC 处理器                       │
│   - CLI 模式检测                     │
└──────────────┬──────────────────────┘
               │ IPC
               ▼
┌─────────────────────────────────────┐
│   React 渲染进程                     │
│   - UI 组件（React 19）              │
│   - 状态管理（Zustand）              │
│   - WebSocket 客户端                 │
└──────────────┬──────────────────────┘
               │ WebSocket (JSON-RPC)
               ▼
┌─────────────────────────────────────┐
│   OpenClaw 网关（子进程）            │
│   - AI 代理运行时                    │
│   - 频道管理                         │
│   - 技能执行                         │
└─────────────────────────────────────┘
```

---

## 与 ClawX 的关系

Oclaw 是 ClawX 的**分支**，具有以下关系：

- **上游**：[ClawX](https://github.com/ValueCell-ai/ClawX) - OpenClaw 官方桌面界面
- **下游**：Oclaw - 具有附加功能的增强版本

我们定期合并来自 ClawX 的上游更改，以保持与最新 OpenClaw 功能和改进的同步。

### 何时使用 Oclaw vs ClawX

**使用 Oclaw 如果您想要：**
- 用于应用控制和 OpenClaw 操作的双 CLI 系统
- 带圆角图标的精致视觉设计
- 增强的中文本地化
- 特定的定制和优化

**使用 ClawX 如果您想要：**
- OpenClaw 团队的官方版本
- 无修改的标准功能集
- 直接的上游支持

---

## 贡献

我们欢迎贡献！请遵循以下步骤：

1. Fork 仓库
2. 创建功能分支（`git checkout -b feature/amazing-feature`）
3. 提交您的更改并附上清晰的消息
4. 推送到您的分支
5. 打开 Pull Request

### 指南

- 遵循现有的代码风格（ESLint + Prettier）
- 为新功能编写测试
- 根据需要更新文档
- 保持提交原子化和描述性

---

## 致谢

Oclaw 基于以下项目构建：

- [ClawX](https://github.com/ValueCell-ai/ClawX) – 上游项目
- [OpenClaw](https://github.com/OpenClaw) – AI 代理运行时
- [Electron](https://www.electronjs.org/) – 跨平台桌面框架
- [React](https://react.dev/) – UI 组件库
- [shadcn/ui](https://ui.shadcn.com/) – 组件库

---

## 许可证

Oclaw 根据 [MIT 许可证](LICENSE) 发布。

---

<p align="center">
  <sub>基于 ClawX • 针对特定用例增强</sub>
</p>
