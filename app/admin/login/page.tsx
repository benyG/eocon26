"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Mot de passe incorrect");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 cyber-grid-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-neon-green font-mono mb-2" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            &gt; EOCON_ADMIN
          </div>
          <p className="text-gray-600 text-sm font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            Accès restreint
          </p>
        </div>
        <form onSubmit={handleSubmit} className="cyber-card rounded-xl p-8 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
              Mot de passe admin
            </label>
            <input
              type="password"
              required
              autoFocus
              className="cyber-input w-full px-3 py-2 rounded text-sm"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50"
          >
            {loading ? "..." : "Connexion"}
          </button>
        </form>
      </div>
    </div>
  );
}
