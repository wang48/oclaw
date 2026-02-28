/**
 * Skill command handler
 */
import { GatewayManager } from '../../../gateway/manager';
import { updateSkillConfig, getSkillConfig, getAllSkillConfigs } from '../../../utils/skill-config';
import { parseJsonObject, toStringRecord } from '../parse';
import { formatTable } from '../output';
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult } from '../types';

export async function handleSkill(ctx: CommandContext, gateway: GatewayManager): Promise<CommandResult> {
  const [subcommand, ...rest] = ctx.args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printCommandHelp('skill');
    return { data: undefined };
  }

  switch (subcommand) {
    case 'status': {
      await gateway.start();
      const data = await gateway.rpc('skills.status');
      return {
        data,
        humanFormatter: formatSkillStatusHuman,
      };
    }
    case 'enable': {
      if (!rest[0]) throw new Error('Usage: skill enable <skillKey>');
      await gateway.start();
      return { data: await gateway.rpc('skills.update', { skillKey: rest[0], enabled: true }) };
    }
    case 'disable': {
      if (!rest[0]) throw new Error('Usage: skill disable <skillKey>');
      await gateway.start();
      return { data: await gateway.rpc('skills.update', { skillKey: rest[0], enabled: false }) };
    }
    case 'list-config':
      return { data: getAllSkillConfigs() };
    case 'get-config': {
      if (!rest[0]) throw new Error('Usage: skill get-config <skillKey>');
      return { data: getSkillConfig(rest[0]) };
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

      return { data: updateSkillConfig(skillKey, { apiKey, env }) };
    }
    default:
      throw new Error('Usage: skill <status|enable|disable|list-config|get-config|update-config>');
  }
}

function formatSkillStatusHuman(value: unknown): string {
  const data = value as { skills?: Array<{ key?: string; name?: string; enabled?: boolean; status?: string }> } | Array<{ key?: string; name?: string; enabled?: boolean; status?: string }>;

  const skills = Array.isArray(data) ? data : (data as { skills?: unknown[] }).skills;
  if (!Array.isArray(skills) || skills.length === 0) return 'No skills found\n';

  const rows = skills.map((s: { key?: string; name?: string; enabled?: boolean; status?: string }) => ({
    key: s.key || '-',
    name: s.name || '-',
    enabled: s.enabled ? 'yes' : 'no',
    status: s.status || '-',
  }));

  return formatTable(rows);
}
