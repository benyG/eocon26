"use client";
import { useState, useEffect, useRef } from "react";
import { Translations } from "@/lib/i18n";
import CountrySelect from "@/components/CountrySelect";
import { useEventSettings } from "@/lib/useEventSettings";
import { evaluateCfpWindow } from "@/lib/cfpWindow";

interface TicketTypeData {
  id: number;
  slug: string;
  nameFr: string;
  nameEn: string;
  priceFr: number;
  priceEn: number;
  perksFr: string[];
  perksEn: string[];
  activePriceFr: number;
  activePriceEn: number;
  earlyBirdActive: boolean;
  earlyBirdUntil: string | null;
  color: string;
  isFeatured: boolean;
  includesSessions: boolean;
  includesWorkshops: boolean;
  includesCTF: boolean;
  maxCapacity: number;
  sold: number;
  available: number;
}

interface RegisterModalProps {
  t: Translations;
  onClose: () => void;
  lang?: "fr" | "en";
}

export default function RegisterModal({ t, onClose, lang = "fr" }: RegisterModalProps) {
  const settings = useEventSettings();
  const regWin = evaluateCfpWindow(settings.registration_open_date, settings.registration_close_date);
  const registrationClosed = regWin.hasWindow && !regWin.open;
  const [step, setStep] = useState<"tiers" | "form" | "payment">("tiers");
  const [selectedTier, setSelectedTier] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<TicketTypeData | null>(null);
  const [formData, setFormData] = useState({ fname: "", lname: "", email: "", org: "", country: "", lang_expression: "fr", linkedin: "", whatsapp: "", ctfCompetitorName: "", ctfTeamName: "" });
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ticketTypes, setTicketTypes] = useState<TicketTypeData[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Payment step state
  const [registrationId, setRegistrationId] = useState<number | null>(null);
  const [paymentToken, setPaymentToken] = useState("");
  const [amount, setAmount] = useState(0);
  const [operator, setOperator] = useState<"mtn" | "orange">("mtn");
  // Currency / payment mode — strictly geo-driven (XAF→Mobile Money, USD→Stripe).
  // A QA selector may allow manual override when PAYMENT_ALLOW_CURRENCY_SELECTOR is set.
  const [currency, setCurrency] = useState<"XAF" | "USD">("XAF");
  const [allowSelector, setAllowSelector] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [payState, setPayState] = useState<"idle" | "processing" | "awaiting" | "failed">("idle");
  const [payError, setPayError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pay = t.register.payment;
  const reasonMsg = (reason?: string) =>
    reason === "insufficient_funds" ? pay.err_insufficient
      : reason === "unavailable" ? pay.err_unavailable
      : pay.err_failed;

  useEffect(() => {
    fetch("/api/ticket-types")
      .then(r => r.json())
      .then(data => { setTicketTypes(data); setLoadingTypes(false); })
      .catch(() => setLoadingTypes(false));
  }, []);

  // Resolve the visitor's currency from geo (Cloudflare). XAF = Cameroon (Mobile
  // Money), USD = everyone else (Stripe). The selector is only shown for QA.
  useEffect(() => {
    fetch("/api/geo")
      .then(r => r.json())
      .then((d: { currency?: string; allowSelector?: boolean }) => {
        setCurrency(d.currency === "USD" ? "USD" : "XAF");
        setAllowSelector(!!d.allowSelector);
      })
      .catch(() => {});
  }, []);

  // Cleanup any in-flight polling on unmount.
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // No ticket is visible → sales aren't open yet. Skip tier selection and take the
  // visitor straight to the pre-registration form; they'll be notified on launch.
  const preRegMode = !loadingTypes && ticketTypes.length === 0;
  useEffect(() => {
    if (preRegMode && step === "tiers") {
      setSelectedTier("pre_registration");
      setStep("form");
    }
  }, [preRegMode, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ticketType: selectedTier,
          ctfCompetitorName: formData.ctfCompetitorName || undefined,
          ctfTeamName: formData.ctfTeamName || undefined,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      if (data.preRegistered) {
        // No tickets on sale → registered interest, will be notified later.
        setSuccessMsg(pay.pre_registered);
        setSubmitted(true);
      } else if (data.isFree) {
        // Free ticket → already confirmed server-side.
        setSuccessMsg(pay.free_confirmed);
        setSubmitted(true);
      } else {
        setRegistrationId(data.id);
        setPaymentToken(data.paymentToken || "");
        // Prefer the selected ticket's active price (already loaded client-side),
        // fall back to the amount computed server-side.
        setAmount(selectedTicket?.activePriceFr ?? data.amount ?? 0);
        setStep("payment");
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (regId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const r = await fetch(`/api/payment/netticket/status?registrationId=${regId}&token=${encodeURIComponent(paymentToken)}`);
        const d = await r.json();
        if (d.state === "successful") {
          if (pollRef.current) clearInterval(pollRef.current);
          setSuccessMsg(pay.success);
          setSubmitted(true);
        }
      } catch { /* keep polling */ }
      // Give up after ~4 minutes; user can retry.
      if (attempts >= 60 && pollRef.current) {
        clearInterval(pollRef.current);
        setPayState("failed");
        setPayError(pay.failed);
      }
    }, 4000);
  };

  const handlePay = async () => {
    if (!registrationId || !payPhone.trim()) return;
    setPayState("processing");
    setPayError("");
    try {
      const res = await fetch("/api/payment/netticket/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, operator, phone: payPhone, token: paymentToken }),
      });
      const data = await res.json();
      if (!res.ok || data.state === "failed") {
        setPayState("failed");
        setPayError(reasonMsg(data.reason));
        return;
      }
      if (data.state === "successful") {
        setSuccessMsg(pay.success);
        setSubmitted(true);
        return;
      }
      // Pending → wait for the user to confirm on their phone, then poll.
      setPayState("awaiting");
      startPolling(registrationId);
    } catch {
      setPayState("failed");
      setPayError(pay.failed);
    }
  };

  // Redirect to Stripe Checkout (USD / card). No card data touches our app.
  const handleStripe = async () => {
    if (!registrationId) return;
    setRedirecting(true);
    setPayError("");
    try {
      const res = await fetch("/api/payment/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, token: paymentToken }),
      });
      const data = await res.json();
      if (data.alreadyPaid) { setSuccessMsg(pay.success); setSubmitted(true); return; }
      if (!res.ok || !data.url) { setRedirecting(false); setPayError(pay.card_unavailable); return; }
      window.location.href = data.url;
    } catch {
      setRedirecting(false);
      setPayError(pay.card_unavailable);
    }
  };

  const fmtMoney = (v: number) =>
    currency === "XAF" ? `${v.toLocaleString("fr-FR")} XAF` : `$${v.toLocaleString("en-US")}`;

  const formatPrice = (ticket: TicketTypeData) => {
    const price = currency === "XAF" ? ticket.activePriceFr : ticket.activePriceEn;
    if (price === 0) return lang === "fr" ? "Gratuit" : "Free";
    return fmtMoney(price);
  };

  // Display amount in the active currency (XAF from priceFr, USD from priceEn).
  const displayAmount = currency === "XAF"
    ? (selectedTicket?.activePriceFr ?? amount)
    : (selectedTicket?.activePriceEn ?? 0);

  const getName = (t: TicketTypeData) => lang === "fr" ? t.nameFr : t.nameEn;
  const getPerks = (t: TicketTypeData) => lang === "fr" ? t.perksFr : t.perksEn;

  return (
    <div className="modal-backdrop">
      <div
        className={`w-full ${step === "tiers" ? "max-w-6xl" : "max-w-3xl"} max-h-[90vh] overflow-y-auto rounded-2xl`}
        style={{ background: "#0a0a0f", border: "1px solid rgba(0,255,157,0.2)" }}
      >
        {/* EOCON glitch brand */}
        <div className="pt-6 pb-2 text-center">
          <span className="glitch neon-text text-4xl font-black" data-text="EOCON" style={{ fontFamily: "'Share Tech Mono', monospace" }}>EOCON</span>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-6 border-b border-neon-green/10">
          <div>
            <h2 className="text-2xl font-black text-white">{t.register.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{t.register.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-neon-green transition-colors text-2xl leading-none">×</button>
        </div>

        <div className="p-6">
          {registrationClosed && !submitted ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-6">🔒</div>
              <p className="text-yellow-300 font-bold text-lg mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {lang === "fr" ? "Inscriptions closes" : "Registrations closed"}
              </p>
              <p className="text-gray-400 text-sm max-w-xs mx-auto mb-2 leading-relaxed">
                {lang === "fr"
                  ? "Les inscriptions ne sont pas disponibles pour le moment. Revenez bientôt !"
                  : "Registrations are not available right now. Check back soon!"}
              </p>
              <button onClick={onClose} className="btn-neon px-6 py-2 rounded text-sm mt-6">
                {lang === "fr" ? "Fermer" : "Close"}
              </button>
            </div>
          ) : submitted ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-6">🎉</div>
              <p className="text-neon-green font-mono text-lg mb-4" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                {successMsg || t.register.form.success}
              </p>
              <button onClick={onClose} className="btn-neon px-6 py-2 rounded text-sm mt-4">
                Close
              </button>
            </div>
          ) : step === "tiers" ? (
            <div>
              {loadingTypes ? (
                <div className="text-center py-12 text-gray-500 font-mono text-sm">Chargement des billets…</div>
              ) : ticketTypes.length === 0 ? (
                /* No tickets on sale → the pre-registration effect switches to the form. */
                <div className="text-center py-12 text-gray-500 font-mono text-sm">…</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {ticketTypes.map(ticket => {
                    const c = ticket.color;
                    const sold_out = ticket.available <= 0;
                    return (
                      <div
                        key={ticket.id}
                        onClick={() => { if (!sold_out) { setSelectedTier(ticket.slug); setSelectedTicket(ticket); setStep("form"); } }}
                        className="rounded-xl p-5 border transition-all"
                        style={{
                          borderColor: c + (sold_out ? "22" : "40"),
                          background: ticket.isFeatured ? c + "10" : "rgba(255,255,255,0.02)",
                          boxShadow: ticket.isFeatured ? `0 0 30px ${c}20` : undefined,
                          cursor: sold_out ? "not-allowed" : "pointer",
                          opacity: sold_out ? 0.5 : 1,
                        }}
                      >
                        {ticket.isFeatured && !sold_out && (
                          <div className="text-xs font-mono text-center mb-2 font-bold" style={{ color: c, fontFamily: "'Share Tech Mono', monospace" }}>
                            ★ RECOMMANDÉ
                          </div>
                        )}
                        {sold_out && (
                          <div className="text-xs font-mono text-center mb-2 font-bold text-red-400">COMPLET</div>
                        )}
                        <h3 className="font-bold text-white text-lg mb-1">{getName(ticket)}</h3>
                        <div className="mb-1" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                          <span className="text-2xl font-black" style={{ color: c }}>{formatPrice(ticket)}</span>
                          {ticket.earlyBirdActive && (
                            <div className="text-xs text-yellow-400 mt-0.5">
                              ⚡ Early Bird — offre limitée
                            </div>
                          )}
                        </div>
                        {/* Access type badges */}
                        <div className="grid grid-cols-4 gap-1 mt-3">
                          {([
                            { key: "sessions", label: lang === "fr" ? "Talks" : "Talks", icon: "🎤", included: ticket.includesSessions, color: "#00ff9d" },
                            { key: "workshops", label: "Workshop", icon: "🛠", included: ticket.includesWorkshops, color: "#ff9500" },
                            { key: "ctf", label: "CTF", icon: "🏆", included: ticket.includesCTF, color: "#00ccff" },
                            { key: "cocktail", label: "Cocktail", icon: "🍸", included: getPerks(ticket).some(p => /cocktail/i.test(p)), color: "#ff2d78" },
                          ] as const).map(({ key, label, icon, included, color }) => (
                            <div
                              key={key}
                              className="flex flex-col items-center justify-center rounded-lg py-1.5 px-0.5 gap-0.5"
                              style={{
                                background: included ? color + "18" : "#ffffff04",
                                border: `1px solid ${included ? color + "55" : "#ffffff0a"}`,
                              }}
                            >
                              <span className="text-sm leading-none">{icon}</span>
                              <span
                                className="text-[8px] font-bold uppercase leading-tight text-center"
                                style={{ color: included ? color : "#2a2a2a", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0px" }}
                              >
                                {label}
                              </span>
                              <span className="text-[9px] font-bold leading-none" style={{ color: included ? color : "#2a2a2a" }}>
                                {included ? "✓" : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                        <ul className="space-y-1 mt-3">
                          {getPerks(ticket).map(p => (
                            <li key={p} className="flex items-start gap-2 text-xs text-gray-400">
                              <span style={{ color: c }}>✓</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                        {!sold_out && (
                          <div
                            className="mt-4 w-full py-2 rounded text-xs font-mono text-center font-bold uppercase"
                            style={{ background: c + "20", color: c, fontFamily: "'Share Tech Mono', monospace" }}
                          >
                            {t.register.cta} →
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : step === "form" ? (
            <div>
              {!preRegMode && (
                <button
                  onClick={() => setStep("tiers")}
                  className="text-gray-500 hover:text-neon-green text-sm mb-6 flex items-center gap-1 font-mono transition-colors"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  ← Back
                </button>
              )}
              <h3 className="text-white font-bold text-xl mb-6">{preRegMode ? t.register.prereg_title : t.register.form.title}</h3>
              {preRegMode && (
                <div className="mb-6 p-4 rounded-lg border" style={{ borderColor: "#ffaa0040", background: "#ffaa0008" }}>
                  <p className="text-sm text-yellow-400/90 leading-relaxed">⏳ {t.register.prereg_notice}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.fname} *</label>
                    <input required className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.register.form.fname}
                      value={formData.fname} onChange={e => setFormData({ ...formData, fname: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.lname} *</label>
                    <input required className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.register.form.lname}
                      value={formData.lname} onChange={e => setFormData({ ...formData, lname: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.email} *</label>
                  <input required type="email" className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.register.form.email}
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.org}</label>
                    <input className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder={t.register.form.org}
                      value={formData.org} onChange={e => setFormData({ ...formData, org: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.country}</label>
                    <CountrySelect
                      value={formData.country}
                      onChange={v => setFormData({ ...formData, country: v })}
                      className="w-full"
                      placeholder={t.register.form.country}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{t.register.form.lang_expression}</label>
                  <select className="cyber-input w-full px-3 py-2 rounded text-sm bg-transparent" value={formData.lang_expression} onChange={e => setFormData({ ...formData, lang_expression: e.target.value })}>
                    <option value="fr" className="bg-dark-800">Français</option>
                    <option value="en" className="bg-dark-800">English</option>
                  </select>
                </div>
                {/* Optional networking fields */}
                <div className="p-4 rounded border border-dashed" style={{ borderColor: "#00ccff33", background: "#00ccff05" }}>
                  <p className="text-xs font-mono text-gray-500 mb-3" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                    🔗 Profil réseau — <span className="text-gray-600">optionnel</span>
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    {lang === "fr"
                      ? "Ces informations génèrent un QR code de networking sur votre badge d'entrée, permettant aux autres participants de vous contacter facilement."
                      : "This generates a networking QR code on your entry badge so other attendees can connect with you easily."}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>LinkedIn (URL ou username)</label>
                      <input className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder="https://linkedin.com/in/votre-profil"
                        value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>WhatsApp (avec indicatif pays)</label>
                      <input className="cyber-input w-full px-3 py-2 rounded text-sm" placeholder="+237 6XX XXX XXX"
                        value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* CTF fields — shown when ticket includes CTF */}
                {selectedTicket?.includesCTF && (
                  <div
                    className="p-4 rounded border space-y-3"
                    style={{ borderColor: "#00ccff40", background: "#00ccff05", transition: "all 0.3s", opacity: 1 }}
                  >
                    <p className="text-xs font-mono text-cyan-400 mb-1" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      ⚡ Participation CTF — <span className="text-gray-500">requis</span>
                    </p>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>Pseudo CTF *</label>
                      <input
                        required
                        className="cyber-input w-full px-3 py-2 rounded text-sm"
                        placeholder="h4ck3r_name"
                        value={formData.ctfCompetitorName}
                        onChange={e => setFormData({ ...formData, ctfCompetitorName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        Nom d&apos;équipe <span className="text-gray-600">(optionnel — max 2 joueurs par équipe)</span>
                      </label>
                      <input
                        className="cyber-input w-full px-3 py-2 rounded text-sm"
                        placeholder="Team 404"
                        maxLength={30}
                        value={formData.ctfTeamName}
                        onChange={e => setFormData({ ...formData, ctfTeamName: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {!preRegMode && (
                  <div className="p-3 rounded border" style={{ background: (selectedTicket?.color || "#00ff9d") + "08", borderColor: (selectedTicket?.color || "#00ff9d") + "22" }}>
                    <p className="text-xs text-gray-500 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                      Billet sélectionné : <span style={{ color: selectedTicket?.color || "#00ff9d", fontWeight: "bold" }}>
                        {selectedTicket ? `${getName(selectedTicket)} — ${formatPrice(selectedTicket)}` : selectedTier}
                      </span>
                    </p>
                  </div>
                )}
                {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
                <button type="submit" disabled={loading} className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50">
                  {loading ? "..." : preRegMode ? t.register.prereg_submit : t.register.form.submit}
                </button>
              </form>
            </div>
          ) : (
            /* ── Payment step ── */
            <div>
              <button
                onClick={() => { setStep("form"); setPayState("idle"); setPayError(""); }}
                className="text-gray-500 hover:text-neon-green text-sm mb-6 flex items-center gap-1 font-mono transition-colors"
                style={{ fontFamily: "'Share Tech Mono', monospace" }}
              >
                ← Back
              </button>
              <h3 className="text-white font-bold text-xl mb-1">{pay.title}</h3>
              <p className="text-gray-500 text-sm mb-6">{pay.subtitle}</p>

              {/* QA-only currency selector (PAYMENT_ALLOW_CURRENCY_SELECTOR) */}
              {allowSelector && (
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-2 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{pay.currency_label}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setCurrency("XAF")}
                      className="py-2.5 rounded-lg border text-sm font-bold transition-all"
                      style={currency === "XAF"
                        ? { borderColor: "#00ff9d", background: "#00ff9d15", color: "#00ff9d" }
                        : { borderColor: "#ffffff15", color: "#888" }}
                    >
                      🇨🇲 XAF · Mobile Money
                    </button>
                    <button
                      onClick={() => setCurrency("USD")}
                      className="py-2.5 rounded-lg border text-sm font-bold transition-all"
                      style={currency === "USD"
                        ? { borderColor: "#00ccff", background: "#00ccff15", color: "#00ccff" }
                        : { borderColor: "#ffffff15", color: "#888" }}
                    >
                      🌍 USD · Card
                    </button>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="p-4 rounded-lg border mb-6 flex items-center justify-between" style={{ background: "#00ff9d08", borderColor: "#00ff9d33" }}>
                <span className="text-xs text-gray-400 font-mono uppercase" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{pay.amount}</span>
                <span className="text-2xl font-black" style={{ color: "#00ff9d", fontFamily: "'Share Tech Mono', monospace" }}>
                  {fmtMoney(displayAmount)}
                </span>
              </div>

              {currency === "XAF" ? (
                <div className="space-y-4">
                  {/* Operator */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-2 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{pay.operator}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setOperator("mtn")}
                        className="py-3 rounded-lg border text-sm font-bold transition-all"
                        style={operator === "mtn"
                          ? { borderColor: "#ffcc00", background: "#ffcc0015", color: "#ffcc00" }
                          : { borderColor: "#ffffff15", color: "#888" }}
                      >
                        MTN MoMo
                      </button>
                      <button
                        onClick={() => setOperator("orange")}
                        className="py-3 rounded-lg border text-sm font-bold transition-all"
                        style={operator === "orange"
                          ? { borderColor: "#ff7900", background: "#ff790015", color: "#ff7900" }
                          : { borderColor: "#ffffff15", color: "#888" }}
                      >
                        Orange Money
                      </button>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-mono" style={{ fontFamily: "'Share Tech Mono', monospace" }}>{pay.phone} *</label>
                    <div className="flex items-stretch gap-2">
                      <span
                        className="flex items-center px-3 rounded text-sm font-mono shrink-0"
                        style={{ background: "#00ff9d12", border: "1px solid rgba(0,255,157,0.2)", color: "#00ff9d", fontFamily: "'Share Tech Mono', monospace" }}
                      >
                        {pay.phone_prefix}
                      </span>
                      <input
                        className="cyber-input flex-1 px-3 py-2 rounded text-sm"
                        placeholder={pay.phone_ph}
                        inputMode="numeric"
                        value={payPhone}
                        onChange={e => {
                          setPayPhone(e.target.value);
                          // Editing the number re-enables a greyed-out Pay button after a failure.
                          if (payState === "failed") { setPayState("idle"); setPayError(""); }
                        }}
                        disabled={payState === "processing" || payState === "awaiting"}
                      />
                    </div>
                  </div>

                  {payState === "awaiting" && (
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "#ffaa0010", border: "1px solid #ffaa0033" }}>
                      <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#ffaa00" }} />
                      <span className="text-xs text-yellow-400 font-mono">{pay.awaiting}</span>
                    </div>
                  )}
                  {payState === "failed" && (
                    <p className="text-red-400 text-xs font-mono">{payError || pay.failed}</p>
                  )}

                  <p className="text-xs text-gray-500 leading-relaxed">{pay.pay_notice}</p>

                  <button
                    onClick={handlePay}
                    disabled={!payPhone.trim() || payState === "processing" || payState === "awaiting" || payState === "failed"}
                    className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {payState === "processing" ? pay.processing
                      : payState === "awaiting" ? pay.awaiting
                      : `${pay.pay} — ${fmtMoney(displayAmount)}`}
                  </button>
                </div>
              ) : (
                /* Card — Stripe Checkout (hosted; no card data stored by us) */
                <div className="space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed">{pay.card_notice}</p>
                  {payError && <p className="text-red-400 text-xs font-mono">{payError}</p>}
                  <button
                    onClick={handleStripe}
                    disabled={redirecting || displayAmount <= 0}
                    className="w-full btn-neon-solid py-3 rounded text-sm border-2 border-neon-green disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {redirecting ? pay.redirecting : `💳 ${pay.pay_card} — ${fmtMoney(displayAmount)}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="px-6 py-3 border-t border-neon-green/10 text-center">
          <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
            {pay.powered_by}
          </span>
        </div>
      </div>
    </div>
  );
}
