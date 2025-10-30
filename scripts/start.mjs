import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV ??= 'production';

const entryUrl = new URL('../dist/index.js', import.meta.url);

try {
  await access(fileURLToPath(entryUrl), constants.F_OK);
} catch {
  console.error('Compiled server output not found. Did you run "npm run build"?');
  process.exit(1);
}

await import(entryUrl.href);
