import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const cargoBin = path.join(os.homedir(), '.cargo', 'bin');
const env = { ...process.env };

if (!env.PATH || !env.PATH.toLowerCase().includes(cargoBin.toLowerCase())) {
  env.PATH = `${cargoBin};${env.PATH || ''}`;
}

const action = process.argv[2] || 'dev';
const tauriArgs = [action, ...process.argv.slice(3)];

const child = spawn(`npx tauri ${tauriArgs.join(' ')}`, [], {
  stdio: 'inherit',
  shell: true,
  env,
  cwd: path.resolve('packages/web'),
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
