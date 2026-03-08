import { existsSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { describe, expect, it } from 'vitest';

const runIntegration = process.env.OCLAW_RUN_CLI_INTEGRATION === '1';
const describeIntegration = runIntegration ? describe : describe.skip;

function runCli(args: string[]) {
  const runner = join(process.cwd(), 'scripts', 'test-cli.mjs');
  return spawnSync('node', [runner, ...args], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    timeout: 240000,
  });
}

function environmentCannotRunElectron(result: ReturnType<typeof runCli>): boolean {
  const output = `${result.stdout}\n${result.stderr}`;
  return /SIGABRT|Failed to connect to the bus|cannot open display|no usable sandbox|Electron exited with signal/i.test(output);
}

describeIntegration('cli runtime integration', () => {
  it('supports server/ps/logs/stop flow', () => {
    const distMain = join(process.cwd(), 'dist-electron', 'main', 'index.js');
    expect(existsSync(distMain)).toBe(true);

    const startRes = runCli(['server', '--json']);
    if (environmentCannotRunElectron(startRes)) {
      return;
    }
    expect(startRes.status).toBe(0);
    expect(startRes.stdout).toContain('"success": true');

    const psRes = runCli(['ps', '--json']);
    expect(psRes.status).toBe(0);
    expect(psRes.stdout).toContain('"name": "openclaw"');

    const logsRes = runCli(['logs', '--lines', '20']);
    expect(logsRes.status).toBe(0);

    const stopRes = runCli(['stop', '--json']);
    expect(stopRes.status).toBe(0);
    expect(stopRes.stdout).toContain('"success": true');
  });
});
