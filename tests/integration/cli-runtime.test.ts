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
  it('supports start/status/logs/stop flow', () => {
    const distMain = join(process.cwd(), 'dist-electron', 'main', 'index.js');
    expect(existsSync(distMain)).toBe(true);

    const startRes = runCli(['start', '--json']);
    if (environmentCannotRunElectron(startRes)) {
      return;
    }
    expect(startRes.status).toBe(0);
    expect(startRes.stdout).toContain('"success": true');

    const statusRes = runCli(['status', '--json']);
    expect(statusRes.status).toBe(0);
    expect(statusRes.stdout).toContain('"instance"');

    const runtimeRes = runCli(['runtime', 'status', '--json']);
    expect(runtimeRes.status).toBe(0);
    expect(runtimeRes.stdout).toContain('"runtimePath"');

    const logsRes = runCli(['logs', '--lines', '20']);
    expect(logsRes.status).toBe(0);

    const compatRes = runCli(['server', '--json']);
    expect(compatRes.status).toBe(0);

    const stopRes = runCli(['stop', '--json']);
    expect(stopRes.status).toBe(0);
    expect(stopRes.stdout).toContain('"success": true');
  });
});
