# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Oclaw is an Electron-based desktop application that provides a graphical interface for OpenClaw, an AI agent orchestration platform. The app wraps the OpenClaw runtime and exposes its capabilities through an intuitive UI, eliminating the need for command-line interaction.

## Architecture

### Dual-Process Design

Oclaw uses a **dual-process architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│   Electron Main Process             │
│   - Window & lifecycle management   │
│   - Gateway process supervision     │
│   - IPC handlers                    │
│   - System integration (tray, etc)  │
└──────────────┬──────────────────────┘
               │ IPC
               ▼
┌─────────────────────────────────────┐
│   React Renderer Process            │
│   - UI components (React 19)        │
│   - State management (Zustand)      │
│   - WebSocket client                │
└──────────────┬──────────────────────┘
               │ WebSocket (JSON-RPC)
               ▼
┌─────────────────────────────────────┐
│   OpenClaw Gateway (Child Process)  │
│   - AI agent runtime                │
│   - Channel management              │
│   - Skill execution                 │
└─────────────────────────────────────┘
```

### Gateway Manager (`electron/gateway/manager.ts`)

The Gateway Manager is the core component that manages the OpenClaw Gateway process lifecycle:

- **Process Management**: Spawns and supervises the OpenClaw Gateway as a child process
- **Connection Handling**: Establishes WebSocket connection with JSON-RPC protocol
- **Auto-Recovery**: Implements exponential backoff reconnection logic
- **Health Monitoring**: Periodic health checks and ping/pong keepalive
- **Device Identity**: Uses Ed25519 keypair for device authentication with scoped permissions

Key behaviors:
- On macOS packaged builds, uses Electron Helper binary to avoid extra dock icons
- Detects and kills orphaned gateway processes on startup
- Unloads system-managed launchctl services to prevent conflicts
- Injects provider API keys as environment variables when spawning the gateway
- Supports both owned processes and external gateway connections

### Communication Protocol

**Main ↔ Renderer**: Electron IPC (see `electron/preload/index.ts` for exposed channels)

**Renderer ↔ Gateway**: WebSocket with OpenClaw protocol format:
- Request: `{ type: "req", id: "...", method: "...", params: {...} }`
- Response: `{ type: "res", id: "...", ok: true/false, payload: {...} }`
- Event: `{ type: "event", event: "...", payload: {...} }`

Connection handshake uses challenge-response with device signature for authentication.

### State Management

Zustand stores in `src/stores/`:
- `gateway.ts` - Gateway connection status and RPC methods
- `chat.ts` - Chat messages and session management
- `channels.ts` - Channel configuration and status
- `skills.ts` - Skill installation and management
- `cron.ts` - Scheduled task management
- `providers.ts` - AI provider configuration
- `settings.ts` - App settings and preferences
- `update.ts` - Auto-update state

Stores communicate with the main process via IPC and with the Gateway via WebSocket RPC.

## Development Commands

```bash
# Setup
pnpm run init                 # Install dependencies and download uv binary

# Development
pnpm dev                      # Start Vite dev server + Electron with hot reload

# Code Quality
pnpm lint                     # Run ESLint with auto-fix
pnpm typecheck                # TypeScript type checking

# Testing
pnpm test                     # Run Vitest unit tests
pnpm test:e2e                 # Run Playwright E2E tests

# Building
pnpm build                    # Full production build (Vite + bundle OpenClaw + electron-builder)
pnpm build:vite               # Build renderer only
pnpm package:mac              # Package for macOS
pnpm package:win              # Package for Windows
pnpm package:linux            # Package for Linux

# Utilities
pnpm uv:download              # Download bundled uv binary for current platform
pnpm uv:download:all          # Download uv binaries for all platforms
pnpm icons                    # Generate app icons from source
```

## Tech Stack

- **Runtime**: Electron 40+, Node.js 22+
- **UI**: React 19, TypeScript, Tailwind CSS, shadcn/ui components
- **State**: Zustand
- **Build**: Vite, electron-builder
- **Testing**: Vitest (unit), Playwright (E2E)
- **Package Manager**: pnpm 10+

## Key File Locations

### Electron Main Process
- `electron/main/index.ts` - Application entry point
- `electron/main/ipc-handlers.ts` - IPC handler registration
- `electron/gateway/manager.ts` - Gateway process manager
- `electron/gateway/protocol.ts` - JSON-RPC protocol definitions
- `electron/utils/` - Utilities (storage, auth, paths, logging)

### React Renderer
- `src/App.tsx` - Root component with routing
- `src/pages/` - Page components (Chat, Dashboard, Channels, Skills, Cron, Settings)
- `src/stores/` - Zustand state stores
- `src/components/ui/` - shadcn/ui base components
- `src/components/layout/` - Layout components (Sidebar, MainLayout)

### Configuration
- `vite.config.ts` - Vite build configuration
- `vitest.config.ts` - Test configuration
- `tsconfig.json` - TypeScript config for renderer
- `tsconfig.node.json` - TypeScript config for Electron main process
- `electron-builder.yml` - Electron packaging configuration (if exists)

### OpenClaw Integration
- OpenClaw package location: `node_modules/openclaw` (dev) or `resources/openclaw` (packaged)
- Entry script: `openclaw/dist/entry.js`
- Gateway spawned with: `node entry.js gateway --port 18789 --token <token> --allow-unconfigured`

## Path Aliases

TypeScript path aliases are configured in both `tsconfig.json` and `vite.config.ts`:
- `@/*` → `src/*` (renderer code)
- `@electron/*` → `electron/*` (main process code)

## Testing

### Unit Tests
- Framework: Vitest with jsdom environment
- Location: `tests/unit/*.test.ts`
- Setup: `tests/setup.ts`
- Run: `pnpm test`

### E2E Tests
- Framework: Playwright
- Location: `tests/e2e/*.spec.ts` (if exists)
- Run: `pnpm test:e2e`

## CLI Mode

Oclaw supports a CLI mode where the same executable can be invoked from the command line:
- Detected via `electron/main/cli-args.ts` parsing `process.argv`
- Implemented in `electron/main/cli.ts`
- Available commands: `openclaw`, `gateway`, `provider`, `channel`, `skill`, `cron`, `chat`, `clawhub`, `uv`
- CLI mode bypasses GUI initialization and exits after command execution

## Important Patterns

### Gateway Lifecycle
1. App starts → `GatewayManager` initialized
2. Check for existing gateway process (orphan detection)
3. If found, kill orphaned process; otherwise spawn new gateway
4. Wait for WebSocket port to be ready (with timeout)
5. Connect WebSocket and perform challenge-response handshake
6. Start health monitoring and ping interval
7. On disconnect, attempt reconnection with exponential backoff

### Provider API Keys
- Stored securely in system keychain via `electron/utils/secure-storage.ts`
- Injected as environment variables when spawning gateway process
- Provider types defined in `electron/utils/provider-registry.ts`

### Channel Configuration
- Channel configs stored in `~/.openclaw/channels/` as YAML files
- Managed via `electron/utils/channel-config.ts`
- WhatsApp QR code login handled via `electron/utils/whatsapp-login.ts`

### Skill Management
- Skills installed via ClawHub service (`electron/gateway/clawhub.ts`)
- Skill configs stored in `~/.openclaw/skills/` directory
- Bundled skill definitions in `resources/skills/bundles.json`

## Platform-Specific Notes

### macOS
- Uses Electron Helper binary to avoid dock icons for child processes
- Unloads launchctl gateway service to prevent auto-respawn conflicts
- Traffic light position customized for frameless window

### Windows
- Uses shell spawn for gateway process in development mode
- Command arguments quoted via `quoteForCmd` utility

### Linux
- Standard Node.js spawn without special handling

## Security Considerations

- Context isolation enabled in renderer process
- Node integration disabled in renderer
- IPC channels whitelisted in preload script
- API keys stored in system keychain, never in plain text
- Gateway authentication uses token + device signature
- CSP headers modified only for localhost gateway UI embedding
