import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const env = { ...process.env };

while (args[0] && args[0].includes('=')) {
  const assignment = args.shift();
  const [rawKey, ...rawValueParts] = assignment.split('=');
  const key = rawKey.trim();
  if (!key) {
    console.error(`Invalid environment assignment: ${assignment}`);
    process.exit(1);
  }
  env[key] = rawValueParts.join('=');
}

if (args.length === 0) {
  console.error('Missing command to execute.');
  process.exit(1);
}

const child = spawn(args[0], args.slice(1), {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
