import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const cargoBin = path.join(os.homedir(), '.cargo', 'bin');
const nodeBin = path.dirname(process.execPath);

const env = { ...process.env };
const existingPath = env.PATH || env.Path || '';
const pathSeparator = path.delimiter;
const parts = existingPath.split(pathSeparator).filter(Boolean);

if (!parts.some((p) => p.toLowerCase() === cargoBin.toLowerCase())) {
  parts.unshift(cargoBin);
}
if (!parts.some((p) => p.toLowerCase() === nodeBin.toLowerCase())) {
  parts.unshift(nodeBin);
}

const joinedPath = parts.join(pathSeparator);
env.PATH = joinedPath;
env.Path = joinedPath;

const action = process.argv[2] || 'dev';
const tauriArgs = [action, ...process.argv.slice(3)];

const localTauriCmd = path.resolve(
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tauri.cmd' : 'tauri'
);

const command = fs.existsSync(localTauriCmd)
  ? `"${localTauriCmd}" ${tauriArgs.join(' ')}`
  : `npx.cmd tauri ${tauriArgs.join(' ')}`;

const child = spawn(command, [], {
  stdio: 'inherit',
  shell: true,
  env,
  cwd: path.resolve('packages/web'),
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
