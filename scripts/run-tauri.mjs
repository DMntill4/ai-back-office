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

async function ensureApiServer() {
  if (action !== 'dev') return null;

  try {
    const res = await fetch('http://localhost:3001/api/health', {
      signal: AbortSignal.timeout(1000),
    });
    if (res.ok) {
      console.log('[Mint Desktop] Backend Fastify API server ya activo en http://localhost:3001');
      return null;
    }
  } catch {
    // Servidor no activo
  }

  console.log('[Mint Desktop] Iniciando Fastify Backend API server en http://localhost:3001...');
  const tsxCmd = path.resolve(
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
  );
  const apiEntry = path.resolve('packages', 'api', 'src', 'index.ts');

  const apiProc = spawn(`"${tsxCmd}" "${apiEntry}"`, [], {
    stdio: 'inherit',
    shell: true,
    cwd: path.resolve('.'),
    env,
  });

  // Esperar a que /api/health responda ok (máximo 10s)
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://localhost:3001/api/health', {
        signal: AbortSignal.timeout(500),
      });
      if (res.ok) {
        console.log('[Mint Desktop] Backend API Server conectado exitosamente.');
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }

  return apiProc;
}

const apiProcess = await ensureApiServer();

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

function cleanup() {
  if (apiProcess && !apiProcess.killed) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', apiProcess.pid.toString(), '/f', '/t'], {
          stdio: 'ignore',
        });
      } else {
        apiProcess.kill();
      }
    } catch {}
  }
}

child.on('exit', (code) => {
  cleanup();
  process.exit(code ?? 0);
});

process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});
