// Checks internal href, src and poster references in public/ and same-page anchors.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const root = resolve('public');
const pages = readdirSync(root, { recursive: true }).map(String).filter((f) => f.endsWith('.html')).map((f) => join(root, f));
let missing = 0;

const exists = (path) => existsSync(path) && (statSync(path).isFile() || existsSync(join(path, 'index.html')));

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const [, ref] of html.matchAll(/(?:href|src|poster)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    const [path, hash] = ref.split('#');
    const target = !path ? page : path.startsWith('/') ? join(root, path) : join(dirname(page), path);
    const file = target.endsWith('.html') ? target : exists(target) && statSync(target).isDirectory() ? join(target, 'index.html') : target;
    if (!exists(target) || (hash && !readFileSync(file, 'utf8').includes(`id="${hash}"`))) {
      console.log(`MISSING ${page.slice(root.length + 1)}: ${ref}`);
      missing++;
    }
  }
}
console.log(`${pages.length} pages checked, ${missing} missing references`);
process.exitCode = missing ? 1 : 0;
