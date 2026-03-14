/**
 * TitleBar Component
 * macOS: empty drag region (native traffic lights handled by hiddenInset).
 * Windows/Linux: icon + "Oclaw" on left, minimize/maximize/close on right.
 */
import { useState, useEffect } from 'react';
import { Minus, Square, X, Copy, Sidebar } from 'lucide-react';
import logoPng from '@/assets/logo.png';
import { invokeIpc } from '@/lib/api-client';
import { useSettingsStore } from '@/stores/settings';

const isMac = window.electron?.platform === 'darwin';

export function TitleBar() {
  if (isMac) {
    // macOS: just a drag region, traffic lights are native
    return <MacTitleBar />;
  }

  return <WindowsTitleBar />;
}

function MacTitleBar() {
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);

  return (
    <div className="drag-region relative h-9 shrink-0 bg-background">
      <div
        className={
          `no-drag absolute left-[84px] top-[14px] flex h-5 items-center transition-all duration-200 ease-in-out ` +
          (sidebarCollapsed ? 'opacity-90 translate-x-1' : 'opacity-100 translate-x-0')
        }
      >
        <button
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent/60 transition-colors"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Sidebar className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function WindowsTitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    // Check initial state
    invokeIpc('window:isMaximized').then((val) => {
      setMaximized(val as boolean);
    });
  }, []);

  const handleMinimize = () => {
    invokeIpc('window:minimize');
  };

  const handleMaximize = () => {
    invokeIpc('window:maximize').then(() => {
      invokeIpc('window:isMaximized').then((val) => {
        setMaximized(val as boolean);
      });
    });
  };

  const handleClose = () => {
    invokeIpc('window:close');
  };

  return (
    <div className="drag-region flex h-9 shrink-0 items-center justify-between bg-background">
      {/* Left: Icon + App Name */}
      <div className="no-drag flex items-center gap-2 pl-3">
        <img src={logoPng} alt="Oclaw" className="h-5 w-auto" />
        <span className="text-[11px] font-medium text-muted-foreground select-none">
          Oclaw
        </span>
      </div>

      {/* Right: Window Controls */}
      <div className="no-drag flex h-full">
        <button
          onClick={handleMinimize}
          className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent/60 transition-colors"
          title="Minimize"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-accent/60 transition-colors"
          title={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={handleClose}
          className="flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-red-500/80 hover:text-white transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
