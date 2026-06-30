"use client";
import { useState, useEffect, useCallback } from "react";
import { RSS_FEEDS, CATEGORY_LABELS, CATEGORY_COLORS, RssFeedCategory } from "@/lib/rssFeeds";
import { useLang } from "@/lib/adminLangContext";

interface Settings {
  enabled: boolean;
  moderation: boolean;
  dailyCount: number;
  channels: string[];
  activeSources: string[];
}

interface WatchItem {
  id: number;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  summary: string;
  aiScore: number;
  aiReason: string | null;
  draftFr: string;
  draftEn: string;
  status: string;
  platforms: string;
  scheduledAt: string | null;
  expiresAt: string;
  createdAt: string;
}

const SCORE_COLOR = (s: number) =>
  s >= 0.8 ? "#00ff9d" : s >= 0.65 ? "#ffaa00" : "#ff0066";

export default function CyberWatchPanel({ canWrite = true }: { canWrite?: boolean } = {}) {
  const __ = useLang();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [items, setItems] = useState<WatchItem[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState<{ fetched: number; candidates?: number; scored?: number; saved: number; skipped?: string } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editDraftFr, setEditDraftFr] = useState("");
  const [editDraftEn, setEditDraftEn] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [scheduleDates, setScheduleDates] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<"settings" | "moderation">("moderation");

  const defaultScheduleDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T08:00`;
  };

  const getScheduleDate = (id: number) => scheduleDates[id] ?? defaultScheduleDate();

  const setScheduleDate = (id: number, val: string) =>
    setScheduleDates(prev => ({ ...prev, [id]: val }));

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    const res = await fetch("/api/admin/cyber-watch/settings");
    if (res.ok) setSettings(await res.json());
    setLoadingSettings(false);
  }, []);

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    const res = await fetch("/api/admin/cyber-watch/items");
    if (res.ok) setItems(await res.json());
    setLoadingItems(false);
  }, []);

  useEffect(() => { loadSettings(); loadItems(); }, [loadSettings, loadItems]);

  const saveSettings = async (patch: Partial<Settings>) => {
    const next = { ...settings!, ...patch };
    setSettings(next);
    await fetch("/api/admin/cyber-watch/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
  };

  const triggerFetch = async () => {
    setFetching(true);
    setFetchResult(null);
    const res = await fetch("/api/admin/cyber-watch/fetch", { method: "POST" });
    if (res.ok) {
      const r = await res.json();
      setFetchResult(r);
      await loadItems();
    }
    setFetching(false);
  };

  const handleAction = async (id: number, action: "approved" | "rejected", patch?: Partial<WatchItem>, scheduledAt?: string) => {
    setSavingId(id);
    await fetch(`/api/admin/cyber-watch/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action, ...(scheduledAt ? { scheduledAt } : {}), ...patch }),
    });
    setItems(prev => prev.filter(i => i.id !== id));
    setScheduleDates(prev => { const n = { ...prev }; delete n[id]; return n; });
    setEditId(null);
    setSavingId(null);
  };

  const handleDelete = async (id: number) => {
    setSavingId(id);
    await fetch(`/api/admin/cyber-watch/items/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
    setSavingId(null);
  };

  const toggleSource = (sourceId: string) => {
    if (!settings) return;
    const current = settings.activeSources;
    const next = current.includes(sourceId)
      ? current.filter(s => s !== sourceId)
      : [...current, sourceId];
    saveSettings({ activeSources: next });
  };

  const toggleChannel = (ch: string) => {
    if (!settings) return;
    const current = settings.channels;
    const next = current.includes(ch) ? current.filter(c => c !== ch) : [...current, ch];
    if (next.length === 0) return;
    saveSettings({ channels: next });
  };

  if (loadingSettings) {
    return <div className="flex items-center justify-center h-64 text-gray-600 font-mono text-xs">{__("Chargement…", "Loading…")}</div>;
  }
  if (!settings) return null;

  const pendingItems = items.filter(i => i.status === "pending");
  const scheduledItems = items.filter(i => i.status === "scheduled");

  const categories = Array.from(new Set(RSS_FEEDS.map(f => f.category))) as RssFeedCategory[];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            📡 {__("Veille cyber automatique", "Automated cyber watch")}
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            {__("Surveillance RSS + rédaction IA · modération avant publication", "RSS monitoring + AI drafting · moderation before publishing")}
          </p>
        </div>

        {/* Master toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-500">{__("Veille", "Watch")}</span>
          {canWrite ? <button
            onClick={() => saveSettings({ enabled: !settings.enabled })}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.enabled ? "bg-neon-green" : "bg-gray-800"}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-black transition-transform ${settings.enabled ? "translate-x-6" : ""}`} />
          </button> : <span className="text-xs font-mono font-bold" style={{ color: settings.enabled ? "#00ff9d" : "#666" }}>{settings.enabled ? "ON" : "OFF"}</span>}
          <span className={`text-xs font-mono font-bold ${settings.enabled ? "text-neon-green" : "text-gray-600"}`}>
            {settings.enabled ? "ON" : "OFF"}
          </span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {([
          { key: "moderation", label: `📋 ${__("Propositions IA", "AI proposals")}${pendingItems.length > 0 ? ` (${pendingItems.length})` : ""}` },
          { key: "settings", label: `⚙️ ${__("Configuration", "Settings")}` },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`text-xs px-4 py-2 border-b-2 transition-all font-mono ${activeTab === t.key ? "border-neon-green text-neon-green" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: MODERATION ══════════════════════════════════════════════════ */}
      {activeTab === "moderation" && (
        <div>
          {/* Fetch button */}
          <div className="flex items-center gap-3 mb-6">
            {canWrite && <button
              onClick={triggerFetch}
              disabled={fetching || !settings.enabled}
              className="text-xs px-4 py-2 rounded border border-neon-green/30 text-neon-green bg-neon-green/10 hover:bg-neon-green/20 font-mono transition-colors disabled:opacity-40"
            >
              {fetching ? `⏳ ${__("Récupération en cours…", "Fetching…")}` : `🔄 ${__("Récupérer maintenant", "Fetch now")}`}
            </button>}
            {fetchResult && (
              <span className="text-xs text-gray-500 font-mono">
                {fetchResult.fetched} {__("récupérés", "fetched")}
                {fetchResult.candidates !== undefined && ` · ${fetchResult.candidates} ${__("nouveaux", "new")}`}
                {fetchResult.scored !== undefined && fetchResult.scored > 0 && ` · ${fetchResult.scored} ${__("scorés", "scored")}`}
                {" · "}
                <span className={fetchResult.saved > 0 ? "text-neon-green" : "text-yellow-500"}>
                  {fetchResult.saved > 0
                    ? `${fetchResult.saved} ${__("nouvelles propositions", "new proposals")}`
                    : fetchResult.skipped === "queue_full"
                      ? __("file d'attente déjà pleine", "queue already full")
                      : fetchResult.skipped === "all_filtered"
                        ? __("tous déjà vus ou trop anciens", "all already seen or too old")
                        : fetchResult.scored === 0
                          ? __("aucun candidat retenu", "no candidate retained")
                          : __("score IA insuffisant", "AI score too low")}
                </span>
              </span>
            )}
            {!settings.enabled && (
              <span className="text-xs text-gray-600 font-mono italic">{__("Activez la veille pour récupérer des articles", "Enable watch to fetch articles")}</span>
            )}
          </div>

          {/* Moderation disabled notice */}
          {!settings.moderation && (
            <div className="mb-4 px-4 py-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 text-yellow-400 text-xs font-mono">
              ⚡ {__("Modération désactivée — l'IA sélectionne et planifie automatiquement", "Moderation disabled — AI selects and schedules automatically")} {settings.dailyCount} post{settings.dailyCount > 1 ? "s" : ""}/{__("jour", "day")}
            </div>
          )}

          {/* Scheduled items summary */}
          {scheduledItems.length > 0 && (
            <div className="mb-4 px-4 py-2 rounded-lg border border-gray-800 bg-gray-900/50 flex items-center gap-2">
              <span className="text-neon-green text-xs font-mono">✓ {scheduledItems.length} post{scheduledItems.length > 1 ? "s" : ""} {__("planifié", "scheduled")}{scheduledItems.length > 1 ? "s" : ""}</span>
              <span className="text-gray-600 text-xs">{__("sur les prochaines 24h", "in the next 24h")}</span>
            </div>
          )}

          {/* Pending items */}
          {loadingItems ? (
            <div className="text-gray-600 text-xs font-mono text-center py-12">{__("Chargement des propositions…", "Loading proposals…")}</div>
          ) : pendingItems.length === 0 ? (
            <div className="text-center py-16 text-gray-600 font-mono text-sm">
              <div className="text-4xl mb-3">📭</div>
              <p>{__("Aucune proposition en attente", "No pending proposals")}</p>
              <p className="text-xs mt-1">{__("Cliquez sur \"Récupérer maintenant\" pour analyser les flux RSS", "Click \"Fetch now\" to analyse RSS feeds")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingItems.map(item => (
                <div key={item.id} className="cyber-card rounded-xl p-5 border border-gray-800">
                  {/* Item header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: `${CATEGORY_COLORS[RSS_FEEDS.find(f => f.id === item.sourceId)?.category as RssFeedCategory] || "#666"}22`, color: CATEGORY_COLORS[RSS_FEEDS.find(f => f.id === item.sourceId)?.category as RssFeedCategory] || "#666", border: `1px solid ${CATEGORY_COLORS[RSS_FEEDS.find(f => f.id === item.sourceId)?.category as RssFeedCategory] || "#666"}44` }}>
                          {item.sourceName}
                        </span>
                        <span className="text-xs font-mono font-bold" style={{ color: SCORE_COLOR(item.aiScore) }}>
                          {__("Score", "Score")} {Math.round(item.aiScore * 100)}%
                        </span>
                        {item.aiReason && (
                          <span className="text-xs text-gray-600 italic truncate max-w-xs">{item.aiReason}</span>
                        )}
                      </div>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-white text-sm font-bold hover:text-neon-green transition-colors line-clamp-2">
                        {item.title} ↗
                      </a>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canWrite && <button
                        onClick={() => handleDelete(item.id)}
                        disabled={savingId === item.id}
                        className="w-7 h-7 rounded text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors flex items-center justify-center text-sm"
                        title={__("Supprimer", "Delete")}
                      >✕</button>}
                    </div>
                  </div>

                  {/* Draft tabs (FR / EN) */}
                  {canWrite && editId === item.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 font-mono uppercase tracking-wider block mb-1">{__("Brouillon FR", "Draft FR")}</label>
                        <textarea
                          value={editDraftFr}
                          onChange={e => setEditDraftFr(e.target.value)}
                          className="cyber-input w-full text-xs p-3 rounded h-32 resize-none text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-mono uppercase tracking-wider block mb-1">{__("Brouillon EN", "Draft EN")}</label>
                        <textarea
                          value={editDraftEn}
                          onChange={e => setEditDraftEn(e.target.value)}
                          className="cyber-input w-full text-xs p-3 rounded h-32 resize-none text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-mono shrink-0">{__("Planifier le :", "Schedule for:")}</span>
                          <input
                            type="datetime-local"
                            value={getScheduleDate(item.id)}
                            onChange={e => setScheduleDate(item.id, e.target.value)}
                            className="cyber-input text-xs px-2 py-1 rounded flex-1 text-white"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(item.id, "approved", { draftFr: editDraftFr, draftEn: editDraftEn, platforms: item.platforms }, getScheduleDate(item.id))}
                            disabled={savingId === item.id}
                            className="flex-1 text-xs py-2 rounded border border-neon-green/30 text-neon-green bg-neon-green/10 hover:bg-neon-green/20 font-mono disabled:opacity-50"
                          >
                            {savingId === item.id ? "…" : `✓ ${__("Valider & planifier", "Approve & schedule")}`}
                          </button>
                          <button onClick={() => setEditId(null)} className="text-xs px-4 py-2 rounded border border-gray-700 text-gray-400 hover:text-white font-mono">
                            {__("Annuler", "Cancel")}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <DraftPreview label="FR" content={item.draftFr} />
                      <DraftPreview label="EN" content={item.draftEn} />
                      {/* Platforms badge */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-gray-600 font-mono">{__("Canaux :", "Channels:")}</span>
                        {item.platforms.split(",").map(p => (
                          <span key={p} className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-400 font-mono">{p.trim()}</span>
                        ))}
                        <span className="text-xs text-gray-600 font-mono ml-auto">
                          {__("Expire le", "Expires")} {new Date(item.expiresAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      {/* Actions */}
                      {canWrite && <div className="space-y-2 pt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-mono shrink-0">{__("Planifier le :", "Schedule for:")}</span>
                          <input
                            type="datetime-local"
                            value={getScheduleDate(item.id)}
                            onChange={e => setScheduleDate(item.id, e.target.value)}
                            className="cyber-input text-xs px-2 py-1 rounded flex-1 text-white"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(item.id, "approved", undefined, getScheduleDate(item.id))}
                            disabled={savingId === item.id}
                            className="flex-1 text-xs py-2 rounded border border-neon-green/30 text-neon-green bg-neon-green/10 hover:bg-neon-green/20 font-mono disabled:opacity-50"
                          >
                            {savingId === item.id ? "…" : `✓ ${__("Valider & planifier", "Approve & schedule")}`}
                          </button>
                          <button
                            onClick={() => { setEditId(item.id); setEditDraftFr(item.draftFr); setEditDraftEn(item.draftEn); }}
                            className="text-xs px-4 py-2 rounded border border-gray-700 text-gray-400 hover:text-white font-mono"
                          >
                            ✎ {__("Modifier", "Edit")}
                          </button>
                          <button
                            onClick={() => handleAction(item.id, "rejected")}
                            disabled={savingId === item.id}
                            className="text-xs px-4 py-2 rounded border border-red-800/50 text-red-500 hover:bg-red-500/10 font-mono disabled:opacity-50"
                          >
                            {__("Rejeter", "Reject")}
                          </button>
                        </div>
                      </div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: SETTINGS ════════════════════════════════════════════════════ */}
      {activeTab === "settings" && (
        <div className="space-y-8">

          {/* Moderation & publication */}
          <section>
            <h3 className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-4">{__("Publication", "Publication")}</h3>
            <div className="cyber-card rounded-xl p-5 space-y-5">
              {/* Moderation toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-bold">{__("Modération humaine", "Human moderation")}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {__("Activée : les propositions attendent votre validation avant publication.", "Enabled: proposals wait for your approval before publishing.")}<br />
                    {__("Désactivée : l'IA choisit et planifie automatiquement.", "Disabled: AI selects and schedules automatically.")}
                  </p>
                </div>
                {canWrite ? <button
                  onClick={() => saveSettings({ moderation: !settings.moderation })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${settings.moderation ? "bg-neon-green" : "bg-yellow-500"}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-black transition-transform ${settings.moderation ? "translate-x-6" : ""}`} />
                </button> : <span className="text-xs text-gray-600 font-mono">{settings.moderation ? "ON" : "OFF"}</span>}
              </div>

              {/* Daily count */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white font-bold">{__("Publications par jour", "Posts per day")}</p>
                  <span className="text-neon-green font-mono text-sm font-bold">{settings.dailyCount}</span>
                </div>
                <input
                  type="range" min={1} max={5} value={settings.dailyCount}
                  disabled={!canWrite}
                  onChange={e => canWrite && saveSettings({ dailyCount: Number(e.target.value) })}
                  className="w-full accent-[#00ff9d]"
                />
                <div className="flex justify-between text-xs text-gray-600 font-mono mt-1">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                </div>
              </div>

              {/* Channels */}
              <div>
                <p className="text-sm text-white font-bold mb-2">{__("Canaux de publication", "Publishing channels")}</p>
                <div className="flex gap-2">
                  {["linkedin", "twitter"].map(ch => (
                    <button
                      key={ch}
                      onClick={() => canWrite && toggleChannel(ch)}
                      disabled={!canWrite}
                      className={`text-xs px-4 py-2 rounded border font-mono transition-colors capitalize ${settings.channels.includes(ch) ? "border-neon-green/40 text-neon-green bg-neon-green/10" : "border-gray-700 text-gray-500 hover:text-gray-300"}`}
                    >
                      {ch === "linkedin" ? "💼 LinkedIn" : "𝕏 Twitter/X"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* RSS sources */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider font-mono">{__("Sources RSS", "RSS Sources")}</h3>
              <div className="flex gap-2">
                {canWrite && <button onClick={() => saveSettings({ activeSources: RSS_FEEDS.map(f => f.id) })} className="text-xs text-neon-green/70 hover:text-neon-green font-mono">{__("Tout activer", "Enable all")}</button>}
                {canWrite && <span className="text-gray-700">·</span>}
                {canWrite && <button onClick={() => saveSettings({ activeSources: [] })} className="text-xs text-gray-600 hover:text-gray-400 font-mono">{__("Tout désactiver", "Disable all")}</button>}
              </div>
            </div>
            <div className="space-y-5">
              {categories.map(cat => (
                <div key={cat}>
                  <p className="text-xs font-mono font-bold mb-2 uppercase tracking-wider" style={{ color: CATEGORY_COLORS[cat] }}>
                    {CATEGORY_LABELS[cat]}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {RSS_FEEDS.filter(f => f.category === cat).map(feed => {
                      const active = settings.activeSources.includes(feed.id);
                      return (
                        <button
                          key={feed.id}
                          onClick={() => canWrite && toggleSource(feed.id)}
                          disabled={!canWrite}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${active ? "border-gray-700 bg-gray-900/50" : "border-gray-800/50 opacity-40"}`}
                        >
                          <div className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-neon-green" : "bg-gray-700"}`} />
                          <div className="min-w-0">
                            <p className="text-xs text-white font-bold truncate">{feed.name}</p>
                            <p className="text-xs text-gray-500 truncate">{feed.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function DraftPreview({ label, content }: { label: string; content: string }) {
  const [open, setOpen] = useState(false);
  const preview = content.slice(0, 120) + (content.length > 120 ? "…" : "");
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/40 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-800/30 transition-colors"
      >
        <span className="text-xs font-mono text-gray-400 font-bold">{label}</span>
        <span className="text-xs text-gray-600 font-mono">{open ? "▲" : "▼"}</span>
      </button>
      <div className={`px-3 pb-3 text-xs text-gray-300 leading-relaxed ${open ? "" : "hidden"}`}>
        {open ? content : preview}
      </div>
      {!open && <p className="px-3 pb-2 text-xs text-gray-500">{preview}</p>}
    </div>
  );
}
