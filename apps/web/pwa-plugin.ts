import type { Plugin } from 'vite';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
// Precache the actual build (including lazy scene chunks, models and fonts),
// so an installed offline match does not lose assets after its first navigation.
export function offlineGame(): Plugin {
  let publicDir: string;
  return {
    name: 'skyhoof-offline',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_, bundle) {
      const hash = createHash('sha256');
      const files: string[] = ['/index.html'];
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const file = resolve(dir, entry.name);
          if (entry.isDirectory()) walk(file);
          else {
            files.push('/' + relative(publicDir, file).split('\\').join('/'));
            hash.update(readFileSync(file));
          }
        }
      };
      walk(publicDir);
      for (const [name, asset] of Object.entries(bundle)) {
        files.push('/' + name);
        hash.update(asset.type === 'chunk' ? asset.code : asset.source);
      }
      const version = hash.digest('hex').slice(0, 16);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `
const CACHE = 'skyhoof-${version}';
const FILES = ${JSON.stringify([...new Set(files)])};
const KNOWN = new Set(FILES);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('skyhoof-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match('/index.html'))));
  } else if (KNOWN.has(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(url.pathname)).then(cached => cached || fetch(event.request)));
  }
});
`,
      });
    },
  };
}
