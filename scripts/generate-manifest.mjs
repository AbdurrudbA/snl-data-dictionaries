import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const VALID_EXT = new Set(['.csv','.xlsx','.xls','.txt']);

function walk(dir, baseUrl = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    const urlPath = path.posix.join('/', baseUrl, e.name);
    if (e.isDirectory()) {
      files.push(...walk(full, path.posix.join(baseUrl, e.name)));
    } else {
      const ext = path.extname(e.name).toLowerCase();
      if (!VALID_EXT.has(ext)) continue;
      const st = fs.statSync(full);
      files.push({ name: e.name, path: urlPath, size: st.size });
    }
  }
  return files;
}

function build() {
  const categories = {};
  const top = fs.readdirSync(PUBLIC_DIR, { withFileTypes: true });
  for (const e of top) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('.')) continue;
    const catDir = path.join(PUBLIC_DIR, e.name);
    const files = walk(catDir, e.name);
    categories[e.name] = files;
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    categories
  };
  const out = path.join(PUBLIC_DIR, 'manifest.json');
  fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
  console.log('Manifest written:', out);
}
build();
