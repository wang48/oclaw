#!/usr/bin/env node
/**
 * CLI test runner for development
 * Usage: pnpm cli [args...]
 *
 * This script runs the built CLI. Make sure to run `pnpm build:vite` first.
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Get CLI arguments (everything after the script name)
const cliArgs = process.argv.slice(2);

// Run electron with the built main entry point and CLI args
const electron = join(rootDir, 'node_modules', '.bin', 'electron');
const mainEntry = join(rootDir, 'dist-electron', 'main', 'index.js');

const child = spawn(electron, [mainEntry, ...cliArgs], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
