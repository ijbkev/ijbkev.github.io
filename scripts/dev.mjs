import { spawn } from 'node:child_process';
import './setup-admin.mjs';

const children = [
  spawn('npx', ['wrangler', 'dev', '--local', '--ip', '127.0.0.1', '--port', '8787'], { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } }),
  spawn('npx', ['vite', '--host', 'localhost', '--port', '8080', '--strictPort'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; children.forEach(c => c.kill('SIGTERM')); process.exitCode = code; }
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
children.forEach(child => { child.on('exit', code => stop(code ?? 0)); child.on('error', () => stop(1)); });
