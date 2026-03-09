import { app } from 'electron';
import { spawn } from 'child_process';

export interface LaunchAction {
  control?: boolean;
}

const OPEN_CONTROL_FLAG = '--oclaw-open-control';

export function parseLaunchAction(argv: string[]): LaunchAction | null {
  let control = false;

  for (const token of argv) {
    if (token === OPEN_CONTROL_FLAG) {
      control = true;
    }
  }

  if (!control) {
    return null;
  }

  return {
    control,
  };
}

export function buildLaunchArgs(action: LaunchAction): string[] {
  const args: string[] = [];
  if (action.control) {
    args.push(OPEN_CONTROL_FLAG);
  }
  return args;
}

export function launchGuiAction(action: LaunchAction): Promise<void> {
  const launchArgs = buildLaunchArgs(action);

  return new Promise((resolveLaunch, rejectLaunch) => {
    let command = process.execPath;
    let args = launchArgs;

    if (!app.isPackaged) {
      const entryArg = process.argv[1];
      if (!entryArg) {
        rejectLaunch(new Error('Unable to resolve Electron main entry for GUI launch.'));
        return;
      }
      args = [entryArg, ...launchArgs];
    }

    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });

    child.on('error', rejectLaunch);
    child.unref();
    resolveLaunch();
  });
}
