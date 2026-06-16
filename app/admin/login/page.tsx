"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "credentials" | "mfa" | "legacy";

export default function AdminLogin() {
  const router = useRouter();

  // Which form is active
  const [step, setStep] = useState<Step>("credentials");

  // Credentials step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // MFA step
  const [mfaPendingToken, setMfaPendingToken] = useState("");
  const [totp, setTotp] = useState("");
  const [enrollQr, setEnrollQr] = useState(""); // set when forced enrollment is required

  // Legacy (super-admin password) step
  const [legacyPassword, setLegacyPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Step 1 : email + password ─────────────────────────────────────────────
  const handleCredentials = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Identifiants incorrects");
        return;
      }
      if (data.mfaRequired) {
        setMfaPendingToken(data.mfaPendingToken);
        // MFA forced globally but not yet enrolled → fetch a QR to enroll now.
        if (data.mfaEnrollmentRequired) {
          const er = await fetch("/api/admin/auth/mfa/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mfaPendingToken: data.mfaPendingToken }),
          });
          const ed = await er.json();
          if (er.ok) setEnrollQr(ed.qrDataUrl);
        }
        setStep("mfa");
        return;
      }
      router.push("/admin");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 : TOTP ─────────────────────────────────────────────────────────
  const handleMfa = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mfaPendingToken, totp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Code incorrect");
        return;
      }
      router.push("/admin");
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  // ── Legacy super-admin password ───────────────────────────────────────────
  const handleLegacy = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: legacyPassword }),
      });
      if (res.ok) {
        router.push("/admin");
      } else {
        setError("Mot de passe incorrect");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 cyber-grid-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="text-3xl font-black text-neon-green font-mono mb-2"
            style={{ fontFamily: "'Share Tech Mono', monospace", textShadow: "0 0 20px #00ff9d66" }}
          >
            &gt; EOCON_ADMIN
          </div>
          <p className="text-gray-600 text-xs font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            Accès restreint — identifiez-vous
          </p>
        </div>

        {/* ── Form card ── */}
        <div className="cyber-card rounded-xl p-8 space-y-5">

          {/* ── Credentials ── */}
          {step === "credentials" && (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  className="cyber-input w-full px-3 py-2 rounded text-sm"
                  placeholder="vous@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono uppercase tracking-wider">
                  Mot de passe
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
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
                className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50 font-mono"
              >
                {loading ? "Vérification…" : "Connexion →"}
              </button>
            </form>
          )}

          {/* ── MFA ── */}
          {step === "mfa" && (
            <form onSubmit={handleMfa} className="space-y-4">
              <div className="text-center pb-1">
                <div className="text-neon-green text-2xl mb-2">🔐</div>
                <p className="text-white text-sm font-bold">{enrollQr ? "Configurer la double authentification" : "Vérification en deux étapes"}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {enrollQr
                    ? "Le MFA est obligatoire. Scannez ce QR code avec votre application (Google Authenticator, Authy…) puis entrez le code généré."
                    : "Entrez le code à 6 chiffres affiché dans votre application d'authentification."}
                </p>
              </div>
              {enrollQr && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={enrollQr} alt="QR MFA" width={180} height={180} className="rounded bg-white p-2" />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono uppercase tracking-wider">
                  Code TOTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  className="cyber-input w-full px-3 py-2 rounded text-sm text-center tracking-[0.4em] text-lg"
                  placeholder="000000"
                  value={totp}
                  onChange={e => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
              {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
              <button
                type="submit"
                disabled={loading || totp.length < 6}
                className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50 font-mono"
              >
                {loading ? "Vérification…" : "Vérifier le code →"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("credentials"); setError(""); setTotp(""); setEnrollQr(""); }}
                className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors font-mono"
              >
                ← Retour
              </button>
            </form>
          )}

          {/* ── Legacy super-admin ── */}
          {step === "legacy" && (
            <form onSubmit={handleLegacy} className="space-y-4">
              <div className="text-center pb-1">
                <p className="text-gray-400 text-xs font-mono">Connexion super-admin (mot de passe système)</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono uppercase tracking-wider">
                  Mot de passe admin
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  className="cyber-input w-full px-3 py-2 rounded text-sm"
                  placeholder="••••••••"
                  value={legacyPassword}
                  onChange={e => setLegacyPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50 font-mono"
              >
                {loading ? "Vérification…" : "Connexion →"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("credentials"); setError(""); }}
                className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors font-mono"
              >
                ← Connexion avec compte utilisateur
              </button>
            </form>
          )}
        </div>

        {/* Toggle entre les deux modes */}
        {step !== "mfa" && (
          <div className="text-center mt-4">
            {step === "credentials" ? (
              <button
                onClick={() => { setStep("legacy"); setError(""); }}
                className="text-xs text-gray-700 hover:text-gray-500 transition-colors font-mono underline"
              >
                Connexion super-admin →
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
