'use client';
import { useEffect, useState, useMemo } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type FileEntry = { name: string; path: string; size: number };
type Manifest = { generatedAt: string; categories: Record<string, FileEntry[]> };

export default function Page() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/manifest.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(setManifest)
      .catch(() => setManifest({ generatedAt: '', categories: {} } as Manifest));
  }, []);

  const filteredFiles = useMemo(() => {
    if (!manifest || !activeCategory) return [];
    let files = manifest.categories[activeCategory] || [];
    if (query.trim()) {
      const q = query.toLowerCase();
      files = files.filter(f => f.name.toLowerCase().includes(q));
    }
    return files;
  }, [manifest, activeCategory, query]);

  const toggleSelect = (path: string) =>
    setSelected(s => ({ ...s, [path]: !s[path] }));

  async function downloadSelected() {
    setBusy(true);
    try {
      const zip = new JSZip();
      const picks = Object.keys(selected).filter(k => selected[k]);
      if (picks.length === 0) return;
      for (const p of picks) {
        const resp = await fetch(p);
        if (!resp.ok) continue;
        const blob = await resp.blob();
        const parts = p.split('/');
        const category = parts.length > 1 ? parts[1] : 'Other';
        const name = parts[parts.length - 1];
        zip.file(`${category}/${name}`, blob);
      }
      const out = await zip.generateAsync({ type: 'blob' });
      saveAs(out, 'data-dictionaries.zip');
    } finally {
      setBusy(false);
    }
  }

  if (!manifest) return <main style={{ padding: 40 }}>Loading…</main>;

  const categories = Object.keys(manifest.categories);

  return (
    <main style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, Arial' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: '#f5f5f5',
        borderRight: '1px solid #ddd',
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h2 style={{ fontSize: 16, marginBottom: 12, color: '#b50e0e' }}>Categories</h2>
        {categories.map(cat => (
          <div
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              marginBottom: 6,
              cursor: 'pointer',
              background: activeCategory === cat ? '#b50e0e' : 'transparent',
              color: activeCategory === cat ? '#fff' : '#111'
            }}
          >
            {cat}
          </div>
        ))}
      </aside>

      {/* Main content */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24 }}>
        <header style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input
            placeholder="Search files…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: 8
            }}
          />
          <button
            onClick={downloadSelected}
            disabled={busy || !Object.values(selected).some(v => v)}
            style={{
              padding: '10px 16px',
              background: busy ? '#ccc' : '#b50e0e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: busy ? 'not-allowed' : 'pointer'
            }}
          >
            {busy ? 'Preparing…' : 'Download Selected'}
          </button>
        </header>

        {!activeCategory && (
          <div style={{ color: '#666', fontSize: 14 }}>
            Select a category from the left to browse its files.
          </div>
        )}

        {activeCategory && filteredFiles.length === 0 && (
          <div style={{ color: '#666', fontSize: 14 }}>
            No files found in {activeCategory}.
          </div>
        )}

        {activeCategory && filteredFiles.length > 0 && (
          <div style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
          }}>
            {filteredFiles.map(f => (
              <div key={f.path} style={{
                border: '1px solid #eee',
                borderRadius: 12,
                padding: '12px',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={!!selected[f.path]}
                    onChange={() => toggleSelect(f.path)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: '#777' }}>
                      {(f.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
                <a
                  href={encodeURI(f.path)}
                  download
                  style={{
                    background: '#111',
                    color: '#fff',
                    textDecoration: 'none',
                    padding: '6px 10px',
                    borderRadius: 8
                  }}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
