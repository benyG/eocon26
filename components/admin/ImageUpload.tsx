"use client";
import { useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}

export default function ImageUpload({ value, onChange, folder = "uploads", label = "Photo" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onChange(url);
    } catch {
      setError("Erreur d'upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-500 uppercase tracking-wider" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
        {label}
      </label>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://... ou uploader ci-dessous"
          className="cyber-input flex-1 px-3 py-2 rounded text-sm"
        />
        {value && (
          <img src={value} alt="preview" className="w-10 h-10 rounded-full object-cover border border-neon-green/30 shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs px-3 py-1.5 border border-neon-green/30 rounded text-neon-green/70 hover:text-neon-green hover:border-neon-green/60 transition-all disabled:opacity-50"
          style={{ fontFamily: "'Share Tech Mono', monospace" }}
        >
          {uploading ? "Upload en cours..." : "⬆ Uploader vers GCS"}
        </button>
        {error && <span className="text-red-400 text-xs">{error}</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}
