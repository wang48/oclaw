/**
 * CLI entry point - routes commands to handlers
 */
import { app } from 'electron';
import { GatewayManager } from '../../gateway/manager';
import { ClawHubService } from '../../gateway/clawhub';
import { LogLevel, setLogLevel } from '../../utils/logger';
import { resolveCliArgs } from './args';
import { printJson, printHuman, printQuiet } from './output';
import { printHelp } from './help';
import type { CommandContext, CommandResult } from './types';

// Command handlers
import { handleStatus } from './commands/status';
import { handleGateway } from './commands/gateway';
import { handleProvider } from './commands/provider';
import { handleChannel } from './commands/channel';
import { handleSkill } from './commands/skill';
import { handleCron } from './commands/cron';
import { handleChat } from './commands/chat';
import { handleClawHub } from './commands/clawhub';
import { handleOpenClaw } from './commands/openclaw';
import { handleUv } from './commands/uv';
import { handleCompletion } from './commands/completion';

let gatewayManager: GatewayManager | null = null;
let clawHubService: ClawHubService | null = null;

function getGatewayManager(): GatewayManager {
  if (!gatewayManager) {
    gatewayManager = new GatewayManager();
  }
  return gatewayManager;
}

function getClawHubService(): ClawHubService {
  if (!clawHubService) {
    clawHubService = new ClawHubService();
  }
  return clawHubService;
}

type CommandHandler = (ctx: CommandContext, ...deps: unknown[]) => Promise<CommandResult>;

interface CommandRoute {
  handler: CommandHandler;
  deps?: unknown[];
}

export async function runCli(rawArgs: string[]): Promise<number> {
  // Resolve and normalize arguments
  const args = resolveCliArgs(rawArgs);

  // Read environment variables for defaults
  const envDefaults = {
    json: process.env.OCLAW_OUTPUT === 'json',
    verbose: process.env.OCLAW_VERBOSE === '1' || process.env.OCLAW_VERBOSE === 'true',
    quiet: process.env.OCLAW_QUIET === '1' || process.env.OCLAW_QUIET === 'true',
  };

  // Parse global flags
  const jsonOutput = args.includes('--json') || envDefaults.json;
  const verboseOutput = args.includes('--verbose') || envDefaults.verbose;
  const quietOutput = args.includes('--quiet') || envDefaults.quiet;

  setLogLevel(verboseOutput ? LogLevel.DEBUG : LogLevel.WARN);

  // Filter out global flags from command args
  const commandArgs = args.filter(
    (arg) => arg !== '--json' && arg !== '--verbose' && arg !== '--quiet'
  );

  // Hide dock on macOS in CLI mode
  if (process.platform === 'darwin') {
    try {
      app.dock.hide();
    } catch {
      // Ignore dock hide errors in CLI mode
    }
  }

  // Handle help and version
  if (commandArgs.length === 0 || commandArgs[0] === 'help' || commandArgs[0] === '--help' || commandArgs[0] === '-h') {
    printHelp();
    return 0;
  }

  const [command, ...rest] = commandArgs;
  if (command === '--version' || command === '-v') {
    process.stdout.write(`Oclaw ${app.getVersion()}\n`);
    return 0;
  }

  // Build command context
  const ctx: CommandContext = {
    args: rest,
    options: {},
    json: jsonOutput,
    verbose: verboseOutput,
    quiet: quietOutput,
  };

  // Command routing table
  const routes: Record<string, CommandRoute> = {
    status: { handler: handleStatus, deps: [getGatewayManager()] },
    gateway: { handler: handleGateway, deps: [getGatewayManager()] },
    provider: { handler: handleProvider },
    channel: { handler: handleChannel },
    skill: { handler: handleSkill, deps: [getGatewayManager()] },
    cron: { handler: handleCron, deps: [getGatewayManager()] },
    chat: { handler: handleChat, deps: [getGatewayManager()] },
    clawhub: { handler: handleClawHub, deps: [getClawHubService()] },
    openclaw: { handler: handleOpenClaw },
    uv: { handler: handleUv },
    completion: { handler: handleCompletion },
  };

  try {
    const route = routes[command];
    if (!route) {
      throw new Error(`Unknown command: ${command}. Run "help" for usage.`);
    }

    // Execute command handler
    const result = await route.handler(ctx, ...(route.deps || []));

    // Output result
    if (result.data !== undefined) {
      if (jsonOutput) {
        printJson(result.data);
      } else if (quietOutput) {
        printQuiet(result.data);
      } else if (result.humanFormatter) {
        process.stdout.write(result.humanFormatter(result.data));
      } else {
        printHuman(result.data);
      }
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jsonOutput) {
      printJson({ success: false, error: message });
    } else {
      process.stderr.write(`Error: ${message}\n`);
    }
    return 1;
  }
}
