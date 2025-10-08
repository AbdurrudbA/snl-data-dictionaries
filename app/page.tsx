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

  const selectAllVisible = () => {
    const visiblePaths = filteredFiles.map(f => f.path);
    const allSelected = visiblePaths.every(p => selected[p]);
    const newSel = { ...selected };
    visiblePaths.forEach(p => (newSel[p] = !allSelected));
    setSelected(newSel);
  };

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

  if (!manifest)
    return (
      <main
        style={{
          padding: 60,
          fontFamily: 'Inter, system-ui, Arial',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 18, color: '#666' }}>Loading data…</div>
      </main>
    );

  const categories = Object.keys(manifest.categories);

  return (
    <main
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: 'Inter, system-ui, Arial',
        background: '#fafafa',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          background: '#fff',
          borderRight: '1px solid #eee',
          padding: '24px',
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
          overflowY: 'auto',
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 16,
            color: '#b50e0e',
          }}
        >
          Data Dictionaries
        </h2>
        <div>
          {categories.map(cat => (
            <div
              key={cat}
              onClick={() => setActiveCategory(cat)}
              tabIndex={0}
              style={{
                padding: '10px 14px',
                borderRadius: 10,
                marginBottom: 6,
                cursor: 'pointer',
                background:
                  activeCategory === cat ? '#b50e0e' : 'transparent',
                color: activeCategory === cat ? '#fff' : '#111',
                transition: 'all 0.2s ease',
                fontWeight: 500,
                outline: 'none',
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.background =
                  activeCategory === cat ? '#a10d0d' : '#f3f3f3')
              }
              onMouseLeave={e =>
                (e.currentTarget.style.background =
                  activeCategory === cat ? '#b50e0e' : 'transparent')
              }
            >
              {cat}
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 32,
          overflowY: 'auto',
        }}
      >
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: '#fafafa',
            paddingBottom: 12,
            borderBottom: '1px solid #eee',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <input
            placeholder="Search files…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '12px 14px',
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 14,
              background: '#fff',
            }}
          />
          <button
            onClick={selectAllVisible}
            disabled={!activeCategory || filteredFiles.length === 0}
            style={{
              padding: '10px 16px',
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Toggle Select All
          </button>
          <button
            onClick={downloadSelected}
            disabled={busy || !Object.values(selected).some(v => v)}
            style={{
              padding: '10px 18px',
              background: busy ? '#ccc' : '#b50e0e',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              boxShadow: busy
                ? 'none'
                : '0 2px 6px rgba(181,14,14,0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            {busy ? 'Preparing…' : 'Download Selected'}
          </button>
        </header>

        <div style={{ marginTop: 20 }}>
          {!activeCategory && (
            <div style={{ color: '#666', fontSize: 15, textAlign: 'center' }}>
              Select a category from the left to browse files.
            </div>
          )}

          {activeCategory && filteredFiles.length === 0 && (
            <div style={{ color: '#666', fontSize: 15, textAlign: 'center' }}>
              No files found in <strong>{activeCategory}</strong>.
            </div>
          )}

          {activeCategory && filteredFiles.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 13,
                  color: '#555',
                  marginBottom: 10,
                  textAlign: 'right',
                }}
              >
                {filteredFiles.length} files
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 16,
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(280px, 1fr))',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                {filteredFiles.map(f => (
                  <div
                    key={f.path}
                    style={{
                      border: '1px solid #eaeaea',
                      borderRadius: 12,
                      padding: '14px 16px',
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e =>
                      (e.currentTarget.style.boxShadow =
                        '0 2px 8px rgba(0,0,0,0.08)')
                    }
                    onMouseLeave={e =>
                      (e.currentTarget.style.boxShadow =
                        '0 1px 3px rgba(0,0,0,0.05)')
                    }
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flex: 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!selected[f.path]}
                        onChange={() => toggleSelect(f.path)}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                          }}
                        >
                          {f.name}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#777',
                            marginTop: 2,
                          }}
                        >
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
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
