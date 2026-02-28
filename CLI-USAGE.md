# Oclaw CLI 使用指南

## 编译和测试

### 1. 构建项目

```bash
# 构建 Vite + Electron（必须先执行）
pnpm build:vite
```

### 2. 测试 CLI

```bash
# 使用便捷脚本
pnpm cli help
pnpm cli status
pnpm cli gw --help

# 或直接使用 electron
./node_modules/.bin/electron dist-electron/main/index.js help
```

## CLI 新功能

### 命令别名
```bash
pnpm cli st              # status
pnpm cli gw status       # gateway status
pnpm cli pv list         # provider list
pnpm cli ch list         # channel list
pnpm cli sk status       # skill status
pnpm cli cr list         # cron list
pnpm cli ct sessions     # chat sessions
pnpm cli hub list        # clawhub list
pnpm cli oc status       # openclaw status
```

### 输出模式
```bash
# JSON 输出（适合脚本）
pnpm cli status --json

# 安静模式（最小输出）
pnpm cli status --quiet

# 详细模式（调试日志）
pnpm cli status --verbose
```

### 环境变量
```bash
# 设置默认输出格式
export OCLAW_OUTPUT=json
pnpm cli status

# 启用详细日志
export OCLAW_VERBOSE=1
pnpm cli gateway start

# 安静模式
export OCLAW_QUIET=1
pnpm cli provider list
```

### Shell 自动补全
```bash
# Bash
eval "$(pnpm cli completion bash)"

# Zsh
eval "$(pnpm cli completion zsh)"

# 永久启用（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'eval "$(pnpm cli completion bash)"' >> ~/.bashrc
```

## 示例

### 查看帮助
```bash
pnpm cli help                    # 顶层帮助
pnpm cli gateway --help          # 命令帮助
pnpm cli gw --help               # 使用别名
```

### 管理 Provider
```bash
pnpm cli pv list                 # 列出所有 provider
pnpm cli pv list --json          # JSON 格式
pnpm cli pv save '{"id":"my-openai","name":"OpenAI","type":"openai"}' --api-key sk-xxx
pnpm cli pv set-default my-openai
```

### Gateway 操作
```bash
pnpm cli gw status               # 查看状态
pnpm cli gw start                # 启动（带进度指示器）
pnpm cli gw restart              # 重启
pnpm cli gw rpc sessions.list '{"limit":10}'
```

### Cron 任务
```bash
pnpm cli cr list                 # 列出任务（表格格式）
pnpm cli cr trigger abc123       # 触发任务（带进度指示器）
```

### 技能管理
```bash
pnpm cli sk status               # 查看技能状态（表格格式）
pnpm cli hub search "web"        # 搜索技能
pnpm cli hub install my-skill    # 安装技能（带进度指示器）
```

## 完整构建和打包

```bash
# 完整构建（包括打包 OpenClaw）
pnpm build

# 打包应用
pnpm package:mac     # macOS
pnpm package:win     # Windows
pnpm package:linux   # Linux

# 打包后的 CLI 使用
./dist/mac/Oclaw.app/Contents/MacOS/Oclaw help
./dist/mac/Oclaw.app/Contents/MacOS/Oclaw st --json
```

## 开发工作流

```bash
# 1. 修改代码后重新构建
pnpm build:vite

# 2. 测试 CLI
pnpm cli help

# 3. 运行测试
pnpm test

# 4. 类型检查
pnpm typecheck

# 5. 代码检查
pnpm lint
```

## 架构说明

CLI 代码位于 `electron/main/cli/` 目录：

```
electron/main/cli/
├── index.ts          # 入口 + 命令路由
├── args.ts           # 参数解析 + 别名
├── parse.ts          # 解析工具
├── output.ts         # 输出格式化 + 进度指示器
├── help.ts           # 帮助系统
├── types.ts          # 类型定义
└── commands/         # 各命令处理器
    ├── status.ts
    ├── gateway.ts
    ├── provider.ts
    ├── channel.ts
    ├── skill.ts
    ├── cron.ts
    ├── chat.ts
    ├── clawhub.ts
    ├── openclaw.ts
    ├── uv.ts
    └── completion.ts
```

测试文件位于 `tests/unit/cli/`：
- `args.test.ts` - 参数解析和别名测试
- `parse.test.ts` - 解析工具测试
- `output.test.ts` - 输出格式化测试
- `help.test.ts` - 帮助系统测试

共 97 个测试用例，全部通过 ✅
