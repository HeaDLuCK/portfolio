#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const action = process.argv[2];
if (!['check', 'login', 'deploy'].includes(action)) throw new Error('Choose check, login, or deploy');
const work = path.join(root, 'work', 'multiplayer');
fs.mkdirSync(work, { recursive: true });
const args = action === 'login' ? ['login'] : ['deploy', '--config', path.join(root, 'multiplayer', 'wrangler.jsonc')];
if (action === 'check') args.push('--dry-run', '--outdir', path.join(work, 'bundle'));
const child = spawn(process.execPath, [path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), ...args], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, WRANGLER_LOG_PATH: path.join(work, 'wrangler.log'), WRANGLER_SEND_METRICS: 'false' },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
