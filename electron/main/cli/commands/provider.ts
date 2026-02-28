/**
 * Provider command handler
 */
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
} from '../../../utils/secure-storage';
import {
  saveProviderKeyToOpenClaw,
  removeProviderKeyFromOpenClaw,
  setOpenClawDefaultModel,
  setOpenClawDefaultModelWithOverride,
} from '../../../utils/openclaw-auth';
import { parseArgs, getOptionString, parseJsonObject, parseUnknownBoolean } from '../parse';
import { formatTable } from '../output';
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult } from '../types';

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

export async function handleProvider(ctx: CommandContext): Promise<CommandResult> {
  const [subcommand, ...rest] = ctx.args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printCommandHelp('provider');
    return { data: undefined };
  }

  const parsed = parseArgs(rest);
  const positional = parsed.positionals;

  switch (subcommand) {
    case 'list': {
      const data = await getAllProvidersWithKeyInfo();
      return {
        data,
        humanFormatter: formatProviderListHuman,
      };
    }
    case 'get': {
      if (!positional[0]) throw new Error('Usage: provider get <providerId>');
      return { data: await getProvider(positional[0]) };
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

      return { data: { success: true, providerId: config.id } };
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

      return { data: { success: true, providerId } };
    }
    case 'delete': {
      if (!positional[0]) throw new Error('Usage: provider delete <providerId>');
      const providerId = positional[0];
      const existing = await getProvider(providerId);
      await deleteProvider(providerId);
      if (existing?.type) {
        removeProviderKeyFromOpenClaw(existing.type);
      }
      return { data: { success: true, providerId } };
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
      return { data: { success: true, providerId } };
    }
    case 'delete-key': {
      if (!positional[0]) throw new Error('Usage: provider delete-key <providerId>');
      const providerId = positional[0];
      await deleteApiKey(providerId);
      const provider = await getProvider(providerId);
      removeProviderKeyFromOpenClaw(provider?.type || providerId);
      return { data: { success: true, providerId } };
    }
    case 'has-key': {
      if (!positional[0]) throw new Error('Usage: provider has-key <providerId>');
      return { data: { providerId: positional[0], hasKey: await hasApiKey(positional[0]) } };
    }
    case 'get-key': {
      if (!positional[0]) throw new Error('Usage: provider get-key <providerId>');
      return { data: { providerId: positional[0], apiKey: await getApiKey(positional[0]) } };
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

      return { data: { success: true, providerId } };
    }
    case 'get-default':
      return { data: { defaultProviderId: await getDefaultProvider() } };
    default:
      throw new Error('Usage: provider <list|get|save|update|delete|set-key|delete-key|has-key|get-key|set-default|get-default>');
  }
}

function formatProviderListHuman(value: unknown): string {
  const providers = value as Array<{
    id?: string;
    name?: string;
    type?: string;
    hasKey?: boolean;
    enabled?: boolean;
  }>;

  if (!Array.isArray(providers) || providers.length === 0) return 'No providers configured\n';

  const rows = providers.map((p) => ({
    id: p.id || '-',
    name: p.name || '-',
    type: p.type || '-',
    'has key': p.hasKey ? 'yes' : 'no',
    enabled: p.enabled !== false ? 'yes' : 'no',
  }));

  return formatTable(rows);
}
