/**
 * System Tray Management
 * Creates and manages the system tray icon and menu
 */
import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import { join } from 'path';
import type { UpdateStatus } from './updater';

let tray: Tray | null = null;
let trayState: { mainWindow: BrowserWindow; options: TrayOptions } | null = null;
let trayUpdateStatus: UpdateStatus | null = null;

interface TrayOptions {
  showWindow: () => void;
  openControl: () => void;
  stopAndQuit: () => void;
  downloadUpdate?: () => void;
  installUpdate?: () => void;
}

/**
 * Resolve the icons directory path (works in both dev and packaged mode)
 */
function getIconsDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'resources', 'icons');
  }
  return join(__dirname, '../../resources/icons');
}

/**
 * Create system tray icon and menu
 */
function buildUpdateMenuItems(options: TrayOptions, status: UpdateStatus | null): Electron.MenuItemConstructorOptions[] {
  if (!status) return [];
  if (status.status === 'available') {
    const version = status.info?.version ? ` (${status.info.version})` : '';
    return [
      {
        label: `Update available${version}`,
        click: () => options.downloadUpdate?.(),
        enabled: typeof options.downloadUpdate === 'function',
      },
    ];
  }
  if (status.status === 'downloading') {
    return [
      {
        label: 'Downloading update…',
        enabled: false,
      },
    ];
  }
  if (status.status === 'downloaded') {
    return [
      {
        label: 'Install update',
        click: () => options.installUpdate?.(),
        enabled: typeof options.installUpdate === 'function',
      },
    ];
  }
  return [];
}

function buildContextMenu(mainWindow: BrowserWindow, options: TrayOptions, status: UpdateStatus | null): Electron.MenuItemConstructorOptions[] {
  const showWindow = () => {
    if (mainWindow.isDestroyed()) return;
    options.showWindow();
  };
  const updateItems = buildUpdateMenuItems(options, status);

  return [
    {
      label: 'Show Oclaw',
      click: showWindow,
    },
    {
      type: 'separator',
    },
    {
      label: 'Gateway Status',
      enabled: false,
    },
    {
      label: '  Running',
      type: 'checkbox',
      checked: true,
      enabled: false,
    },
    ...(updateItems.length > 0
      ? [
          { type: 'separator' },
          ...updateItems,
        ]
      : []),
    {
      type: 'separator',
    },
    {
      label: 'Quit Oclaw',
      click: () => {
        options.stopAndQuit();
      },
    },
  ];
}

export function createTray(mainWindow: BrowserWindow, options: TrayOptions): Tray {
  // Use platform-appropriate icon for system tray
  const iconsDir = getIconsDir();
  let iconPath: string;

  if (process.platform === 'win32') {
    // Windows: use .ico for best quality in system tray
    iconPath = join(iconsDir, 'icon.ico');
  } else if (process.platform === 'darwin') {
    // macOS: use Template.png for proper status bar icon
    // The "Template" suffix tells macOS to treat it as a template image
    iconPath = join(iconsDir, 'tray-icon-Template.png');
  } else {
    // Linux: use 32x32 PNG
    iconPath = join(iconsDir, '32x32.png');
  }

  let icon = nativeImage.createFromPath(iconPath);

  // Fallback to icon.png if platform-specific icon not found
  if (icon.isEmpty()) {
    icon = nativeImage.createFromPath(join(iconsDir, 'icon.png'));
    // Still try to set as template for macOS
    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }
  }

  // Note: Using "Template" suffix in filename automatically marks it as template image
  // But we can also explicitly set it for safety
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }
  
  tray = new Tray(icon);
  trayState = { mainWindow, options };
  
  // Set tooltip
  tray.setToolTip('Oclaw - AI Assistant');

  updateTrayMenu();
  
  return tray;
}

export function updateTrayMenu(status?: UpdateStatus): void {
  if (status) {
    trayUpdateStatus = status;
  }
  if (!tray || !trayState) return;
  const contextMenu = Menu.buildFromTemplate(
    buildContextMenu(trayState.mainWindow, trayState.options, trayUpdateStatus)
  );
  tray.setContextMenu(contextMenu);
}

/**
 * Update tray tooltip with Gateway status
 */
export function updateTrayStatus(status: string): void {
  if (tray) {
    tray.setToolTip(`Oclaw - ${status}`);
  }
}

/**
 * Destroy tray icon
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
