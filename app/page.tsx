'use client';
import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type FileEntry = { name: string; path: string; size: number };
type Manifest = { generatedAt: string; categories: Record<string, FileEntry[]> };

export default function Page() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/manifest.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(setManifest)
      .catch(() => setManifest({ generatedAt: '', categories: {} } as Manifest));
  }, []);

  const allItems = useMemo(() => {
    if (!manifest) return [];
    const rows: Array<{ key:string; category: string; file: FileEntry }> = [];
    Object.entries(manifest.categories).forEach(([cat, files]) => {
      files.forEach(f => rows.push({ key: `${cat}::${f.path}`, category: cat, file: f }));
    });
    return rows;
  }, [manifest]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(r =>
      r.category.toLowerCase().includes(q) ||
      r.file.name.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  const toggle = (key: string) => setSelected(s => ({ ...s, [key]: !s[key] }));
  const noneSelected = Object.values(selected).every(v => !v);

  async function downloadSelectedZip() {
    setBusy(true);
    try {
      const zip = new JSZip();
      const picks = filtered.filter(r => selected[r.key]);
      if (picks.length === 0) return;
      for (const p of picks) {
        const url = encodeURI(p.file.path);
        const resp = await fetch(url);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        zip.file(`${p.category}/${p.file.name}`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'data-dictionaries.zip');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '32px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#b50e0e', margin: 0 }}>SNL Feed Data Dictionaries</h1>
        <p style={{ marginTop: 8, color: '#333' }}>
          Browse by category and download one or many files. No login required.
        </p>
      </header>

      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:16 }}>
        <input
          placeholder="Search by category or filename…"
          value={query}
          onChange={(e)=>setQuery(e.target.value)}
          style={{ flex:1, padding:'10px 12px', border:'1px solid #ddd', borderRadius:12 }}
        />
        <button
          onClick={downloadSelectedZip}
          disabled={busy || noneSelected}
          style={{
            padding:'10px 16px',
            borderRadius:12,
            border:'none',
            background: busy || noneSelected ? '#ccc' : '#b50e0e',
            color:'#fff',
            cursor: busy || noneSelected ? 'not-allowed' : 'pointer'
          }}
        >
          {busy ? 'Preparing…' : 'Download Selected (ZIP)'}
        </button>
      </div>

      {manifest && filtered.length > 0 && (
        <div style={{ display:'grid', gap:12 }}>
          {filtered.map(({ key, category, file }) => (
            <div key={key} style={{
              background:'#fff', border:'1px solid #eee', borderRadius:16,
              padding:14, display:'flex', alignItems:'center', justifyContent:'space-between'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <input type="checkbox" checked={!!selected[key]} onChange={()=>toggle(key)} />
                <div>
                  <div style={{ fontWeight:600 }}>{file.name}</div>
                  <div style={{ color:'#666', fontSize:13 }}>{category} · {(file.size/1024).toFixed(1)} KB</div>
                </div>
              </div>
              <a href={encodeURI(file.path)} download style={{
                textDecoration:'none', background:'#111', color:'#fff',
                padding:'8px 12px', borderRadius:12
              }}>
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
