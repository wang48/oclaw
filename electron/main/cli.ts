import { randomUUID } from 'node:crypto';
import { app } from 'electron';
import { GatewayManager } from '../gateway/manager';
import {
  getOpenClawStatus,
  getOpenClawDir,
  getOpenClawConfigDir,
  getOpenClawSkillsDir,
  ensureDir,
} from '../utils/paths';
import { getOpenClawCliCommand, installOpenClawCliMac } from '../utils/openclaw-cli';
import { checkUvInstalled, installUv, setupManagedPython } from '../utils/uv-setup';
import {
  getAllProvidersWithKeyInfo,
  getProvider,
  saveProvider,
  deleteProvider,
  setDefaultProvider,
  getDefaultProvider,
  storeApiKey,
  deleteApiKey,
  getApiKey,
  hasApiKey,
  type ProviderConfig,
} from '../utils/secure-storage';
import {
  saveProviderKeyToOpenClaw,
  removeProviderKeyFromOpenClaw,
  setOpenClawDefaultModel,
  setOpenClawDefaultModelWithOverride,
} from '../utils/openclaw-auth';
import {
  saveChannelConfig,
  getChannelConfig,
  getChannelFormValues,
  deleteChannelConfig,
  listConfiguredChannels,
  setChannelEnabled,
  validateChannelConfig,
  validateChannelCredentials,
} from '../utils/channel-config';
import { updateSkillConfig, getSkillConfig, getAllSkillConfigs } from '../utils/skill-config';
import { ClawHubService } from '../gateway/clawhub';

interface GatewayCronJob {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: { kind: string; expr?: string; everyMs?: number; at?: string; tz?: string };
  payload: { kind: string; message?: string; text?: string };
  delivery?: { mode: string; channel?: string; to?: string };
  state: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastError?: string;
    lastDurationMs?: number;
  };
}

type ParsedOptionValue = string | boolean | string[];

interface ParsedArgs {
  positionals: string[];
  options: Record<string, ParsedOptionValue>;
}

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

function parseArgs(args: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options: Record<string, ParsedOptionValue> = {};

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const eqIndex = token.indexOf('=');
    if (eqIndex > 2) {
      const key = token.slice(2, eqIndex);
      const value = token.slice(eqIndex + 1);
      options[key] = value;
      continue;
    }

    const key = token.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      options[key] = next;
      i += 1;
      continue;
    }

    options[key] = true;
  }

  return { positionals, options };
}

function getOptionString(options: Record<string, ParsedOptionValue>, key: string): string | undefined {
  const value = options[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[value.length - 1];
  return undefined;
}

function getOptionBoolean(options: Record<string, ParsedOptionValue>, key: string): boolean {
  const value = options[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return !['false', '0', 'no', 'off'].includes(normalized);
  }
  if (Array.isArray(value) && value.length > 0) {
    return getOptionBoolean({ [key]: value[value.length - 1] }, key);
  }
  return false;
}

function parseBoolean(value: string, label: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Invalid ${label}: ${value}. Use true/false.`);
}

function parseUnknownBoolean(value: unknown, label: string): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return parseBoolean(value, label);
  return Boolean(value);
}

function parseNumber(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid ${label} JSON: ${String(error)}`);
  }
}

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const parsed = parseJson(value, label);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return parsed;
}

function toStringRecord(input: Record<string, unknown>, label: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (typeof value === 'object') {
      throw new Error(`${label}.${key} must be a string`);
    }
    output[key] = String(value);
  }
  return output;
}

function toProviderConfig(raw: Record<string, unknown>, fallbackId?: string): ProviderConfig {
  const now = new Date().toISOString();
  const id = String(raw.id ?? fallbackId ?? '').trim();
  const name = String(raw.name ?? id).trim();
  const type = String(raw.type ?? '').trim();

  if (!id) throw new Error('Provider config requires "id"');
  if (!name) throw new Error('Provider config requires "name"');
  if (!type) throw new Error('Provider config requires "type"');

  return {
    id,
    name,
    type: type as ProviderConfig['type'],
    baseUrl: raw.baseUrl != null ? String(raw.baseUrl) : undefined,
    model: raw.model != null ? String(raw.model) : undefined,
    enabled: raw.enabled == null ? true : parseUnknownBoolean(raw.enabled, 'provider.enabled'),
    createdAt: raw.createdAt != null ? String(raw.createdAt) : now,
    updatedAt: now,
  };
}

function transformCronJob(job: GatewayCronJob) {
  const message = job.payload?.message || job.payload?.text || '';
  const channelType = job.delivery?.channel || 'unknown';
  const target = {
    channelType,
    channelId: channelType,
    channelName: channelType,
  };

  const lastRun = job.state?.lastRunAtMs
    ? {
      time: new Date(job.state.lastRunAtMs).toISOString(),
      success: job.state.lastStatus === 'ok',
      error: job.state.lastError,
      duration: job.state.lastDurationMs,
    }
    : undefined;

  const nextRun = job.state?.nextRunAtMs
    ? new Date(job.state.nextRunAtMs).toISOString()
    : undefined;

  return {
    id: job.id,
    name: job.name,
    message,
    schedule: job.schedule,
    target,
    enabled: job.enabled,
    createdAt: new Date(job.createdAtMs).toISOString(),
    updatedAt: new Date(job.updatedAtMs).toISOString(),
    lastRun,
    nextRun,
  };
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printHelp(): void {
  const help = `ClawX CLI\n\nUsage:\n  ClawX --cli <command> [subcommand] [args] [--options]\n\nCommands:\n  status                                  Show ClawX/OpenClaw summary\n  openclaw <status|paths|cli-command|install-cli-mac>\n  gateway <status|start|stop|restart|health|rpc>\n  provider <list|get|save|update|delete|set-key|delete-key|has-key|get-key|set-default|get-default>\n  channel <list|get|get-form|save|delete|enable|disable|validate|validate-credentials>\n  skill <status|enable|disable|list-config|get-config|update-config>\n  cron <list|create|update|delete|toggle|trigger>\n  chat <sessions|history|send|abort>\n  clawhub <search|explore|install|uninstall|list>\n  uv <check|install-all>\n  help\n\nExamples:\n  ClawX --cli provider list\n  ClawX --cli provider save '{"id":"openai-main","name":"OpenAI","type":"openai","model":"gpt-5.2","enabled":true}' --api-key sk-xxx\n  ClawX --cli channel save telegram '{"botToken":"...","allowedUsers":"123456"}'\n  ClawX --cli cron create '{"name":"daily","message":"daily report","schedule":"0 9 * * *","target":{"channelType":"telegram","channelId":"@mybot","channelName":"telegram"}}'\n  ClawX --cli gateway rpc sessions.list '{"limit":50}'\n`;

  process.stdout.write(help);
}

async function handleStatus(): Promise<unknown> {
  const openclawStatus = getOpenClawStatus();
  const gateway = getGatewayManager();
  const gatewayHealth = await gateway.checkHealth().catch((error) => ({ ok: false, error: String(error) }));
  const providers = await getAllProvidersWithKeyInfo();
  const defaultProvider = await getDefaultProvider();

  return {
    app: {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
    },
    openclaw: {
      ...openclawStatus,
      configDir: getOpenClawConfigDir(),
      skillsDir: getOpenClawSkillsDir(),
    },
    gateway: gatewayHealth,
    providers: {
      total: providers.length,
      defaultProvider,
    },
    channels: listConfiguredChannels(),
    skills: {
      configured: Object.keys(getAllSkillConfigs()).length,
    },
  };
}

async function handleOpenClaw(args: string[]): Promise<unknown> {
  const [subcommand] = args;
  switch (subcommand) {
    case 'status':
      return getOpenClawStatus();
    case 'paths': {
      const skillsDir = getOpenClawSkillsDir();
      ensureDir(skillsDir);
      return {
        dir: getOpenClawDir(),
        configDir: getOpenClawConfigDir(),
        skillsDir,
      };
    }
    case 'cli-command':
      return { command: getOpenClawCliCommand() };
    case 'install-cli-mac':
      return installOpenClawCliMac();
    default:
      throw new Error('Usage: openclaw <status|paths|cli-command|install-cli-mac>');
  }
}

async function handleUv(args: string[]): Promise<unknown> {
  const [subcommand] = args;
  switch (subcommand) {
    case 'check':
      return { installed: await checkUvInstalled() };
    case 'install-all': {
      const isInstalled = await checkUvInstalled();
      if (!isInstalled) {
        await installUv();
      }
      await setupManagedPython();
      return { success: true };
    }
    default:
      throw new Error('Usage: uv <check|install-all>');
  }
}

async function handleGateway(args: string[]): Promise<unknown> {
  const [subcommand, ...rest] = args;
  const manager = getGatewayManager();

  switch (subcommand) {
    case 'status': {
      const parsed = parseArgs(rest);
      if (getOptionBoolean(parsed.options, 'connect')) {
        await manager.start();
      }
      const health = await manager.checkHealth().catch((error) => ({ ok: false, error: String(error) }));
      return {
        status: manager.getStatus(),
        connected: manager.isConnected(),
        health,
      };
    }
    case 'start':
      await manager.start();
      return { success: true, status: manager.getStatus() };
    case 'stop':
      // Start first so we can attach to an existing gateway and request a clean shutdown.
      await manager.start();
      await manager.stop();
      return { success: true, status: manager.getStatus() };
    case 'restart':
      await manager.restart();
      return { success: true, status: manager.getStatus() };
    case 'health':
      return manager.checkHealth();
    case 'rpc': {
      if (!rest[0]) {
        throw new Error('Usage: gateway rpc <method> [paramsJson] [timeoutMs]');
      }
      const method = rest[0];
      const params = rest[1] ? parseJson(rest[1], 'params') : undefined;
      const timeoutMs = rest[2] ? parseNumber(rest[2], 'timeoutMs') : 30000;
      await manager.start();
      const result = await manager.rpc(method, params, timeoutMs);
      return { success: true, result };
    }
    default:
      throw new Error('Usage: gateway <status|start|stop|restart|health|rpc>');
  }
}

async function handleProvider(args: string[]): Promise<unknown> {
  const [subcommand, ...rest] = args;
  const parsed = parseArgs(rest);
  const positional = parsed.positionals;

  switch (subcommand) {
    case 'list':
      return getAllProvidersWithKeyInfo();
    case 'get': {
      if (!positional[0]) throw new Error('Usage: provider get <providerId>');
      return getProvider(positional[0]);
    }
    case 'save': {
      if (!positional[0]) throw new Error('Usage: provider save <configJson> [--api-key <key>]');
      const raw = parseJsonObject(positional[0], 'provider config');
      const config = toProviderConfig(raw);
      await saveProvider(config);

      const apiKey = getOptionString(parsed.options, 'api-key');
      if (apiKey) {
        await storeApiKey(config.id, apiKey);
        saveProviderKeyToOpenClaw(config.type, apiKey);
      }

      return { success: true, providerId: config.id };
    }
    case 'update': {
      if (!positional[0] || !positional[1]) {
        throw new Error('Usage: provider update <providerId> <patchJson> [--api-key <key>]');
      }

      const providerId = positional[0];
      const existing = await getProvider(providerId);
      if (!existing) {
        throw new Error(`Provider not found: ${providerId}`);
      }

      const patch = parseJsonObject(positional[1], 'provider patch');
      const merged = toProviderConfig({ ...existing, ...patch }, providerId);
      await saveProvider(merged);

      if (parsed.options['api-key'] !== undefined) {
        const key = getOptionString(parsed.options, 'api-key') ?? '';
        if (key.trim()) {
          await storeApiKey(providerId, key.trim());
          saveProviderKeyToOpenClaw(merged.type, key.trim());
        } else {
          await deleteApiKey(providerId);
          removeProviderKeyFromOpenClaw(merged.type);
        }
      }

      return { success: true, providerId };
    }
    case 'delete': {
      if (!positional[0]) throw new Error('Usage: provider delete <providerId>');
      const providerId = positional[0];
      const existing = await getProvider(providerId);
      await deleteProvider(providerId);
      if (existing?.type) {
        removeProviderKeyFromOpenClaw(existing.type);
      }
      return { success: true, providerId };
    }
    case 'set-key': {
      if (!positional[0] || !positional[1]) {
        throw new Error('Usage: provider set-key <providerId> <apiKey>');
      }
      const providerId = positional[0];
      const apiKey = positional[1];
      await storeApiKey(providerId, apiKey);
      const provider = await getProvider(providerId);
      saveProviderKeyToOpenClaw(provider?.type || providerId, apiKey);
      return { success: true, providerId };
    }
    case 'delete-key': {
      if (!positional[0]) throw new Error('Usage: provider delete-key <providerId>');
      const providerId = positional[0];
      await deleteApiKey(providerId);
      const provider = await getProvider(providerId);
      removeProviderKeyFromOpenClaw(provider?.type || providerId);
      return { success: true, providerId };
    }
    case 'has-key': {
      if (!positional[0]) throw new Error('Usage: provider has-key <providerId>');
      return { providerId: positional[0], hasKey: await hasApiKey(positional[0]) };
    }
    case 'get-key': {
      if (!positional[0]) throw new Error('Usage: provider get-key <providerId>');
      return { providerId: positional[0], apiKey: await getApiKey(positional[0]) };
    }
    case 'set-default': {
      if (!positional[0]) throw new Error('Usage: provider set-default <providerId>');
      const providerId = positional[0];
      await setDefaultProvider(providerId);

      const provider = await getProvider(providerId);
      if (provider) {
        const modelOverride = provider.model
          ? `${provider.type}/${provider.model}`
          : undefined;

        if (provider.type === 'custom' || provider.type === 'ollama') {
          setOpenClawDefaultModelWithOverride(provider.type, modelOverride, {
            baseUrl: provider.baseUrl,
            api: 'openai-completions',
          });
        } else {
          setOpenClawDefaultModel(provider.type, modelOverride);
        }

        const key = await getApiKey(providerId);
        if (key) {
          saveProviderKeyToOpenClaw(provider.type, key);
        }
      }

      return { success: true, providerId };
    }
    case 'get-default':
      return { defaultProviderId: await getDefaultProvider() };
    default:
      throw new Error('Usage: provider <list|get|save|update|delete|set-key|delete-key|has-key|get-key|set-default|get-default>');
  }
}

async function handleChannel(args: string[]): Promise<unknown> {
  const [subcommand, ...rest] = args;
  switch (subcommand) {
    case 'list':
      return listConfiguredChannels();
    case 'get': {
      if (!rest[0]) throw new Error('Usage: channel get <channelType>');
      return getChannelConfig(rest[0]);
    }
    case 'get-form': {
      if (!rest[0]) throw new Error('Usage: channel get-form <channelType>');
      return getChannelFormValues(rest[0]);
    }
    case 'save': {
      if (!rest[0] || !rest[1]) {
        throw new Error('Usage: channel save <channelType> <configJson>');
      }
      const channelType = rest[0];
      const config = parseJsonObject(rest[1], 'channel config');
      saveChannelConfig(channelType, config);
      return { success: true, channelType };
    }
    case 'delete': {
      if (!rest[0]) throw new Error('Usage: channel delete <channelType>');
      deleteChannelConfig(rest[0]);
      return { success: true, channelType: rest[0] };
    }
    case 'enable': {
      if (!rest[0]) throw new Error('Usage: channel enable <channelType>');
      setChannelEnabled(rest[0], true);
      return { success: true, channelType: rest[0], enabled: true };
    }
    case 'disable': {
      if (!rest[0]) throw new Error('Usage: channel disable <channelType>');
      setChannelEnabled(rest[0], false);
      return { success: true, channelType: rest[0], enabled: false };
    }
    case 'validate': {
      if (!rest[0]) throw new Error('Usage: channel validate <channelType>');
      return validateChannelConfig(rest[0]);
    }
    case 'validate-credentials': {
      if (!rest[0] || !rest[1]) {
        throw new Error('Usage: channel validate-credentials <channelType> <configJson>');
      }
      const channelType = rest[0];
      const input = parseJsonObject(rest[1], 'channel credentials');
      const credentials = toStringRecord(input, 'channel credentials');
      return validateChannelCredentials(channelType, credentials);
    }
    default:
      throw new Error('Usage: channel <list|get|get-form|save|delete|enable|disable|validate|validate-credentials>');
  }
}

async function handleSkill(args: string[]): Promise<unknown> {
  const [subcommand, ...rest] = args;
  const manager = getGatewayManager();

  switch (subcommand) {
    case 'status':
      await manager.start();
      return manager.rpc('skills.status');
    case 'enable': {
      if (!rest[0]) throw new Error('Usage: skill enable <skillKey>');
      await manager.start();
      return manager.rpc('skills.update', { skillKey: rest[0], enabled: true });
    }
    case 'disable': {
      if (!rest[0]) throw new Error('Usage: skill disable <skillKey>');
      await manager.start();
      return manager.rpc('skills.update', { skillKey: rest[0], enabled: false });
    }
    case 'list-config':
      return getAllSkillConfigs();
    case 'get-config': {
      if (!rest[0]) throw new Error('Usage: skill get-config <skillKey>');
      return getSkillConfig(rest[0]);
    }
    case 'update-config': {
      if (!rest[0] || !rest[1]) {
        throw new Error('Usage: skill update-config <skillKey> <updatesJson>');
      }
      const skillKey = rest[0];
      const updates = parseJsonObject(rest[1], 'skill updates');
      const apiKey = updates.apiKey != null ? String(updates.apiKey) : undefined;

      let env: Record<string, string> | undefined;
      if (updates.env !== undefined) {
        if (!updates.env || typeof updates.env !== 'object' || Array.isArray(updates.env)) {
          throw new Error('skill updates.env must be an object');
        }
        env = toStringRecord(updates.env as Record<string, unknown>, 'skill updates.env');
      }

      return updateSkillConfig(skillKey, { apiKey, env });
    }
    default:
      throw new Error('Usage: skill <status|enable|disable|list-config|get-config|update-config>');
  }
}

async function handleCron(args: string[]): Promise<unknown> {
  const [subcommand, ...rest] = args;
  const manager = getGatewayManager();
  await manager.start();

  switch (subcommand) {
    case 'list': {
      const result = await manager.rpc('cron.list', { includeDisabled: true }) as { jobs?: GatewayCronJob[] };
      return (result.jobs ?? []).map(transformCronJob);
    }
    case 'create': {
      if (!rest[0]) throw new Error('Usage: cron create <inputJson>');
      const input = parseJsonObject(rest[0], 'cron create input');

      const name = String(input.name ?? '').trim();
      const message = String(input.message ?? '').trim();
      const schedule = String(input.schedule ?? '').trim();
      const target = input.target as Record<string, unknown> | undefined;

      if (!name || !message || !schedule || !target) {
        throw new Error('cron create requires name, message, schedule, and target');
      }

      const channelType = String(target.channelType ?? '').trim();
      const channelId = String(target.channelId ?? '').trim();
      const enabled = input.enabled == null ? true : Boolean(input.enabled);

      if (!channelType || !channelId) {
        throw new Error('cron create target requires channelType and channelId');
      }

      const deliveryTo = channelType === 'discord' ? `channel:${channelId}` : channelId;
      const gatewayInput = {
        name,
        schedule: { kind: 'cron', expr: schedule },
        payload: { kind: 'agentTurn', message },
        enabled,
        wakeMode: 'next-heartbeat',
        sessionTarget: 'isolated',
        delivery: {
          mode: 'announce',
          channel: channelType,
          to: deliveryTo,
        },
      };

      const created = await manager.rpc('cron.add', gatewayInput) as GatewayCronJob;
      return transformCronJob(created);
    }
    case 'update': {
      if (!rest[0] || !rest[1]) {
        throw new Error('Usage: cron update <id> <patchJson>');
      }
      const id = rest[0];
      const patch = parseJsonObject(rest[1], 'cron patch');

      if (typeof patch.schedule === 'string') {
        patch.schedule = { kind: 'cron', expr: patch.schedule };
      }
      if (typeof patch.message === 'string') {
        patch.payload = { kind: 'agentTurn', message: patch.message };
        delete patch.message;
      }

      return manager.rpc('cron.update', { id, patch });
    }
    case 'delete': {
      if (!rest[0]) throw new Error('Usage: cron delete <id>');
      return manager.rpc('cron.remove', { id: rest[0] });
    }
    case 'toggle': {
      if (!rest[0] || !rest[1]) throw new Error('Usage: cron toggle <id> <true|false>');
      const enabled = parseBoolean(rest[1], 'enabled');
      return manager.rpc('cron.update', { id: rest[0], patch: { enabled } });
    }
    case 'trigger': {
      if (!rest[0]) throw new Error('Usage: cron trigger <id>');
      return manager.rpc('cron.run', { id: rest[0], mode: 'force' });
    }
    default:
      throw new Error('Usage: cron <list|create|update|delete|toggle|trigger>');
  }
}

async function handleChat(args: string[]): Promise<unknown> {
  const [subcommand, ...rest] = args;
  const manager = getGatewayManager();
  await manager.start();

  switch (subcommand) {
    case 'sessions': {
      const parsed = parseArgs(rest);
      const limitRaw = getOptionString(parsed.options, 'limit');
      const limit = limitRaw ? parseNumber(limitRaw, 'limit') : 50;
      return manager.rpc('sessions.list', { limit });
    }
    case 'history': {
      const parsed = parseArgs(rest);
      const sessionKey = parsed.positionals[0];
      if (!sessionKey) throw new Error('Usage: chat history <sessionKey> [--limit <n>]');
      const limitRaw = getOptionString(parsed.options, 'limit');
      const limit = limitRaw ? parseNumber(limitRaw, 'limit') : 200;
      return manager.rpc('chat.history', { sessionKey, limit });
    }
    case 'send': {
      const parsed = parseArgs(rest);
      const sessionKey = parsed.positionals[0];
      const message = parsed.positionals[1];
      if (!sessionKey || !message) {
        throw new Error('Usage: chat send <sessionKey> <message> [--deliver] [--idempotency-key <key>]');
      }

      const deliver = getOptionBoolean(parsed.options, 'deliver');
      const idempotencyKey = getOptionString(parsed.options, 'idempotency-key') || randomUUID();

      return manager.rpc('chat.send', {
        sessionKey,
        message,
        deliver,
        idempotencyKey,
      }, 120000);
    }
    case 'abort': {
      if (!rest[0]) throw new Error('Usage: chat abort <sessionKey>');
      return manager.rpc('chat.abort', { sessionKey: rest[0] });
    }
    default:
      throw new Error('Usage: chat <sessions|history|send|abort>');
  }
}

async function handleClawHub(args: string[]): Promise<unknown> {
  const [subcommand, ...rest] = args;
  const service = getClawHubService();

  switch (subcommand) {
    case 'search': {
      const parsed = parseArgs(rest);
      const query = parsed.positionals.join(' ').trim();
      if (!query) throw new Error('Usage: clawhub search <query> [--limit <n>]');
      const limitRaw = getOptionString(parsed.options, 'limit');
      const limit = limitRaw ? parseNumber(limitRaw, 'limit') : undefined;
      return service.search({ query, limit });
    }
    case 'explore': {
      const parsed = parseArgs(rest);
      const limitRaw = getOptionString(parsed.options, 'limit');
      const limit = limitRaw ? parseNumber(limitRaw, 'limit') : undefined;
      return service.explore({ limit });
    }
    case 'install': {
      const parsed = parseArgs(rest);
      const slug = parsed.positionals[0];
      if (!slug) throw new Error('Usage: clawhub install <slug> [--version <v>] [--force]');
      const version = getOptionString(parsed.options, 'version');
      const force = getOptionBoolean(parsed.options, 'force');
      await service.install({ slug, version, force });
      return { success: true, slug, version: version || null };
    }
    case 'uninstall': {
      if (!rest[0]) throw new Error('Usage: clawhub uninstall <slug>');
      await service.uninstall({ slug: rest[0] });
      return { success: true, slug: rest[0] };
    }
    case 'list':
      return service.listInstalled();
    default:
      throw new Error('Usage: clawhub <search|explore|install|uninstall|list>');
  }
}

export async function runCli(rawArgs: string[]): Promise<number> {
  const args = rawArgs.filter((arg) => arg !== '--');

  if (process.platform === 'darwin') {
    try {
      app.dock.hide();
    } catch {
      // Ignore dock hide errors in CLI mode.
    }
  }

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return 0;
  }

  const [command, ...rest] = args;

  try {
    let result: unknown;

    switch (command) {
      case 'status':
        result = await handleStatus();
        break;
      case 'openclaw':
        result = await handleOpenClaw(rest);
        break;
      case 'uv':
        result = await handleUv(rest);
        break;
      case 'gateway':
        result = await handleGateway(rest);
        break;
      case 'provider':
        result = await handleProvider(rest);
        break;
      case 'channel':
        result = await handleChannel(rest);
        break;
      case 'skill':
        result = await handleSkill(rest);
        break;
      case 'cron':
        result = await handleCron(rest);
        break;
      case 'chat':
        result = await handleChat(rest);
        break;
      case 'clawhub':
        result = await handleClawHub(rest);
        break;
      default:
        throw new Error(`Unknown command: ${command}. Run \"help\" for usage.`);
    }

    if (result !== undefined) {
      printJson(result);
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printJson({ success: false, error: message });
    return 1;
  }
}
