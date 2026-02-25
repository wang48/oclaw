import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from './logger';
import { getResourcesDir } from './paths';

const OCLAW_BEGIN = '<!-- oclaw:begin -->';
const OCLAW_END = '<!-- oclaw:end -->';

/**
 * Merge a Oclaw context section into an existing file's content.
 * If markers already exist, replaces the section in-place.
 * Otherwise appends it at the end.
 */
export function mergeOclawSection(existing: string, section: string): string {
  const wrapped = `${OCLAW_BEGIN}\n${section.trim()}\n${OCLAW_END}`;
  const beginIdx = existing.indexOf(OCLAW_BEGIN);
  const endIdx = existing.indexOf(OCLAW_END);
  if (beginIdx !== -1 && endIdx !== -1) {
    return existing.slice(0, beginIdx) + wrapped + existing.slice(endIdx + OCLAW_END.length);
  }
  return existing.trimEnd() + '\n\n' + wrapped + '\n';
}

/**
 * Collect all unique workspace directories from the openclaw config:
 * the defaults workspace, each agent's workspace, and any workspace-*
 * directories that already exist under ~/.openclaw/.
 */
function resolveAllWorkspaceDirs(): string[] {
  const openclawDir = join(homedir(), '.openclaw');
  const dirs = new Set<string>();

  const configPath = join(openclawDir, 'openclaw.json');
  try {
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      const defaultWs = config?.agents?.defaults?.workspace;
      if (typeof defaultWs === 'string' && defaultWs.trim()) {
        dirs.add(defaultWs.replace(/^~/, homedir()));
      }

      const agents = config?.agents?.list;
      if (Array.isArray(agents)) {
        for (const agent of agents) {
          const ws = agent?.workspace;
          if (typeof ws === 'string' && ws.trim()) {
            dirs.add(ws.replace(/^~/, homedir()));
          }
        }
      }
    }
  } catch {
    // ignore config parse errors
  }

  try {
    for (const entry of readdirSync(openclawDir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('workspace')) {
        dirs.add(join(openclawDir, entry.name));
      }
    }
  } catch {
    // ignore read errors
  }

  if (dirs.size === 0) {
    dirs.add(join(openclawDir, 'workspace'));
  }

  return [...dirs];
}

/**
 * Ensure Oclaw context snippets are merged into the openclaw workspace
 * bootstrap files. Reads `*.oclaw.md` templates from resources/context/
 * and injects them as marker-delimited sections into the corresponding
 * workspace `.md` files (e.g. AGENTS.oclaw.md -> AGENTS.md).
 *
 * Iterates over every discovered agent workspace so all agents receive
 * the Oclaw context regardless of which one is active.
 */
export function ensureOclawContext(): void {
  const contextDir = join(getResourcesDir(), 'context');
  if (!existsSync(contextDir)) {
    logger.debug('Oclaw context directory not found, skipping context merge');
    return;
  }

  let files: string[];
  try {
    files = readdirSync(contextDir).filter((f) => f.endsWith('.oclaw.md'));
  } catch {
    return;
  }

  const workspaceDirs = resolveAllWorkspaceDirs();

  for (const workspaceDir of workspaceDirs) {
    if (!existsSync(workspaceDir)) {
      mkdirSync(workspaceDir, { recursive: true });
    }

    for (const file of files) {
      const targetName = file.replace('.oclaw.md', '.md');
      const targetPath = join(workspaceDir, targetName);
      const section = readFileSync(join(contextDir, file), 'utf-8');

      let existing = '';
      if (existsSync(targetPath)) {
        existing = readFileSync(targetPath, 'utf-8');
      }

      const merged = mergeOclawSection(existing, section);
      if (merged !== existing) {
        writeFileSync(targetPath, merged, 'utf-8');
        logger.info(`Merged Oclaw context into ${targetName} (${workspaceDir})`);
      }
    }
  }
}
