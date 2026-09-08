import { spawn } from 'node:child_process';
import { startPhp } from './php-server.mjs';
const children = [startPhp(), spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '8080', '--strictPort'], { stdio: 'inherit' })];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; children.forEach(c => c.kill('SIGTERM')); process.exitCode = code; }
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
children.forEach(child => { child.on('exit', code => stop(code ?? 0)); child.on('error', () => stop(1)); });
