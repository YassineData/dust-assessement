// Runs src/lib/hubspot-export.check.ts without a test framework: esbuild (already installed with Vite) bundles it, node runs it.
// Usage: npm run check:hubspot
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const dir = mkdtempSync(join(tmpdir(), 'hubspot-check-'));
const outfile = join(dir, 'check.mjs');
try {
  await build({
    entryPoints: [join(root, 'src/lib/hubspot-export.check.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    alias: { '@': join(root, 'src') },
    logLevel: 'error',
  });
  await import(pathToFileURL(outfile).href);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
