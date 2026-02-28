/**
 * Status command handler
 */
import { app } from 'electron';
import { GatewayManager } from '../../../gateway/manager';
import {
  getOpenClawStatus,
  getOpenClawConfigDir,
  getOpenClawSkillsDir,
} from '../../../utils/paths';
import {
  getAllProvidersWithKeyInfo,
  getDefaultProvider,
} from '../../../utils/secure-storage';
import { listConfiguredChannels } from '../../../utils/channel-config';
import { getAllSkillConfigs } from '../../../utils/skill-config';
import type { CommandContext, CommandResult } from '../types';

export async function handleStatus(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const openclawStatus = getOpenClawStatus({ silent: true });
  const gatewayHealth = await gateway.checkHealth().catch((error) => ({ ok: false, error: String(error) }));
  const providers = await getAllProvidersWithKeyInfo();
  const defaultProvider = await getDefaultProvider();

  const data = {
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

  return {
    data,
    humanFormatter: formatStatusHuman,
  };
}

function formatStatusHuman(value: unknown): string {
  const data = value as {
    app?: { name?: string; version?: string; platform?: string; arch?: string };
    openclaw?: {
      packageExists?: boolean;
      isBuilt?: boolean;
      version?: string;
      entryPath?: string;
      configDir?: string;
      skillsDir?: string;
    };
    gateway?: { ok?: boolean; error?: string };
    providers?: { total?: number; defaultProvider?: string | null };
    channels?: string[];
    skills?: { configured?: number };
  };

  const openclawReady = Boolean(data.openclaw?.packageExists && data.openclaw?.isBuilt);
  const channelList = (data.channels || []).length > 0 ? data.channels?.join(', ') : '-';
  const gatewayState = data.gateway?.ok ? 'connected' : 'disconnected';
  const gatewayError = data.gateway?.ok ? '' : (data.gateway?.error ? ` (${data.gateway.error})` : '');

  const lines = [
    `App       Oclaw ${data.app?.version || '-'} (${data.app?.platform || '-'}/${data.app?.arch || '-'})`,
    `OpenClaw  ${openclawReady ? 'ready' : 'not ready'} (v${data.openclaw?.version || '-'})`,
    `Gateway   ${gatewayState}${gatewayError}`,
    `Provider  ${data.providers?.total ?? 0} configured (default: ${data.providers?.defaultProvider || '-'})`,
    `Channel   ${channelList}`,
    `Skills    ${data.skills?.configured ?? 0} configured`,
  ];

  return `${lines.join('\n')}\n`;
}
