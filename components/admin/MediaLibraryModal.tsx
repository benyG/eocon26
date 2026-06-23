"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface GCSFile {
  name: string;
  url: string;
  size: number;
  updated: string;
}

interface Props {
  onSelect: (url: string) => void;
  onClose: () => void;
}

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MediaLibraryModal({ onSelect, onClose }: Props) {
  const [files, setFiles] = useState<GCSFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/library");
    if (res.ok) setFiles(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/library", { method: "POST", body: fd });
    if (res.ok) await load();
    setUploading(false);
  };

  const deleteFile = async (name: string) => {
    if (!confirm(`Supprimer "${name.split("/").pop()}" ?`)) return;
    setDeleting(name);
    await fetch("/api/admin/library", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setFiles(prev => prev.filter(f => f.name !== name));
    if (selected === name) setSelected(null);
    setDeleting(null);
  };

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const isImage = (name: string) => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={onClose}>
      <div
        className="bg-[#0d0d0d] border border-gray-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div>
            <h2 className="text-white font-bold font-mono text-sm">📁 Bibliothèque de médias</h2>
            <p className="text-gray-600 text-xs font-mono">{files.length} fichier{files.length !== 1 ? "s" : ""} · Google Cloud Storage</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="cyber-input text-xs px-3 py-1.5 rounded w-40"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs px-3 py-1.5 rounded border border-neon-green/30 text-neon-green bg-neon-green/10 hover:bg-neon-green/20 font-mono transition-colors disabled:opacity-50"
            >
              {uploading ? "⏳ Upload…" : "⬆ Importer"}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            <button onClick={onClose} className="text-gray-500 hover:text-white text-lg px-1">✕</button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-600 font-mono text-xs">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-600 font-mono text-xs gap-3">
              <span>{search ? "Aucun résultat" : "Aucune image importée"}</span>
              {!search && (
                <button onClick={() => fileRef.current?.click()} className="text-neon-green text-xs underline">
                  Importer votre première image
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {filtered.map(f => (
                <div
                  key={f.name}
                  onClick={() => setSelected(selected === f.name ? null : f.name)}
                  className={`group relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                    selected === f.name ? "border-neon-green shadow-lg shadow-neon-green/20" : "border-gray-800 hover:border-gray-600"
                  }`}
                >
                  {isImage(f.name) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={f.url} alt={f.name} className="w-full aspect-square object-contain bg-gray-900 p-1" loading="lazy" />
                  ) : (
                    <div className="w-full aspect-square bg-gray-900 flex items-center justify-center text-2xl">📄</div>
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteFile(f.name); }}
                    disabled={deleting === f.name}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600/80 text-white text-xs items-center justify-center hidden group-hover:flex hover:bg-red-500"
                  >✕</button>
                  {/* Selected check */}
                  {selected === f.name && (
                    <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-neon-green text-black text-xs flex items-center justify-center font-bold">✓</div>
                  )}
                  {/* Filename */}
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate leading-tight">{f.name.split("/").pop()}</p>
                    <p className="text-gray-400 text-xs">{fmt(f.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
          <div className="text-xs text-gray-500 font-mono">
            {selected ? (
              <span className="text-neon-green">✓ {files.find(f => f.name === selected)?.name.split("/").pop()} sélectionnée</span>
            ) : (
              "Cliquez sur une image pour la sélectionner"
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs px-4 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white font-mono">
              Annuler
            </button>
            <button
              disabled={!selected}
              onClick={() => { const f = files.find(x => x.name === selected); if (f) { onSelect(f.url); onClose(); } }}
              className="text-xs px-4 py-1.5 rounded border border-neon-green/30 text-neon-green bg-neon-green/10 hover:bg-neon-green/20 font-mono disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Utiliser cette image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
