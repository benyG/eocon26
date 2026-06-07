"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mfaRequired && userId) {
      const res = await fetch("/api/admin/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: mfaCode }),
      });
      if (res.ok) {
        router.push("/admin");
      } else {
        setError("Code incorrect ou expiré");
        setLoading(false);
      }
      return;
    }

    const body = email ? { email, password } : { password };
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.mfaRequired) {
        setMfaRequired(true);
        setUserId(data.userId);
        setLoading(false);
      } else {
        router.push("/admin");
      }
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Identifiants incorrects");
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
          {!mfaRequired ? (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  Email <span className="text-gray-600 text-xs">(optionnel — super-admin uniquement par mot de passe)</span>
                </label>
                <input
                  type="email"
                  autoFocus
                  className="cyber-input w-full px-3 py-2 rounded text-sm"
                  placeholder="admin@eocon.local"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                  Mot de passe *
                </label>
                <input
                  type="password"
                  required
                  className="cyber-input w-full px-3 py-2 rounded text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs text-gray-400 font-mono mb-3">🔐 Authentification à deux facteurs requise</p>
              <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                Code TOTP (6 chiffres)
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                required
                className="cyber-input w-full px-3 py-2 rounded text-sm tracking-widest text-center"
                placeholder="000000"
                value={mfaCode}
                onChange={e => setMfaCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          )}
          {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
          <button type="submit" disabled={loading} className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50">
            {loading ? "..." : mfaRequired ? "Vérifier le code" : "Connexion"}
          </button>
          {mfaRequired && (
            <button type="button" onClick={() => { setMfaRequired(false); setUserId(null); setMfaCode(""); }} className="w-full text-xs text-gray-600 hover:text-gray-400 font-mono mt-2">
              ← Retour
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
