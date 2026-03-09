/**
 * Electron Main Process Entry
 * Manages window creation, system tray, and IPC handlers
 */
import { app, BrowserWindow, nativeImage, session, shell } from 'electron';
import { join } from 'path';
import { GatewayManager } from '../gateway/manager';
import { registerIpcHandlers } from './ipc-handlers';
import { createTray } from './tray';
import { createMenu } from './menu';

import { appUpdater, registerUpdateHandlers } from './updater';
import { logger } from '../utils/logger';
import { warmupNetworkOptimization } from '../utils/uv-env';

import { ClawHubService } from '../gateway/clawhub';
import { ensureOclawContext, repairOclawOnlyBootstrapFiles } from '../utils/openclaw-workspace';
import { autoInstallCliIfNeeded, generateCompletionCache, installCompletionToProfile } from '../utils/openclaw-cli';
import { isQuitting, setQuitting } from './app-state';
import { isCliInvocationArgs } from './cli/args';
import { runCli } from './cli/index';
import { applyProxySettings } from './proxy';
import { getSetting } from '../utils/store';
import { ensureBuiltinSkillsInstalled } from '../utils/skill-config';
import { parseLaunchAction, type LaunchAction } from './launch-actions';
import { buildServiceArgs, parseServiceFlags, type OclawServiceCommand } from './service-flags';
import { probeGatewayPort, updateServiceState, writeServiceState } from './service-state';
import { PORTS } from '../utils/config';
import { getOpenClawDir } from '../utils/paths';

const rawArgs = process.argv.slice(1);
const serviceFlags = parseServiceFlags(rawArgs);
const backgroundServiceMode = serviceFlags.background;
const cliMode = !backgroundServiceMode && isCliInvocationArgs(rawArgs);
const pendingLaunchAction = backgroundServiceMode ? null : parseLaunchAction(rawArgs);
const headlessCliMode = cliMode;

if ((headlessCliMode || backgroundServiceMode) && process.platform === 'darwin') {
  try {
    (app as Electron.App & {
      setActivationPolicy?: (policy: 'regular' | 'accessory' | 'prohibited') => void;
    }).setActivationPolicy?.('accessory');
  } catch {
    // ignore
  }
}

// Disable GPU hardware acceleration globally for maximum stability across
// all GPU configurations (no GPU, integrated, discrete).
//
// Rationale (following VS Code's philosophy):
// - Page/file loading is async data fetching — zero GPU dependency.
// - The original per-platform GPU branching was added to avoid CPU rendering
//   competing with sync I/O on Windows, but all file I/O is now async
//   (fs/promises), so that concern no longer applies.
// - Software rendering is deterministic across all hardware; GPU compositing
//   behaviour varies between vendors (Intel, AMD, NVIDIA, Apple Silicon) and
//   driver versions, making it the #1 source of rendering bugs in Electron.
//
// Users who want GPU acceleration can pass `--enable-gpu` on the CLI or
// set `"disable-hardware-acceleration": false` in the app config (future).
app.disableHardwareAcceleration();

// On Linux, set CHROME_DESKTOP so Chromium can find the correct .desktop file.
// On Wayland this maps the running window to oclaw.desktop (→ icon + app grouping);
// on X11 it supplements the StartupWMClass matching.
// Must be called before app.whenReady() / before any window is created.
if (process.platform === 'linux') {
  app.setDesktopName('oclaw.desktop');
}

// Prevent multiple GUI instances of the app from running simultaneously.
// CLI invocations must bypass this lock; otherwise `oclaw -h` or `oclaw ps`
// will silently exit whenever the desktop app is already running.
const gotTheLock = cliMode ? true : app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// Global references
let mainWindow: BrowserWindow | null = null;
const gatewayManager = new GatewayManager({ stateSource: 'gui' });
const clawHubService = new ClawHubService();
let startupCompleted = false;

async function handleLaunchAction(action: LaunchAction | null | undefined): Promise<void> {
  if (!action) return;

  if (action.control) {
    try {
      await gatewayManager.start();
      const token = await getSetting('gatewayToken');
      const baseUrl = `http://127.0.0.1:18789/`;
      const url = token
        ? `${baseUrl}?token=${encodeURIComponent(String(token))}`
        : baseUrl;
      await shell.openExternal(url);
    } catch (error) {
      logger.warn('Failed to open OpenClaw control UI from launch action:', error);
    }
  }

}

function setAppActivation(visible: boolean): void {
  if (process.platform !== 'darwin') return;
  try {
    (app as Electron.App & {
      setActivationPolicy?: (policy: 'regular' | 'accessory' | 'prohibited') => void;
    }).setActivationPolicy?.(visible ? 'regular' : 'accessory');
  } catch {
    // ignore
  }
}

async function syncAppState(state: 'starting' | 'running-hidden' | 'running-visible' | 'stopped' | 'error'): Promise<void> {
  await updateServiceState((current) => ({
    ...current,
    source: backgroundServiceMode ? 'cli' : 'gui',
    app: {
      ...current.app,
      pid: state === 'stopped' ? null : process.pid,
      state,
      trayReady: state !== 'stopped',
      windowVisible: state === 'running-visible',
      startedAt: state === 'stopped' ? null : (current.app.startedAt || new Date().toISOString()),
    },
  })).catch(() => undefined);
}

/**
 * Resolve the icons directory path (works in both dev and packaged mode)
 */
function getIconsDir(): string {
  if (app.isPackaged) {
    // Packaged: icons are in extraResources → process.resourcesPath/resources/icons
    return join(process.resourcesPath, 'resources', 'icons');
  }
  // Development: relative to dist-electron/main/
  return join(__dirname, '../../resources/icons');
}

/**
 * Get the app icon for the current platform
 */
function getAppIcon(): Electron.NativeImage | undefined {
  if (process.platform === 'darwin') return undefined; // macOS uses the app bundle icon

  const iconsDir = getIconsDir();
  const iconPath =
    process.platform === 'win32'
      ? join(iconsDir, 'icon.ico')
      : join(iconsDir, 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  return icon.isEmpty() ? undefined : icon;
}

/**
 * Create the main application window
 */
function createWindow(options: { hidden?: boolean } = {}): BrowserWindow {
  const isMac = process.platform === 'darwin';
  const hidden = options.hidden === true;

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    icon: getAppIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: true, // Enable <webview> for embedding OpenClaw Control UI
    },
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    frame: isMac,
    show: false,
    skipTaskbar: hidden,
  });

  // Show window when ready to prevent visual flash
  if (!hidden) {
    win.once('ready-to-show', () => {
      win.show();
    });
  }

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (!hidden) {
      win.webContents.openDevTools();
    }
  } else {
    win.loadFile(join(__dirname, '../../dist/index.html'));
  }

  return win;
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  setAppActivation(true);
  mainWindow.setSkipTaskbar(false);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  void syncAppState('running-visible');
}

function hideMainWindowToTray(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.hide();
  if (process.platform !== 'darwin') {
    mainWindow.setSkipTaskbar(true);
  }
  setAppActivation(false);
  void syncAppState('running-hidden');
}

async function openControlUi(): Promise<void> {
  await gatewayManager.start();
  const token = await getSetting('gatewayToken');
  const port = gatewayManager.getStatus().port || PORTS.OPENCLAW_GATEWAY;
  const baseUrl = `http://127.0.0.1:${port}/`;
  const url = token
    ? `${baseUrl}?token=${encodeURIComponent(String(token))}`
    : baseUrl;
  await shell.openExternal(url);
}

async function stopServiceAndQuit(): Promise<void> {
  setQuitting();
  try {
    await gatewayManager.stop();
  } catch (error) {
    logger.warn('Failed to stop gateway during quit:', error);
  }
  await writeServiceState({
    version: 1,
    app: {
      pid: null,
      state: 'stopped',
      trayReady: false,
      windowVisible: false,
      startedAt: null,
    },
    gateway: {
      pid: null,
      state: 'stopped',
      port: PORTS.OPENCLAW_GATEWAY,
      runtimePath: getOpenClawDir(),
      startedAt: null,
      lastError: null,
    },
    source: backgroundServiceMode ? 'cli' : 'gui',
    updatedAt: new Date().toISOString(),
  }).catch(() => undefined);
  app.quit();
}

async function executeServiceCommand(command: OclawServiceCommand | null): Promise<void> {
  if (!command) return;
  switch (command) {
    case 'start-gateway':
      await gatewayManager.start();
      break;
    case 'stop-and-exit':
      await stopServiceAndQuit();
      break;
    case 'show-window':
      showMainWindow();
      break;
    case 'open-control':
      await openControlUi();
      break;
  }
}

function registerWindowLifecycle(): void {
  if (!mainWindow) return;

  mainWindow.on('close', (event) => {
    if (!isQuitting()) {
      event.preventDefault();
      hideMainWindowToTray();
    }
  });

  mainWindow.on('show', () => {
    if (startupCompleted) {
      void syncAppState('running-visible');
    }
  });

  mainWindow.on('hide', () => {
    if (startupCompleted) {
      void syncAppState('running-hidden');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerGatewayStateSync(): void {
  gatewayManager.on('status', (status: { state: string; pid?: number; port?: number; connectedAt?: number; error?: string }) => {
    void updateServiceState((current) => ({
      ...current,
      gateway: {
        ...current.gateway,
        pid: status.pid ?? current.gateway.pid ?? null,
        state: status.state as 'starting' | 'running' | 'stopped' | 'error' | 'reconnecting',
        port: status.port ?? current.gateway.port,
        runtimePath: current.gateway.runtimePath,
        startedAt: status.connectedAt ? new Date(status.connectedAt).toISOString() : (status.state === 'stopped' ? null : current.gateway.startedAt),
        lastError: status.error ?? null,
      },
    })).catch(() => undefined);

    if (status.state === 'running') {
      void ensureOclawContext().catch((error) => {
        logger.warn('Failed to re-merge Oclaw context after gateway reconnect:', error);
      });
    }
  });
}

/**
 * Initialize the application
 */
async function initialize(options: { background: boolean; ensureGateway: boolean }): Promise<void> {
  // Initialize logger first
  logger.init();
  logger.info('=== Oclaw Application Starting ===');
  logger.debug(
    `Runtime: platform=${process.platform}/${process.arch}, electron=${process.versions.electron}, node=${process.versions.node}, packaged=${app.isPackaged}`
  );

  // Warm up network optimization (non-blocking)
  void warmupNetworkOptimization();

  // Apply persisted proxy settings before creating windows or network requests.
  await applyProxySettings();

  if (!options.background) {
    createMenu();
  }

  // Create the main window
  mainWindow = createWindow({ hidden: options.background });

  // Create system tray
  createTray(mainWindow, {
    showWindow: showMainWindow,
    openControl: () => {
      void openControlUi();
    },
    stopAndQuit: () => {
      void stopServiceAndQuit();
    },
  });
  registerWindowLifecycle();
  registerGatewayStateSync();

  await writeServiceState({
    version: 1,
    app: {
      pid: process.pid,
      state: options.background ? 'starting' : 'running-visible',
      trayReady: true,
      windowVisible: !options.background,
      startedAt: new Date().toISOString(),
    },
    gateway: {
      pid: gatewayManager.getStatus().pid ?? null,
      state: 'stopped',
      port: gatewayManager.getStatus().port || PORTS.OPENCLAW_GATEWAY,
      runtimePath: getOpenClawDir(),
      startedAt: null,
      lastError: null,
    },
    source: options.background ? 'cli' : 'gui',
    updatedAt: new Date().toISOString(),
  }).catch(() => undefined);

  await handleLaunchAction(pendingLaunchAction);

  // Override security headers ONLY for the OpenClaw Gateway Control UI.
  // The URL filter ensures this callback only fires for gateway requests,
  // avoiding unnecessary overhead on every other HTTP response.
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['http://127.0.0.1:18789/*', 'http://localhost:18789/*'] },
    (details, callback) => {
      const headers = { ...details.responseHeaders };
      delete headers['X-Frame-Options'];
      delete headers['x-frame-options'];
      if (headers['Content-Security-Policy']) {
        headers['Content-Security-Policy'] = headers['Content-Security-Policy'].map(
          (csp) => csp.replace(/frame-ancestors\s+'none'/g, "frame-ancestors 'self' *")
        );
      }
      if (headers['content-security-policy']) {
        headers['content-security-policy'] = headers['content-security-policy'].map(
          (csp) => csp.replace(/frame-ancestors\s+'none'/g, "frame-ancestors 'self' *")
        );
      }
      callback({ responseHeaders: headers });
    },
  );

  // Register IPC handlers
  registerIpcHandlers(gatewayManager, clawHubService, mainWindow);

  // Register update handlers
  registerUpdateHandlers(appUpdater, mainWindow);

  // Repair any bootstrap files that only contain Oclaw markers (no OpenClaw
  // template content). This fixes a race condition where ensureOclawContext()
  // previously created the file before the gateway could seed the full template.
  void repairOclawOnlyBootstrapFiles().catch((error) => {
    logger.warn('Failed to repair bootstrap files:', error);
  });

  // Pre-deploy built-in skills (feishu-doc, feishu-drive, feishu-perm, feishu-wiki)
  // to ~/.openclaw/skills/ so they are immediately available without manual install.
  void ensureBuiltinSkillsInstalled().catch((error) => {
    logger.warn('Failed to install built-in skills:', error);
  });

  // Start Gateway automatically or when background service was explicitly requested.
  const gatewayAutoStart = options.ensureGateway || await getSetting('gatewayAutoStart');
  if (gatewayAutoStart) {
    try {
      logger.debug('Auto-starting Gateway...');
      await gatewayManager.start();
      logger.info('Gateway auto-start succeeded');
    } catch (error) {
      logger.error('Gateway auto-start failed:', error);
      mainWindow?.webContents.send('gateway:error', String(error));
    }
  } else {
    logger.info('Gateway auto-start disabled in settings');
  }

  // Merge Oclaw context snippets into the workspace bootstrap files.
  // The gateway seeds workspace files asynchronously after its HTTP server
  // is ready, so ensureOclawContext will retry until the target files appear.
  void ensureOclawContext().catch((error) => {
    logger.warn('Failed to merge Oclaw context into workspace:', error);
  });

  // Auto-install openclaw CLI and shell completions (non-blocking).
  void autoInstallCliIfNeeded((installedPath) => {
    mainWindow?.webContents.send('openclaw:cli-installed', installedPath);
  }).then(() => {
    generateCompletionCache();
    installCompletionToProfile();
  }).catch((error) => {
    logger.warn('CLI auto-install failed:', error);
  });

  startupCompleted = true;
  await syncAppState(options.background ? 'running-hidden' : 'running-visible');
}

// When a second instance is launched, focus the existing window instead.
if (!cliMode) {
  app.on('second-instance', (_event, argv) => {
    const serviceArgs = parseServiceFlags(argv);
    const launchAction = parseLaunchAction(argv);
    if (serviceArgs.command) {
      void executeServiceCommand(serviceArgs.command);
      return;
    }
    if (launchAction) {
      void handleLaunchAction(launchAction);
      return;
    }
    if (mainWindow) {
      showMainWindow();
    }
  });

  // Application lifecycle
  app.whenReady().then(async () => {
    await initialize({
      background: backgroundServiceMode,
      ensureGateway: backgroundServiceMode && serviceFlags.command === 'start-gateway',
    });
    if (backgroundServiceMode) {
      await executeServiceCommand(serviceFlags.command);
    }

    // Register activate handler AFTER app is ready to prevent
    // "Cannot create BrowserWindow before app is ready" on macOS.
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow({ hidden: false });
        registerWindowLifecycle();
      } else if (mainWindow && !mainWindow.isDestroyed()) {
        // On macOS, clicking the dock icon should show the window if it's hidden
        showMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', () => {
    setQuitting();
    void syncAppState('stopped');
    void gatewayManager.stop().catch((err) => {
      logger.warn('gatewayManager.stop() error during quit:', err);
    });
  });
} else {
  app.whenReady().then(async () => {
    const exitCode = await runCli(rawArgs);
    app.exit(exitCode);
  });
}

// Export for testing
export { mainWindow, gatewayManager };
