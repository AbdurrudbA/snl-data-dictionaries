'use client';
import { useEffect, useState, useMemo } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type FileEntry = { name: string; path: string; size: number; lastModified?: string };
type Manifest = { generatedAt: string; categories: Record<string, FileEntry[]> };

export default function Page() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load theme preference
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') setTheme('dark');
  }, []);

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch('/manifest.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(setManifest)
      .catch(() =>
        setManifest({ generatedAt: '', categories: {} } as Manifest)
      );
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

  const categories = manifest ? Object.keys(manifest.categories) : [];
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const supportMailLink =
    'mailto:datafeed.support.snl@spglobal.com?subject=Data%20Dictionary%20Assistance%20Request';

  return (
    <main
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: 'Inter, system-ui, Arial',
        transition: 'background 1.5s ease',
        background:
          theme === 'light'
            ? 'linear-gradient(180deg, #fceabb, #f8b500)'
            : 'linear-gradient(180deg, #1e3c72, #2a5298)',
        color: theme === 'light' ? '#111' : '#eee',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          background: theme === 'light' ? '#fff' : '#1a1a1a',
          borderRight: `1px solid ${theme === 'light' ? '#eee' : '#333'}`,
          padding: '24px',
          boxShadow: '2px 0 8px rgba(0,0,0,0.05)',
          overflowY: 'auto',
          transition: 'background 1s ease, color 1s ease',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src="/spglobal_logo.png"
            alt="S&P Global Logo"
            style={{
              width: '140px',
              height: 'auto',
              objectFit: 'contain',
              margin: '0 auto',
              display: 'block',
              filter: theme === 'light' ? 'none' : 'invert(1)',
              transition: 'filter 1s ease',
            }}
          />
        </div>
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
                  activeCategory === cat
                    ? '#b50e0e'
                    : theme === 'light'
                    ? 'transparent'
                    : '#222',
                color: activeCategory === cat ? '#fff' : theme === 'light' ? '#111' : '#ccc',
                transition: 'all 0.4s ease',
                fontWeight: 500,
                outline: 'none',
              }}
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
          transition: 'color 0.8s ease',
        }}
      >
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          title="Toggle Light/Dark Mode"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 28,
            transition: 'transform 0.5s ease, filter 1s ease',
            transform: theme === 'light' ? 'rotate(0deg)' : 'rotate(180deg)',
            filter: theme === 'light' ? 'none' : 'drop-shadow(0 0 8px #f0e68c)',
          }}
        >
          {theme === 'light' ? '🌞' : '🌙'}
        </button>

        {!activeCategory && (
          <div
            style={{
              color: theme === 'light' ? '#444' : '#ccc',
              fontSize: 15,
              textAlign: 'center',
              marginTop: '20%',
            }}
          >
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
              <p style={{ fontSize: 14, color: theme === 'light' ? '#666' : '#bbb', margin: '4px 0 12px' }}>
                {filteredFiles.length} files available · Last updated:{' '}
                {new Date(manifest?.generatedAt || '').toLocaleDateString()}
              </p>
              <hr
                style={{
                  border: 'none',
                  borderBottom: `1px solid ${theme === 'light' ? '#eee' : '#444'}`,
                }}
              />
            </div>

            {filteredFiles.length > 0 && (
              <div style={{ marginBottom: 20, textAlign: 'right' }}>
                <button
                  onClick={selectAllVisible}
                  style={{
                    background: theme === 'light' ? '#111' : '#eee',
                    color: theme === 'light' ? '#fff' : '#111',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                >
                  {filteredFiles.every(f => selected[f.path])
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>
            )}

            {/* File Cards */}
            {filteredFiles.length === 0 ? (
              <div style={{ color: '#888', fontSize: 15, textAlign: 'center' }}>
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
                      background: theme === 'light' ? '#fff' : '#2a2a2a',
                      borderRadius: 16,
                      boxShadow:
                        theme === 'light'
                          ? '0 2px 10px rgba(0,0,0,0.08)'
                          : '0 2px 10px rgba(255,255,255,0.05)',
                      padding: '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      animation: `fadeIn 0.4s ease ${idx * 0.05}s both`,
                      transition: 'transform 0.3s, background 1s, box-shadow 1s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow =
                        '0 6px 18px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow =
                        theme === 'light'
                          ? '0 2px 10px rgba(0,0,0,0.08)'
                          : '0 2px 10px rgba(255,255,255,0.05)';
                    }}
                  >
                    <span style={{ fontSize: 40, color: '#1d6f42' }}>📘</span>
                    <div
                      style={{
                        marginTop: 10,
                        fontWeight: 600,
                        fontSize: 16,
                        color: theme === 'light' ? '#222' : '#f4f4f4',
                        wordBreak: 'break-word',
                        maxWidth: '90%',
                      }}
                    >
                      {f.name}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: theme === 'light' ? '#777' : '#ccc',
                        marginTop: 4,
                        marginBottom: 16,
                      }}
                    >
                      {f.size >= 1024 * 1024
                        ? (f.size / (1024 * 1024)).toFixed(1) + ' MB'
                        : (f.size / 1024).toFixed(1) + ' KB'}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
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
                          transition: 'background 0.3s',
                        }}
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

        {/* Need Help button */}
        <a
          href={supportMailLink}
          style={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            background: '#b50e0e',
            color: '#fff',
            borderRadius: 30,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 20px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 15,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          📩 Need Help?
        </a>
      </section>
    </main>
  );
}
