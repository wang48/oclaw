/**
 * Main Layout Component
 * TitleBar at top, then sidebar + content below.
 */
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';

export function MainLayout() {
  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden text-foreground">
      {/* Title bar: drag region on macOS, icon + controls on Windows */}
      <TitleBar />

      {/* Below the title bar: sidebar + content */}
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        <Sidebar />
        <main className="flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur">
          <div className="h-full overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
