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

  useEffect(() => {
    fetch('/manifest.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(setManifest)
      .catch(() => setManifest({ generatedAt: '', categories: {} } as Manifest));
  }, []);

  const filteredFiles = useMemo(() => {
    if (!manifest || !activeCategory) return [];
    return manifest.categories[activeCategory] || [];
  }, [manifest, activeCategory]);

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
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <main
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: 'Inter, system-ui, Arial',
        background: '#f9f9f9',
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
          position: 'relative',
        }}
      >
        {!activeCategory && (
          <div style={{ color: '#666', fontSize: 15, textAlign: 'center', marginTop: '20%' }}>
            Select a category from the left to browse files.
          </div>
        )}

        {activeCategory && (
          <>
            {/* Category Header */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, color: '#b50e0e', margin: 0 }}>
                {activeCategory}
              </h1>
              <p style={{ fontSize: 14, color: '#666', margin: '4px 0 12px' }}>
                {filteredFiles.length} files available · Last updated:{' '}
                {new Date(manifest.generatedAt).toLocaleDateString()}
              </p>
              <hr style={{ border: 'none', borderBottom: '1px solid #eee' }} />
            </div>
            {/* Select All Button */}
            {filteredFiles.length > 0 && (
              <div style={{ marginBottom: 20, textAlign: 'right' }}>
                <button
                  onClick={selectAllVisible}
                  style={{
                    background: '#111',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.background = '#333')
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.background = '#111')
                  }
                >
                  {
                    filteredFiles.every(f => selected[f.path])
                      ? 'Deselect All'
                      : 'Select All'
                  }
                </button>
              </div>
            )}
            {filteredFiles.length === 0 ? (
              <div style={{ color: '#666', fontSize: 15, textAlign: 'center' }}>
                No files found in <strong>{activeCategory}</strong>.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                  gap: 28,
                  paddingBottom: 100,
                }}
              >
                {filteredFiles.map((f, idx) => (
                  <div
                    key={f.path}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'center',
                      animation: `fadeIn 0.4s ease ${idx * 0.05}s both`,
                      transition: 'transform 0.2s ease, box-shadow 0.3s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow =
                        '0 6px 18px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow =
                        '0 2px 10px rgba(0,0,0,0.08)';
                    }}
                  >
                    <span style={{ fontSize: 40, color: '#1d6f42' }}>📘</span>
                    <div
                      style={{
                        marginTop: 10,
                        fontWeight: 600,
                        fontSize: 16,
                        color: '#222',
                        wordBreak: 'break-word',
                        maxWidth: '90%',
                      }}
                    >
                      {f.name}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#777',
                        marginTop: 4,
                        marginBottom: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <span>
                        {f.size >= 1024 * 1024
                          ? (f.size / (1024 * 1024)).toFixed(1) + ' MB'
                          : (f.size / 1024).toFixed(1) + ' KB'}
                      </span>
                    
                      {f.lastModified && (
                        <span style={{ color: '#999', fontSize: 12 }}>
                          Updated{' '}
                          {new Date(f.lastModified).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!selected[f.path]}
                        onChange={() => toggleSelect(f.path)}
                      />
                      <a
                        href={encodeURI(f.path)}
                        download
                        style={{
                          display: 'inline-block',
                          background: '#b50e0e',
                          color: '#fff',
                          textDecoration: 'none',
                          padding: '10px 20px',
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 500,
                          transition: 'background 0.2s, transform 0.1s',
                        }}
                        onMouseEnter={e =>
                          (e.currentTarget.style.background = '#9a0c0c')
                        }
                        onMouseLeave={e =>
                          (e.currentTarget.style.background = '#b50e0e')
                        }
                        onMouseDown={e =>
                          (e.currentTarget.style.transform = 'scale(0.97)')
                        }
                        onMouseUp={e =>
                          (e.currentTarget.style.transform = 'scale(1)')
                        }
                      >
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Sticky footer bar for multi-download */}
        {selectedCount > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: 20,
              left: 280,
              right: 20,
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              padding: '14px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'opacity 0.3s',
            }}
          >
            <div style={{ color: '#333', fontSize: 15 }}>
              {selectedCount} file{selectedCount > 1 ? 's' : ''} selected
            </div>
            <button
              onClick={downloadSelected}
              disabled={busy}
              style={{
                background: busy ? '#ccc' : '#b50e0e',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                cursor: busy ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {busy ? 'Preparing…' : 'Download Selected'}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

// Inject fade + dark mode styles after page mounts
useEffect(() => {
  const style = document.createElement('style');
  style.innerHTML = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-color-scheme: dark) {
    body { background: #111; color: #eee; }
    aside { background: #1c1c1c; border-color: #333; }
    section { background: #111; }
    div, p, h1, h2 { color: #eee !important; }
  }
  `;
  document.head.appendChild(style);
}, []);

