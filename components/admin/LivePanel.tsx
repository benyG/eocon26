"use client";

import { useState, useEffect, useCallback } from "react";
import React from "react";
import StreamingGuide from "./StreamingGuide";
import { useLang } from "@/lib/adminLangContext";

interface Stream {
  id: string;
  title: string;
  url: string;
  active: boolean;
}

interface LiveSettings {
  streams: Stream[];
}

interface Question {
  id: number;
  body: string;
  displayName: string | null;
  approved: boolean;
  answered: boolean;
  upvotes: number;
  adminNote: string | null;
  askedAt: string;
}

interface Workshop {
  id: string;
  title: string;
  titleEn: string;
  room: string;
  active: boolean;
  description?: string;
  descriptionEn?: string;
}

interface JaasConfig {
  appId: string;
  apiKey: string;
  privateKey: string;
}

interface Participant {
  id: number;
  name: string;
  ticketType: string;
  lastSeenAt: string | null;
  ipAddress: string | null;
}

interface LiveStats {
  onlineCount: number;
  totalConnected: number;
  participants: Participant[];
  questions: { pending: number; approved: number; answered: number; total: number };
}

interface Announcement {
  message: string;
  enabled: boolean;
  expiresAt: string | null;
}

interface RestreamChannel {
  id: number;
  displayName: string;
  type: string;
  isActive: boolean;
  isLive: boolean;
  viewerCount: number;
  embedUrl: string | null;
}

interface RestreamStatus {
  configured: boolean;
  error?: string;
  channels?: RestreamChannel[];
  streamKey?: string;
  rtmpUrl?: string;
  anyLive?: boolean;
  youtubeEmbedUrl?: string | null;
}

interface Session {
  id: number;
  title: string;
  time: string | null;
  date: string | null;
  type: string | null;
  speakerName: string | null;
  liveUrl: string | null;
}

const EMPTY: LiveSettings = { streams: [] };
const EMPTY_WORKSHOP: Workshop = { id: "", title: "", titleEn: "", room: "", active: true, description: "", descriptionEn: "" };

const PLATFORM_ICON: Record<string, string> = {
  youtube: "▶️", facebook: "📘", twitch: "💜", linkedin: "🔵",
  twitter: "🐦", kick: "🟢", tiktok: "🎵", instagram: "📸",
};

const GUEST_LINK_SERVICES = [
  { value: "restream", label: "Restream Studio", placeholder: "https://studio.restream.io/guest/…", icon: "🔴" },
  { value: "zoom",     label: "Zoom",            placeholder: "https://zoom.us/j/XXXXXXXXXX?pwd=…", icon: "🎥" },
  { value: "teams",    label: "Microsoft Teams",  placeholder: "https://teams.microsoft.com/l/meetup-join/…", icon: "💼" },
  { value: "meet",     label: "Google Meet",      placeholder: "https://meet.google.com/xxx-yyyy-zzz", icon: "📹" },
] as const;

function guestLinkIcon(url: string): string {
  if (!url) return "🔗";
  if (url.includes("restream.io")) return "🔴";
  if (url.includes("zoom.us"))     return "🎥";
  if (url.includes("teams.microsoft.com")) return "💼";
  if (url.includes("meet.google.com"))     return "📹";
  return "🔗";
}

const INPUT_STYLE = {
  width: "100%", background: "var(--card)", border: "1px solid #00ff9d20",
  borderRadius: 6, color: "var(--txt)", padding: "8px 12px", fontSize: 13,
  fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, outline: "none",
};

const SAVE_BTN_STYLE = (disabled: boolean) => ({
  background: "var(--ac)", color: "var(--panel)", padding: "8px 20px", borderRadius: 6,
  fontSize: 12, fontWeight: 900, cursor: disabled ? "not-allowed" as const : "pointer" as const,
  letterSpacing: 1, border: "none", opacity: disabled ? 0.6 : 1,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ArchBox({ color, icon, title, children }: { color: string; icon: string; title: string; children?: any }) {
  return (
    <div style={{ background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 10, padding: "16px 20px", marginBottom: 20 }}>
      <div style={{ fontSize: 10, color, letterSpacing: 3, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span>{icon}</span> {title}
      </div>
      <div style={{ fontSize: 12, color: "var(--txt-2)", lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function StepHeader({ n, label, color = "#00ff9d" }: { n: number; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, marginTop: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${color}20`, border: `1px solid ${color}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color, fontFamily: "'Courier New', monospace", flexShrink: 0 }}>
        {n}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", letterSpacing: 1 }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: `${color}15` }} />
    </div>
  );
}

interface TeamMember { id: number; name: string; role: string; email: string | null; }
interface AcceptedSpeaker { id: number; name: string; title: string | null; talkTitle: string | null; cfpSubmission: { email: string } | null; }

interface RestreamCaption { id: number; text: string; secondaryText?: string; active: boolean; }
interface RestreamTicker  { id: number; text: string; active: boolean; }
interface Overlays { captions: RestreamCaption[]; tickers: RestreamTicker[]; }
interface StreamingTeamConfig {
  sessionTitle: string; sessionTime: string; sessionId?: number; studioLink: string;
  moderator: { name: string; email: string; lang: "fr" | "en" } | null;
  speakers: { name: string; email: string; lang: "fr" | "en" }[];
  techContact: string;
}
const EMPTY_TEAM: StreamingTeamConfig = { sessionTitle: "", sessionTime: "", studioLink: "", moderator: null, speakers: [], techContact: "" };

interface StreamingRoom {
  id: string;
  name: string;
  type: "conference" | "workshop";
  guestLink: string;
  jaasRoom: string;
  sortOrder: number;
}

interface NewRoom {
  name: string;
  type: "conference" | "workshop";
  guestLink: string;
  service: string;
}

interface PanelisteExtra {
  name: string;
  email: string;
  lang: "fr" | "en";
}

interface SessionPlanning {
  id?: number;
  sessionId: number;
  roomId: string | null;
  lienWebinaire: string;
  lienLive: string;
  restreamEventId: string | null;
  technicienIds: number[];
  moderateurIds: number[];
  panelistesExtra: PanelisteExtra[];
  notifiedAt?: string | null;
}

interface AllSession {
  id: number;
  title: string;
  time: string | null;
  date: string | null;
  type: string | null;
  speakerName: string | null;
  liveUrl: string | null;
}

export default function LivePanel({ canWrite }: { canWrite: boolean }) {
  const __ = useLang();
  const [mode, setMode] = useState<"live" | "planning" | "config">("live");
  const [qaFilter, setQaFilter] = useState<"pending" | "approved" | "answered">("pending");
  const [showGuide, setShowGuide] = useState(false);

  // ── Streams ───────────────────────────────────────────────────────────────
  const [settings, setSettings]   = useState<LiveSettings>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);

  // ── Sessions today ────────────────────────────────────────────────────────
  const [sessions, setSessions]   = useState<Session[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  // ── Q&A ───────────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qaLoading, setQaLoading] = useState(false);

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const [stats, setStats]           = useState<LiveStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement>({ message: "", enabled: false, expiresAt: null });
  const [annSaving, setAnnSaving]   = useState(false);
  const [annSaved, setAnnSaved]     = useState(false);

  // ── Restream ──────────────────────────────────────────────────────────────
  const [restreamStatus, setRestreamStatus]   = useState<RestreamStatus | null>(null);
  const [restreamLoading, setRestreamLoading] = useState(false);
  const [restreamConnecting, setRestreamConnecting] = useState(false);
  const [restreamDisconnecting, setRestreamDisconnecting] = useState(false);
  const [showRtmpKey, setShowRtmpKey]         = useState(false);
  const [rtmpCopied, setRtmpCopied]           = useState(false);
  const [keyCopied, setKeyCopied]             = useState(false);

  // ── Streaming team ────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers]       = useState<TeamMember[]>([]);
  const [acceptedSpeakers, setAcceptedSpeakers] = useState<AcceptedSpeaker[]>([]);
  const [streamingTeam, setStreamingTeam]   = useState<StreamingTeamConfig>(EMPTY_TEAM);
  const [teamSaving, setTeamSaving]         = useState(false);
  const [teamSaved, setTeamSaved]           = useState(false);
  const [inviteSending, setInviteSending]   = useState<Record<string, boolean>>({});
  const [inviteSent, setInviteSent]         = useState<Record<string, boolean>>({});

  // ── Overlays (captions & tickers) ────────────────────────────────────────
  // ── Moderator token ───────────────────────────────────────────────────────
  const [modTokenLoading, setModTokenLoading] = useState(false);
  const [modTokenUrl, setModTokenUrl]     = useState<string | null>(null);
  const [modTokenCopied, setModTokenCopied] = useState(false);

  // ── Overlays (captions & tickers) ────────────────────────────────────────
  const [overlays, setOverlays]           = useState<Overlays>({ captions: [], tickers: [] });
  const [overlaysLoading, setOverlaysLoading] = useState(false);
  const [overlaysBulking, setOverlaysBulking] = useState(false);
  const [overlaysBulkResult, setOverlaysBulkResult] = useState<string | null>(null);
  const [overlayPerSpeaker, setOverlayPerSpeaker] = useState<Record<number, boolean>>({});
  const [selectedOverlaySpeakerId, setSelectedOverlaySpeakerId] = useState<number | null>(null);

  // ── Workshops & JaaS ──────────────────────────────────────────────────────
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [wsLoading, setWsLoading] = useState(false);
  const [wsSaving, setWsSaving]   = useState(false);
  const [wsSaved, setWsSaved]     = useState(false);
  const [editWs, setEditWs]       = useState<Workshop | null>(null);
  const [jaas, setJaas]           = useState<JaasConfig>({ appId: "", apiKey: "", privateKey: "" });
  const [jaasSaving, setJaasSaving] = useState(false);
  const [jaasSaved, setJaasSaved] = useState(false);

  // ── Planification session ─────────────────────────────────────────────────
  const [allSessions, setAllSessions]         = useState<AllSession[]>([]);
  const [rooms, setRooms]                     = useState<StreamingRoom[]>([]);
  const [selectedPlanSession, setSelectedPlanSession] = useState<AllSession | null>(null);
  const [planning, setPlanning]               = useState<SessionPlanning>({ sessionId: 0, roomId: null, lienWebinaire: "", lienLive: "", restreamEventId: null, technicienIds: [], moderateurIds: [], panelistesExtra: [] });
  const [planningSaving, setPlanningSaving]   = useState(false);
  const [planningSaved, setPlanningSaved]     = useState(false);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [notifying, setNotifying]             = useState(false);
  const [notifyResult, setNotifyResult]       = useState<string | null>(null);
  const [creatingLiveUrl, setCreatingLiveUrl] = useState(false);

  // ── Rooms config ──────────────────────────────────────────────────────────
  const [roomsLoading, setRoomsLoading]       = useState(false);
  const [newRoom, setNewRoom]                 = useState<NewRoom>({ name: "", type: "conference", guestLink: "", service: "restream" });
  const [roomSaving, setRoomSaving]           = useState(false);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, sessionsRes] = await Promise.all([
        fetch("/api/admin/live/settings"),
        fetch("/api/admin/sessions"),
      ]);
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (sessionsRes.ok) {
        const all: Session[] = await sessionsRes.json();
        setSessions(all.filter(s => s.date === today));
      }
    } finally { setLoading(false); }
  }, [today]);

  const loadRestreamStatus = useCallback(async () => {
    setRestreamLoading(true);
    try {
      const res = await fetch("/api/admin/live/restream/status");
      const data = await res.json().catch(() => null);
      if (data) setRestreamStatus(data);
    } finally { setRestreamLoading(false); }
  }, []);

  const connectRestream = async () => {
    setRestreamConnecting(true);
    try {
      const res = await fetch("/api/admin/live/restream/connect");
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? __("Erreur lors de la connexion à Restream", "Error connecting to Restream"));
    } finally { setRestreamConnecting(false); }
  };

  const disconnectRestream = async () => {
    setRestreamDisconnecting(true);
    try {
      await fetch("/api/admin/live/restream/connect", { method: "DELETE" });
      setRestreamStatus(null);
      loadRestreamStatus();
    } finally { setRestreamDisconnecting(false); }
  };

  const loadStreamingTeam = useCallback(async () => {
    try {
      const [teamRes, speakersRes, stRes] = await Promise.all([
        fetch("/api/admin/team"),
        fetch("/api/admin/speakers"),
        fetch("/api/admin/live/streaming-team"),
      ]);
      if (teamRes.ok) setTeamMembers(await teamRes.json());
      if (speakersRes.ok) {
        const all = await speakersRes.json() as AcceptedSpeaker[];
        setAcceptedSpeakers(all);
      }
      if (stRes.ok) {
        const data = await stRes.json();
        if (data) setStreamingTeam(data);
      }
    } catch { /* non-blocking */ }
  }, []);

  const loadOverlays = useCallback(async () => {
    setOverlaysLoading(true);
    try {
      const res = await fetch("/api/admin/live/restream/overlays");
      const data = await res.json().catch(() => null);
      if (data && !data.error) setOverlays(data);
    } finally { setOverlaysLoading(false); }
  }, []);

  const overlayAction = async (action: string, params: Record<string, unknown> = {}) => {
    const res = await fetch("/api/admin/live/restream/overlays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
    return res.json().catch(() => null);
  };

  const saveStreamingTeam = async () => {
    setTeamSaving(true); setTeamSaved(false);
    try {
      const res = await fetch("/api/admin/live/streaming-team", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(streamingTeam),
      });
      if (res.ok) { setTeamSaved(true); setTimeout(() => setTeamSaved(false), 2000); }
    } finally { setTeamSaving(false); }
  };

  const sendInvite = async (key: string, type: "speaker" | "moderator", to: string, name: string, lang: "fr" | "en") => {
    if (!to) return;
    setInviteSending((s: Record<string, boolean>) => ({ ...s, [key]: true }));
    try {
      const res = await fetch("/api/admin/live/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, to, name, lang,
          sessionTitle: streamingTeam.sessionTitle || "Session EOCON 2026",
          sessionTime: streamingTeam.sessionTime || "",
          studioLink: streamingTeam.studioLink || "https://studio.restream.io",
        }),
      });
      if (res.ok) { setInviteSent((s: Record<string, boolean>) => ({ ...s, [key]: true })); setTimeout(() => setInviteSent((s: Record<string, boolean>) => ({ ...s, [key]: false })), 5000); }
    } finally { setInviteSending((s: Record<string, boolean>) => ({ ...s, [key]: false })); }
  };


  const copyRtmp = async () => {
    const url = restreamStatus?.rtmpUrl ?? "";
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => {});
    setRtmpCopied(true);
    setTimeout(() => setRtmpCopied(false), 2000);
  };

  const copyStreamKey = async () => {
    const key = restreamStatus?.streamKey ?? "";
    if (!key) return;
    await navigator.clipboard.writeText(key).catch(() => {});
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const loadQuestions = useCallback(async () => {
    setQaLoading(true);
    try {
      const res = await fetch("/api/admin/live/questions");
      if (res.ok) setQuestions(await res.json());
    } finally { setQaLoading(false); }
  }, []);

  const loadWorkshops = useCallback(async () => {
    setWsLoading(true);
    try {
      const [wsRes, jaasRes] = await Promise.all([
        fetch("/api/admin/live/workshops"),
        fetch("/api/admin/live/jaas"),
      ]);
      if (wsRes.ok)   setWorkshops(await wsRes.json());
      if (jaasRes.ok) setJaas(await jaasRes.json());
    } finally { setWsLoading(false); }
  }, []);

  const loadAllSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sessions");
      if (res.ok) setAllSessions(await res.json());
    } catch { /* non-blocking */ }
  }, []);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const res = await fetch("/api/admin/live/rooms");
      if (res.ok) setRooms(await res.json());
    } finally { setRoomsLoading(false); }
  }, []);

  const loadPlanningForSession = useCallback(async (sessionId: number) => {
    setPlanningLoading(true);
    setNotifyResult(null);
    try {
      const res = await fetch("/api/admin/live/planning");
      if (res.ok) {
        const all: SessionPlanning[] = await res.json();
        const found = all.find(p => p.sessionId === sessionId);
        if (found) {
          setPlanning(found);
        } else {
          setPlanning({ sessionId, roomId: null, lienWebinaire: "", lienLive: "", restreamEventId: null, technicienIds: [], moderateurIds: [], panelistesExtra: [] });
        }
      }
    } finally { setPlanningLoading(false); }
  }, []);

  const loadDashboard = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [statsRes, annRes] = await Promise.all([
        fetch("/api/admin/live/stats"),
        fetch("/api/admin/live/announcement"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (annRes.ok)   setAnnouncement(await annRes.json());
    } finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadDashboard(); loadQuestions(); loadRestreamStatus(); }, [loadDashboard, loadQuestions, loadRestreamStatus]);
  useEffect(() => { if (mode === "config") { loadOverlays(); loadRooms(); loadWorkshops(); } }, [mode, loadOverlays, loadRooms, loadWorkshops]);
  useEffect(() => { if (mode === "planning") { loadAllSessions(); loadRooms(); loadStreamingTeam(); } }, [mode, loadAllSessions, loadRooms, loadStreamingTeam]);

  useEffect(() => {
    if (mode !== "live") return;
    const t = setInterval(() => { loadDashboard(); loadRestreamStatus(); }, 60000);
    return () => clearInterval(t);
  }, [mode, loadDashboard, loadRestreamStatus]);

  // ── Persist helpers ───────────────────────────────────────────────────────
  const saveStreams = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch("/api/admin/live/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally { setSaving(false); }
  };

  const updateStream = (id: string, patch: Partial<Stream>) =>
    setSettings((s: LiveSettings) => ({ ...s, streams: s.streams.map((st: Stream) => st.id === id ? { ...st, ...patch } : st) }));
  const addStream    = () => setSettings((s: LiveSettings) => ({ ...s, streams: [...s.streams, { id: Date.now().toString(), title: "", url: "", active: false }] }));
  const removeStream = (id: string) => setSettings((s: LiveSettings) => ({ ...s, streams: s.streams.filter((st: Stream) => st.id !== id) }));

  const saveAnnouncement = async () => {
    setAnnSaving(true); setAnnSaved(false);
    try {
      const res = await fetch("/api/admin/live/announcement", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(announcement),
      });
      if (res.ok) { setAnnSaved(true); setTimeout(() => setAnnSaved(false), 2000); }
    } finally { setAnnSaving(false); }
  };

  const saveWorkshops = async (list: Workshop[]) => {
    setWsSaving(true); setWsSaved(false);
    try {
      const res = await fetch("/api/admin/live/workshops", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(list),
      });
      if (res.ok) { setWorkshops(list); setWsSaved(true); setTimeout(() => setWsSaved(false), 2000); }
    } finally { setWsSaving(false); }
  };

  const saveJaas = async () => {
    setJaasSaving(true); setJaasSaved(false);
    try {
      const res = await fetch("/api/admin/live/jaas", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(jaas),
      });
      if (res.ok) { setJaasSaved(true); setTimeout(() => setJaasSaved(false), 2000); }
    } finally { setJaasSaving(false); }
  };

  const savePlanning = async () => {
    setPlanningSaving(true); setPlanningSaved(false);
    try {
      const method = planning.id ? "PATCH" : "POST";
      const url = planning.id ? `/api/admin/live/planning/${planning.id}` : "/api/admin/live/planning";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(planning),
      });
      if (res.ok) {
        const saved = await res.json();
        setPlanning((p: SessionPlanning) => ({ ...p, id: saved.id ?? p.id }));
        setPlanningSaved(true);
        setTimeout(() => setPlanningSaved(false), 2000);
      }
    } finally { setPlanningSaving(false); }
  };

  const notifyTeam = async () => {
    if (!planning.id) return;
    setNotifying(true); setNotifyResult(null);
    try {
      const res = await fetch(`/api/admin/live/planning/${planning.id}/notify`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok) setNotifyResult(data?.message ?? __("Notifications envoyées ✓", "Notifications sent ✓"));
      else setNotifyResult(`❌ ${data?.error ?? "Erreur"}`);
    } finally { setNotifying(false); }
  };

  const [fetchLiveUrlResult, setFetchLiveUrlResult] = useState<string | null>(null);
  const [fetchingLiveUrl, setFetchingLiveUrl] = useState(false);

  const fetchLiveUrl = async () => {
    setFetchingLiveUrl(true); setFetchLiveUrlResult(null);
    try {
      const res = await fetch("/api/admin/live/restream/fetch-live-url");
      const data = await res.json().catch(() => null);
      if (data?.liveUrl) {
        setPlanning((p: SessionPlanning) => ({ ...p, lienLive: data.liveUrl }));
        setFetchLiveUrlResult(`✓ ${__("URL récupérée", "URL fetched")} (${data.source === "channel_live" ? __("live en cours", "live in progress") : __("événement Restream", "Restream event")})`);
      } else {
        setFetchLiveUrlResult(`— ${data?.message ?? __("Aucun live actif détecté", "No active live detected")}`);
      }
    } finally { setFetchingLiveUrl(false); }
  };

  const createRestreamLiveUrl = async () => {
    if (!selectedPlanSession) return;
    setCreatingLiveUrl(true); setFetchLiveUrlResult(null);
    try {
      const res = await fetch("/api/admin/live/restream/create-event", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: selectedPlanSession.title, privacy: "unlisted" }),
      });
      const data = await res.json().catch(() => null);
      if (data?.liveUrl) {
        setPlanning((p: SessionPlanning) => ({ ...p, lienLive: data.liveUrl }));
        setFetchLiveUrlResult(`✓ ${__("Événement créé", "Event created")}${data.eventIdentifier ? ` — ID: ${data.eventIdentifier}` : ""}`);
      } else {
        setFetchLiveUrlResult(`⚠ ${data?.error ?? __("L'événement a été créé mais l'ID YouTube n'est pas encore disponible", "Event created but YouTube ID not yet available")}`);
      }
    } finally { setCreatingLiveUrl(false); }
  };

  const addRoom = async () => {
    if (!newRoom.name) return;
    setRoomSaving(true);
    try {
      const jaasRoom = newRoom.type === "workshop"
        ? `EOCON-${newRoom.name.toUpperCase().replace(/\s+/g, "-")}`
        : "";
      const res = await fetch("/api/admin/live/rooms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newRoom, jaasRoom, sortOrder: rooms.length }),
      });
      if (res.ok) {
        const created = await res.json();
        setRooms((r: StreamingRoom[]) => [...r, created]);
        setNewRoom({ name: "", type: "conference", guestLink: "", service: "restream" });
      }
    } finally { setRoomSaving(false); }
  };

  const deleteRoom = async (id: string) => {
    const res = await fetch(`/api/admin/live/rooms/${id}`, { method: "DELETE" });
    if (res.ok) setRooms((r: StreamingRoom[]) => r.filter((rm: StreamingRoom) => rm.id !== id));
  };

  const addWorkshop        = () => setEditWs({ ...EMPTY_WORKSHOP, id: Date.now().toString() });
  const saveEditedWorkshop = (ws: Workshop) => {
    const next = workshops.some((w: Workshop) => w.id === ws.id) ? workshops.map((w: Workshop) => w.id === ws.id ? ws : w) : [...workshops, ws];
    saveWorkshops(next);
    setEditWs(null);
  };
  const removeWorkshop = (id: string) => saveWorkshops(workshops.filter((w: Workshop) => w.id !== id));

  const patchQuestion = async (id: number, patch: Partial<Question>) => {
    const res = await fetch(`/api/admin/live/questions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    if (res.ok) setQuestions((qs: Question[]) => qs.map((q: Question) => q.id === id ? { ...q, ...patch } : q));
  };
  const deleteQuestion = async (id: number) => {
    const res = await fetch(`/api/admin/live/questions/${id}`, { method: "DELETE" });
    if (res.ok) setQuestions((qs: Question[]) => qs.filter((q: Question) => q.id !== id));
  };

  const filteredQuestions = questions.filter((q: Question) => {
    if (qaFilter === "pending")  return !q.approved && !q.answered;
    if (qaFilter === "approved") return q.approved && !q.answered;
    return q.answered;
  });

  const pendingCount = questions.filter((q: Question) => !q.approved && !q.answered).length;

  // ── Mode toggle ───────────────────────────────────────────────────────────
  const MODE_BTN = (active: boolean, col: string) => ({
    padding: "9px 22px", borderRadius: 8, fontSize: 12, fontWeight: active ? 900 : 400,
    cursor: "pointer" as const, fontFamily: "'Courier New', monospace", letterSpacing: 1,
    background: active ? `${col}18` : "transparent",
    border: `1px solid ${active ? col : "var(--bdr-2)"}`,
    color: active ? col : "var(--txt-mute)",
    transition: "all .15s",
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div style={{ fontSize: 10, color: "var(--ac)", letterSpacing: 3, marginBottom: 4 }}>🔴 EOCON 2026</div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--txt)", margin: "0 0 4px", fontFamily: "'Courier New', monospace" }}>Live Streaming</h1>
        <p style={{ color: "var(--txt-mute)", fontSize: 12 }}>{__("Diffusion YouTube · Ateliers JaaS · Q&A temps réel", "YouTube Broadcast · JaaS Workshops · Real-time Q&A")}</p>
      </div>

      {/* Quick links */}
      <div className="mb-6 flex gap-3 items-center flex-wrap">
        <a href="/live" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--ac)", border: "1px solid var(--ac-bdr)", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ Page /live</a>
        <a href="/live/resend" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--txt-dim)", border: "1px solid var(--bdr-2)", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ /live/resend</a>
        <button onClick={() => setShowGuide(true)} style={{ fontSize: 11, color: "#ffaa00", border: "1px solid #ffaa0040", padding: "6px 14px", borderRadius: 6, cursor: "pointer", background: "transparent", letterSpacing: 1 }}>
          📖 {__("Guide opérateur", "Operator Guide")}
        </button>
        <a href="https://studio.restream.io" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#ff6b6b", border: "1px solid #ff444030", padding: "6px 14px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>→ Restream Studio</a>
      </div>

      {/* Guide modal */}
      {showGuide && <StreamingGuide onClose={() => setShowGuide(false)} />}

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32, alignItems: "center", flexWrap: "wrap" }}>
        <button style={MODE_BTN(mode === "live", "#ff4444")} onClick={() => setMode("live")}>
          🔴 {__("En direct", "Live")}
          {(stats?.onlineCount ?? 0) > 0 && (
            <span style={{ marginLeft: 8, background: "#ff4444", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{stats!.onlineCount}</span>
          )}
          {pendingCount > 0 && (
            <span style={{ marginLeft: 4, background: "#ffaa00", color: "#000", borderRadius: 10, padding: "1px 6px", fontSize: 10 }}>{pendingCount} Q</span>
          )}
        </button>
        <button style={MODE_BTN(mode === "planning", "#00cc88")} onClick={() => setMode("planning")}>
          📅 {__("Planification session", "Session planning")}
        </button>
        <button style={MODE_BTN(mode === "config", "#4488ff")} onClick={() => setMode("config")}>
          ⚙️ {__("Configuration", "Configuration")}
        </button>
      </div>

      {/* ══ MODE EN DIRECT ══════════════════════════════════════════════════ */}
      {mode === "live" && (
        <div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: __("En ligne", "Online"), value: stats?.onlineCount ?? 0, color: "#00ff9d", hint: __("< 3 min", "< 3 min") },
              { label: __("Sessions actives", "Active sessions"), value: stats?.totalConnected ?? 0, color: "#4488ff", hint: __("non expirées", "not expired") },
              { label: __("Q en attente", "Q pending"), value: stats?.questions.pending ?? 0, color: "#ff4444", hint: __("à modérer", "to moderate") },
              { label: __("Q approuvées", "Q approved"), value: stats?.questions.approved ?? 0, color: "#ffaa00", hint: __("affichées", "displayed") },
              { label: __("Q répondues", "Q answered"), value: stats?.questions.answered ?? 0, color: "#00aaff", hint: __("archivées", "archived") },
            ].map(card => (
              <div key={card.label} style={{ background: "var(--card)", border: `1px solid ${card.color}30`, borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: card.color, fontFamily: "'Courier New', monospace" }}>{card.value}</div>
                <div style={{ fontSize: 11, color: "var(--txt-2)", marginTop: 2 }}>{card.label}</div>
                <div style={{ fontSize: 10, color: "var(--txt-mute)" }}>{card.hint}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { loadDashboard(); loadRestreamStatus(); }} disabled={statsLoading} style={{ fontSize: 11, color: "var(--txt-mute)", background: "transparent", border: "1px solid var(--bdr-2)", padding: "5px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 20, fontFamily: "'Courier New', monospace" }}>
            {statsLoading ? "…" : `↺ ${__("Rafraîchir", "Refresh")}`}
          </button>

          {/* Restream live status */}
          {restreamStatus && (
            <div style={{ background: "var(--card)", border: `1px solid ${restreamStatus.anyLive ? "#ff444040" : "var(--bdr)"}`, borderRadius: 10, padding: 20, marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: restreamStatus.anyLive ? "#ff4444" : "var(--txt-mute)", boxShadow: restreamStatus.anyLive ? "0 0 8px #ff4444" : "none" }} />
                  <span style={{ fontSize: 11, color: restreamStatus.anyLive ? "#ff6b6b" : "var(--txt-dim)", fontFamily: "'Courier New', monospace", letterSpacing: 2 }}>
                    RESTREAM {restreamStatus.anyLive ? `— ${__("EN DIRECT", "LIVE")}` : `— ${__("HORS LIGNE", "OFFLINE")}`}
                  </span>
                  {restreamStatus.error && <span style={{ fontSize: 10, color: "#ff6b6b" }}>⚠ {restreamStatus.error}</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {restreamStatus.anyLive && restreamStatus.youtubeEmbedUrl && (
                    <button
                      onClick={() => navigator.clipboard.writeText(restreamStatus.youtubeEmbedUrl!).catch(() => {})}
                      style={{ fontSize: 10, color: "var(--ac)", background: "var(--ac-bg)", border: "1px solid var(--ac-bdr)", padding: "4px 10px", borderRadius: 5, cursor: "pointer", letterSpacing: 1 }}>
                      📋 {__("Copier embed YouTube", "Copy YouTube embed")}
                    </button>
                  )}
                  <button onClick={loadRestreamStatus} disabled={restreamLoading} style={{ fontSize: 10, color: "var(--txt-mute)", background: "transparent", border: "1px solid var(--bdr-2)", padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>
                    {restreamLoading ? "…" : "↺"}
                  </button>
                  <a href="https://studio.restream.io" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--txt-dim)", background: "transparent", border: "1px solid var(--bdr-2)", padding: "4px 10px", borderRadius: 5, textDecoration: "none", letterSpacing: 1 }}>
                    → Studio
                  </a>
                </div>
              </div>

              {!restreamStatus.configured ? (
                <p style={{ fontSize: 12, color: "var(--txt-mute)" }}>{__("Token non configuré — allez dans ⚙️ Configuration pour connecter Restream.", "Token not configured — go to ⚙️ Configuration to connect Restream.")}</p>
              ) : (restreamStatus.channels ?? []).length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--txt-mute)" }}>{__("Aucun canal connecté dans Restream.", "No channel connected in Restream.")}</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {(restreamStatus.channels ?? []).map((ch: RestreamChannel) => (
                    <div key={ch.id} style={{ background: "var(--card2)", border: `1px solid ${ch.isLive ? "#ff444030" : "var(--bdr)"}`, borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>{PLATFORM_ICON[ch.type] ?? "📺"}</span>
                        <span style={{ fontSize: 12, color: "var(--txt)", fontWeight: 600 }}>{ch.displayName}</span>
                        {ch.isLive && <span style={{ fontSize: 9, background: "#ff4444", color: "#fff", borderRadius: 4, padding: "1px 5px", letterSpacing: 1, marginLeft: "auto" }}>LIVE</span>}
                      </div>
                      {ch.isLive && ch.viewerCount > 0 && (
                        <div style={{ fontSize: 11, color: "#ffaa00" }}>👁 {ch.viewerCount.toLocaleString()} {__("spectateurs", "viewers")}</div>
                      )}
                      {!ch.isActive && <div style={{ fontSize: 10, color: "var(--txt-mute)" }}>{__("Inactif", "Inactive")}</div>}
                      {ch.isLive && ch.embedUrl && (
                        <a href={ch.embedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#4488ff", textDecoration: "none", display: "block", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          ↗ Embed
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Announcement */}
          <div style={{ background: "var(--card)", border: "1px solid #ffaa0030", borderRadius: 10, padding: 20, marginBottom: 28 }}>
            <div style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 3, marginBottom: 14 }}>📢 {__("ANNONCE BROADCAST", "BROADCAST ANNOUNCEMENT")}</div>
            <textarea
              value={announcement.message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnnouncement((a: Announcement) => ({ ...a, message: (e.target as HTMLTextAreaElement).value }))}
              disabled={!canWrite} rows={3}
              placeholder={__("Message affiché en banner sur la page /live…", "Message displayed as a banner on the /live page…")}
              style={{ width: "100%", background: "var(--card)", border: "1px solid #ffaa0020", borderRadius: 6, color: "var(--txt)", padding: "10px 12px", fontSize: 13, fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, resize: "none" as const, outline: "none", marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--txt-2)", cursor: "pointer" }}>
                <input type="checkbox" checked={announcement.enabled} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnouncement((a: Announcement) => ({ ...a, enabled: (e.target as HTMLInputElement).checked }))} disabled={!canWrite} style={{ accentColor: "#ffaa00" }} />
                {__("Activer l'annonce", "Enable announcement")}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--txt-dim)" }}>
                <span>{__("Expire le :", "Expires on:")}</span>
                <input
                  type="datetime-local"
                  value={announcement.expiresAt ? announcement.expiresAt.slice(0, 16) : ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnouncement((a: Announcement) => ({ ...a, expiresAt: (e.target as HTMLInputElement).value ? new Date((e.target as HTMLInputElement).value).toISOString() : null }))}
                  disabled={!canWrite}
                  style={{ background: "var(--card)", border: "1px solid var(--bdr-2)", borderRadius: 4, color: "var(--txt-2)", padding: "3px 8px", fontSize: 11, fontFamily: "'Courier New', monospace" }}
                />
                {announcement.expiresAt && <button onClick={() => setAnnouncement((a: Announcement) => ({ ...a, expiresAt: null }))} style={{ background: "transparent", border: "none", color: "var(--txt-mute)", cursor: "pointer", fontSize: 12 }}>✕</button>}
              </div>
              {canWrite && (
                <button onClick={saveAnnouncement} disabled={annSaving} style={{ ...SAVE_BTN_STYLE(annSaving), background: "#ffaa00", marginLeft: "auto" }}>
                  {annSaved ? `✓ ${__("Sauvegardé", "Saved")}` : annSaving ? "…" : __("Sauvegarder", "Save")}
                </button>
              )}
            </div>
            {announcement.enabled && announcement.message && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#ffaa0015", border: "1px solid #ffaa0040", borderRadius: 6, fontSize: 12, color: "#ffaa00" }}>
                {__("Aperçu", "Preview")} : {announcement.message}
              </div>
            )}
          </div>

          {/* Q&A moderation */}
          <div style={{ background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 10, color: "var(--txt)", letterSpacing: 3, marginBottom: 16 }}>💬 {__("MODÉRATION Q&A", "Q&A MODERATION")}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {(["pending","approved","answered"] as const).map(f => (
                <button key={f} onClick={() => setQaFilter(f)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                  background: qaFilter === f ? (f === "pending" ? "#ff440020" : f === "approved" ? "#00ff9d20" : "#0066ff20") : "transparent",
                  border: `1px solid ${qaFilter === f ? (f === "pending" ? "#ff4444" : f === "approved" ? "#00ff9d" : "#0066ff") : "var(--bdr-2)"}`,
                  color: qaFilter === f ? (f === "pending" ? "#ff6b6b" : f === "approved" ? "#00ff9d" : "#4488ff") : "var(--txt-dim)",
                  fontFamily: "'Courier New', monospace",
                }}>
                  {f === "pending" ? `⏳ ${__("En attente", "Pending")}` : f === "approved" ? `✓ ${__("Approuvées", "Approved")}` : `✅ ${__("Répondues", "Answered")}`}
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>({questions.filter((q: Question) => f === "pending" ? (!q.approved && !q.answered) : f === "approved" ? (q.approved && !q.answered) : q.answered).length})</span>
                </button>
              ))}
              <button onClick={loadQuestions} disabled={qaLoading} style={{ fontSize: 11, color: "var(--txt-mute)", background: "transparent", border: "1px solid var(--bdr-2)", padding: "5px 10px", borderRadius: 6, cursor: "pointer", marginLeft: "auto" }}>
                {qaLoading ? "…" : "↺"}
              </button>
            </div>

            {filteredQuestions.length === 0 ? (
              <p style={{ color: "var(--txt-mute)", fontSize: 12, padding: "16px 0" }}>{__("Aucune question dans ce filtre.", "No questions in this filter.")}</p>
            ) : (
              filteredQuestions.map((q: Question) => (
                <div key={q.id} style={{ background: "var(--card2)", border: `1px solid ${q.answered ? "#0066ff30" : q.approved ? "var(--ac-bdr)" : "var(--bdr)"}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: "var(--txt)", fontSize: 13, margin: "0 0 6px", lineHeight: 1.5 }}>{q.body}</p>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {q.displayName && <span style={{ fontSize: 10, color: "var(--txt-dim)" }}>👤 {q.displayName}</span>}
                        <span style={{ fontSize: 10, color: "var(--txt-mute)" }}>🕐 {new Date(q.askedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {q.upvotes > 0 && <span style={{ fontSize: 10, color: "#ffaa00" }}>▲ {q.upvotes}</span>}
                        {q.answered && <span style={{ fontSize: 10, color: "#4488ff" }}>✅ {__("Répondue", "Answered")}</span>}
                        {q.approved && !q.answered && <span style={{ fontSize: 10, color: "var(--ac)" }}>✓ {__("Approuvée", "Approved")}</span>}
                      </div>
                    </div>
                    {canWrite && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {!q.approved && !q.answered && (
                          <button onClick={() => patchQuestion(q.id, { approved: true })} style={{ background: "var(--ac-bg)", border: "1px solid var(--ac-bdr)", color: "var(--ac)", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✓ {__("Approuver", "Approve")}</button>
                        )}
                        {q.approved && !q.answered && (
                          <button onClick={() => patchQuestion(q.id, { answered: true })} style={{ background: "#0066ff20", border: "1px solid #0066ff40", color: "#4488ff", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✅ {__("Répondue", "Answered")}</button>
                        )}
                        {q.approved && (
                          <button onClick={() => patchQuestion(q.id, { approved: false })} style={{ background: "transparent", border: "1px solid var(--bdr)", color: "var(--txt-dim)", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>↩</button>
                        )}
                        <button onClick={() => deleteQuestion(q.id)} style={{ background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer" }}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Participants */}
          {(stats?.participants ?? []).length > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid #00ff9d15", borderRadius: 10, padding: 20, marginTop: 20 }}>
              <div style={{ fontSize: 10, color: "var(--ac)", letterSpacing: 3, marginBottom: 14 }}>{__("PARTICIPANTS RÉCENTS", "RECENT PARTICIPANTS")} ({stats?.participants.length})</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>{[__("Nom","Name"), __("Billet","Ticket"), __("Vu il y a","Last seen"), "IP"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "4px 10px", color: "var(--txt-mute)", fontSize: 10, letterSpacing: 1, borderBottom: "1px solid var(--bdr)" }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {(stats?.participants ?? []).map((p: Participant) => {
                      const seenMs = p.lastSeenAt ? Date.now() - new Date(p.lastSeenAt).getTime() : null;
                      const seenStr = seenMs == null ? "—" : seenMs < 60000 ? "< 1 min" : seenMs < 3600000 ? `${Math.floor(seenMs/60000)} min` : `${Math.floor(seenMs/3600000)} h`;
                      const isOnline = seenMs != null && seenMs < 3*60*1000;
                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--bdr)" }}>
                          <td style={{ padding: "8px 10px", color: isOnline ? "var(--ac)" : "var(--txt)" }}>{isOnline && <span style={{ marginRight: 6, fontSize: 8 }}>●</span>}{p.name}</td>
                          <td style={{ padding: "8px 10px", color: "var(--txt-dim)", fontSize: 11 }}>{p.ticketType}</td>
                          <td style={{ padding: "8px 10px", color: isOnline ? "var(--ac)" : "var(--txt-mute)", fontFamily: "'Courier New', monospace", fontSize: 11 }}>{seenStr}</td>
                          <td style={{ padding: "8px 10px", color: "var(--txt-mute)", fontSize: 10, fontFamily: "'Courier New', monospace" }}>{p.ipAddress ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MODE PLANIFICATION SESSION ══════════════════════════════════════ */}
      {mode === "planning" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "flex-start" }}>

          {/* ── Left: Session list ─────────────────────────────────────────── */}
          <div>
            <div style={{ fontSize: 10, color: "#00cc88", letterSpacing: 3, marginBottom: 12 }}>📋 {__("SESSIONS", "SESSIONS")}</div>
            {allSessions.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--txt-mute)" }}>{__("Aucune session.", "No sessions.")}</p>
            ) : (
              allSessions.map((sess: AllSession) => {
                const isSelected = selectedPlanSession?.id === sess.id;
                const typeColor = sess.type === "keynote" ? "#ffaa00" : sess.type === "workshop" ? "#9b59ff" : sess.type === "talk" ? "#4488ff" : "#888";
                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      setSelectedPlanSession(sess);
                      loadPlanningForSession(sess.id);
                    }}
                    style={{
                      background: isSelected ? "#00cc8812" : "var(--card)",
                      border: `1px solid ${isSelected ? "#00cc8840" : "var(--bdr)"}`,
                      borderRadius: 8, padding: "10px 14px", marginBottom: 8,
                      cursor: "pointer", transition: "all .15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {sess.time && <span style={{ fontSize: 10, color: "var(--txt-dim)", fontFamily: "'Courier New', monospace", flexShrink: 0 }}>{sess.time}</span>}
                      {sess.type && <span style={{ fontSize: 9, color: typeColor, background: `${typeColor}20`, borderRadius: 4, padding: "1px 6px", letterSpacing: 1, textTransform: "uppercase" }}>{sess.type}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--txt)", fontWeight: 600, lineHeight: 1.3, marginBottom: 2 }}>{sess.title}</div>
                    {sess.speakerName && <div style={{ fontSize: 10, color: "var(--txt-mute)" }}>👤 {sess.speakerName}</div>}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Right: Planning form ───────────────────────────────────────── */}
          <div>
            {!selectedPlanSession ? (
              <div style={{ background: "var(--card)", border: "1px solid var(--bdr)", borderRadius: 10, padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
                <p style={{ fontSize: 13, color: "var(--txt-mute)" }}>{__("Sélectionnez une session pour configurer sa planification.", "Select a session to configure its planning.")}</p>
              </div>
            ) : planningLoading ? (
              <p style={{ fontSize: 12, color: "var(--txt-mute)" }}>{__("Chargement…", "Loading…")}</p>
            ) : (
              <div style={{ background: "var(--card)", border: "1px solid #00cc8820", borderRadius: 10, padding: 24 }}>
                <div style={{ fontSize: 10, color: "#00cc88", letterSpacing: 3, marginBottom: 16 }}>📅 {__("PLANIFICATION — ", "PLANNING — ")}{selectedPlanSession.title}</div>

                {/* Read-only session info */}
                <div style={{ background: "var(--card2)", border: "1px solid var(--bdr)", borderRadius: 8, padding: 14, marginBottom: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--txt-mute)", marginBottom: 2 }}>{__("Titre", "Title")}</div>
                      <div style={{ fontSize: 12, color: "var(--txt)", fontWeight: 600 }}>{selectedPlanSession.title}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--txt-mute)", marginBottom: 2 }}>{__("Date / Heure", "Date / Time")}</div>
                      <div style={{ fontSize: 12, color: "var(--txt)", fontFamily: "'Courier New', monospace" }}>
                        {selectedPlanSession.date ?? "—"} {selectedPlanSession.time ?? ""}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--txt-mute)", marginBottom: 2 }}>Speaker</div>
                      <div style={{ fontSize: 12, color: "var(--txt)" }}>{selectedPlanSession.speakerName ?? "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Salle */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: "#00cc88", letterSpacing: 2, display: "block", marginBottom: 6 }}>{__("SALLE", "ROOM")}</label>
                  {rooms.length === 0 ? (
                    <p style={{ fontSize: 11, color: "var(--txt-mute)" }}>{__("Aucune salle configurée. Allez dans ⚙️ Configuration pour en ajouter.", "No rooms configured. Go to ⚙️ Configuration to add some.")}</p>
                  ) : (
                    <select
                      value={planning.roomId ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlanning((p: SessionPlanning) => ({ ...p, roomId: (e.target as HTMLSelectElement).value || null }))}
                      disabled={!canWrite}
                      style={{ ...INPUT_STYLE, cursor: "pointer" }}
                    >
                      <option value="">— {__("Choisir une salle", "Choose a room")} —</option>
                      {rooms
                        .filter((r: StreamingRoom) => selectedPlanSession.type === "workshop" ? r.type === "workshop" : r.type === "conference")
                        .map((r: StreamingRoom) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))
                      }
                    </select>
                  )}
                </div>

                {/* Lien studio (hérité de la salle) */}
                {(() => {
                  const selectedRoom = rooms.find((r: StreamingRoom) => r.id === planning.roomId);
                  const studioLink = selectedRoom?.jaasRoom
                    ? `https://8x8.vc/${selectedRoom.jaasRoom}`
                    : selectedRoom?.guestLink || null;
                  if (!selectedRoom) return null;
                  return (
                    <div style={{ marginBottom: 16, background: "var(--card2)", border: "1px solid #00cc8820", borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ fontSize: 10, color: "#00cc88", letterSpacing: 2, marginBottom: 6 }}>{__("LIEN STUDIO — HÉRITÉ DE LA SALLE", "STUDIO LINK — INHERITED FROM ROOM")}</div>
                      {studioLink ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 16 }}>{selectedRoom.jaasRoom ? "📹" : guestLinkIcon(selectedRoom.guestLink)}</span>
                          <code style={{ flex: 1, fontSize: 11, color: "var(--txt-2)", wordBreak: "break-all" as const }}>{studioLink}</code>
                          <button
                            onClick={() => navigator.clipboard.writeText(studioLink).catch(() => {})}
                            style={{ fontSize: 10, color: "var(--txt-dim)", background: "transparent", border: "1px solid var(--bdr-2)", padding: "4px 10px", borderRadius: 5, cursor: "pointer", flexShrink: 0 }}>
                            📋
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: "var(--txt-mute)" }}>
                          {__("Aucun lien studio configuré sur cette salle. Éditez la salle dans ⚙️ Configuration.", "No studio link configured for this room. Edit the room in ⚙️ Configuration.")}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Lien live */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: "#00cc88", letterSpacing: 2, display: "block", marginBottom: 6 }}>🔴 {__("LIEN LIVE", "LIVE LINK")} <span style={{ color: "var(--txt-mute)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({__("embed affiché aux participants sur /live", "embed shown to participants on /live")})</span></label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={planning.lienLive}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanning((p: SessionPlanning) => ({ ...p, lienLive: (e.target as HTMLInputElement).value }))}
                      disabled={!canWrite}
                      placeholder="https://www.youtube.com/embed/VIDEO_ID?autoplay=1"
                      style={{ ...INPUT_STYLE, flex: 1 }}
                    />
                    {canWrite && (
                      <>
                        <button
                          onClick={fetchLiveUrl}
                          disabled={fetchingLiveUrl}
                          title={__("Récupérer l'URL du live en cours (canal Restream ou événement récent)", "Fetch the URL of the ongoing live (Restream channel or recent event)")}
                          style={{ background: "#00cc8815", border: "1px solid #00cc8840", color: fetchingLiveUrl ? "var(--txt-mute)" : "#00cc88", padding: "6px 12px", borderRadius: 6, cursor: fetchingLiveUrl ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" as const }}>
                          {fetchingLiveUrl ? "…" : `↗ ${__("Récupérer", "Fetch")}`}
                        </button>
                        <button
                          onClick={createRestreamLiveUrl}
                          disabled={creatingLiveUrl || !selectedPlanSession}
                          title={__("Créer un événement Restream (non listé) et récupérer l'URL live", "Create an unlisted Restream event and get the live URL")}
                          style={{ background: "#ff444415", border: "1px solid #ff444440", color: creatingLiveUrl ? "var(--txt-mute)" : "#ff6b6b", padding: "6px 12px", borderRadius: 6, cursor: (creatingLiveUrl || !selectedPlanSession) ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" as const }}>
                          {creatingLiveUrl ? "…" : `+ ${__("Créer", "Create")}`}
                        </button>
                      </>
                    )}
                  </div>
                  {fetchLiveUrlResult && (
                    <div style={{ fontSize: 11, color: fetchLiveUrlResult.startsWith("✓") ? "var(--ac)" : "var(--txt-mute)", marginTop: 6 }}>
                      {fetchLiveUrlResult}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "var(--txt-mute)", marginTop: 4 }}>
                    {__("↗ Récupérer", "↗ Fetch")} = {__("détecte le live en cours", "detects the ongoing live")} · {__("+ Créer", "+ Create")} = {__("crée un événement Restream (non listé)", "creates an unlisted Restream event")}
                  </div>
                </div>

                {/* Modérateurs */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: "#00cc88", letterSpacing: 2, display: "block", marginBottom: 6 }}>{__("MODÉRATEUR(S)", "MODERATOR(S)")}</label>
                  {teamMembers.length === 0 ? (
                    <p style={{ fontSize: 11, color: "var(--txt-mute)" }}>
                      {__("Aucun membre d'équipe configuré.", "No team members configured.")}
                      {" "}<span style={{ color: "var(--ac)" }}>{__("→ Ajoutez-en dans l'onglet 👥 Équipe.", "→ Add them in the 👥 Team tab.")}</span>
                    </p>
                  ) : (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {teamMembers.map((m: TeamMember) => {
                        const selected = planning.moderateurIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => canWrite && setPlanning((p: SessionPlanning) => ({
                              ...p,
                              moderateurIds: selected
                                ? p.moderateurIds.filter((id: number) => id !== m.id)
                                : [...p.moderateurIds, m.id],
                            }))}
                            style={{
                              padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: canWrite ? "pointer" : "default",
                              background: selected ? "#00cc8820" : "transparent",
                              border: `1px solid ${selected ? "#00cc8860" : "var(--bdr-2)"}`,
                              color: selected ? "#00cc88" : "var(--txt-dim)",
                            }}>
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Techniciens */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: "#00cc88", letterSpacing: 2, display: "block", marginBottom: 6 }}>{__("TECHNICIEN(S)", "TECHNICIAN(S)")}</label>
                  {teamMembers.length === 0 ? (
                    <p style={{ fontSize: 11, color: "var(--txt-mute)" }}>
                      {__("Aucun membre d'équipe configuré.", "No team members configured.")}
                      {" "}<span style={{ color: "var(--ac)" }}>{__("→ Ajoutez-en dans l'onglet 👥 Équipe.", "→ Add them in the 👥 Team tab.")}</span>
                    </p>
                  ) : (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {teamMembers.map((m: TeamMember) => {
                        const selected = planning.technicienIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => canWrite && setPlanning((p: SessionPlanning) => ({
                              ...p,
                              technicienIds: selected
                                ? p.technicienIds.filter((id: number) => id !== m.id)
                                : [...p.technicienIds, m.id],
                            }))}
                            style={{
                              padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: canWrite ? "pointer" : "default",
                              background: selected ? "#4488ff20" : "transparent",
                              border: `1px solid ${selected ? "#4488ff60" : "var(--bdr-2)"}`,
                              color: selected ? "#4488ff" : "var(--txt-dim)",
                            }}>
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Panelistes supplémentaires */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: 10, color: "#00cc88", letterSpacing: 2 }}>{__("PANÉLISTES SUPPLÉMENTAIRES", "EXTRA PANELISTS")}</label>
                    {canWrite && (
                      <button
                        onClick={() => setPlanning((p: SessionPlanning) => ({ ...p, panelistesExtra: [...p.panelistesExtra, { name: "", email: "", lang: "fr" }] }))}
                        style={{ fontSize: 10, color: "#00cc88", background: "transparent", border: "1px solid #00cc8830", padding: "3px 10px", borderRadius: 4, cursor: "pointer" }}>
                        + {__("Ajouter", "Add")}
                      </button>
                    )}
                  </div>
                  {planning.panelistesExtra.length === 0 && (
                    <p style={{ fontSize: 11, color: "var(--txt-mute)" }}>{__("Aucun panéliste supplémentaire.", "No extra panelists.")}</p>
                  )}
                  {planning.panelistesExtra.map((pan: PanelisteExtra, idx: number) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 60px auto", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
                      <input
                        value={pan.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanning((p: SessionPlanning) => { const arr = [...p.panelistesExtra]; arr[idx] = { ...arr[idx], name: (e.target as HTMLInputElement).value }; return { ...p, panelistesExtra: arr }; })}
                        placeholder={__("Nom", "Name")}
                        disabled={!canWrite}
                        style={{ ...INPUT_STYLE, padding: "6px 10px" }}
                      />
                      <input
                        value={pan.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlanning((p: SessionPlanning) => { const arr = [...p.panelistesExtra]; arr[idx] = { ...arr[idx], email: (e.target as HTMLInputElement).value }; return { ...p, panelistesExtra: arr }; })}
                        placeholder="email@…"
                        disabled={!canWrite}
                        style={{ ...INPUT_STYLE, padding: "6px 10px" }}
                      />
                      <select
                        value={pan.lang}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlanning((p: SessionPlanning) => { const arr = [...p.panelistesExtra]; arr[idx] = { ...arr[idx], lang: (e.target as HTMLSelectElement).value as "fr" | "en" }; return { ...p, panelistesExtra: arr }; })}
                        disabled={!canWrite}
                        style={{ ...INPUT_STYLE, cursor: "pointer", padding: "6px 8px" }}>
                        <option value="fr">FR</option>
                        <option value="en">EN</option>
                      </select>
                      {canWrite && (
                        <button onClick={() => setPlanning((p: SessionPlanning) => ({ ...p, panelistesExtra: p.panelistesExtra.filter((_: unknown, i: number) => i !== idx) }))} style={{ background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", padding: "6px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Save + Notify */}
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  {canWrite && (
                    <button onClick={savePlanning} disabled={planningSaving} style={SAVE_BTN_STYLE(planningSaving)}>
                      {planningSaved ? `✓ ${__("Sauvegardé", "Saved")}` : planningSaving ? __("Sauvegarde…", "Saving…") : __("Sauvegarder", "Save")}
                    </button>
                  )}
                  {canWrite && planning.id && (
                    <button
                      onClick={notifyTeam}
                      disabled={notifying}
                      style={{ background: "#ffaa0015", border: "1px solid #ffaa0040", color: "#ffaa00", padding: "8px 18px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: notifying ? "not-allowed" : "pointer", letterSpacing: 1 }}>
                      {notifying ? "…" : `📨 ${__("Notifier l'équipe", "Notify team")}`}
                    </button>
                  )}
                  {planning.notifiedAt && (
                    <span style={{ fontSize: 11, color: "var(--txt-mute)" }}>
                      ✓ {__("Notifié le", "Notified on")} {new Date(planning.notifiedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  )}
                  {notifyResult && (
                    <span style={{ fontSize: 11, color: notifyResult.startsWith("❌") ? "#ff6b6b" : "var(--ac)" }}>{notifyResult}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODE CONFIGURATION ══════════════════════════════════════════════ */}
      {mode === "config" && (
        <div>

          {/* ── SALLES ────────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", letterSpacing: 1 }}>🏠 {__("Salles de streaming", "Streaming rooms")}</div>
            <div style={{ flex: 1, height: 1, background: "#00cc8815" }} />
          </div>

          <div style={{ background: "var(--card)", border: "1px solid #00cc8820", borderRadius: 10, padding: 20, marginBottom: 32 }}>
            <div style={{ fontSize: 10, color: "#00cc88", letterSpacing: 3, marginBottom: 16 }}>🏠 {__("SALLES CONFIGURÉES", "CONFIGURED ROOMS")}</div>

            {/* Room list */}
            {roomsLoading ? (
              <p style={{ fontSize: 12, color: "var(--txt-mute)", marginBottom: 16 }}>{__("Chargement…", "Loading…")}</p>
            ) : rooms.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--txt-mute)", marginBottom: 16 }}>{__("Aucune salle configurée.", "No rooms configured.")}</p>
            ) : (
              <div style={{ marginBottom: 20 }}>
                {rooms.map((rm: StreamingRoom) => (
                  <div key={rm.id} style={{ background: "var(--card2)", border: "1px solid var(--bdr)", borderRadius: 8, padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "var(--txt)", fontWeight: 700 }}>{rm.name}</span>
                        <span style={{ fontSize: 9, color: rm.type === "conference" ? "#4488ff" : "#9b59ff", background: rm.type === "conference" ? "#4488ff15" : "#9b59ff15", borderRadius: 4, padding: "1px 6px", letterSpacing: 1, textTransform: "uppercase" }}>{rm.type}</span>
                      </div>
                      {rm.guestLink && <div style={{ fontSize: 10, color: "var(--txt-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guestLinkIcon(rm.guestLink)} {rm.guestLink}</div>}
                      {rm.jaasRoom && <div style={{ fontSize: 10, color: "var(--txt-mute)", fontFamily: "'Courier New', monospace" }}>📹 {rm.jaasRoom}</div>}
                    </div>
                    {canWrite && (
                      <button onClick={() => deleteRoom(rm.id)} style={{ background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", padding: "5px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer", flexShrink: 0 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add room form */}
            {canWrite && (
              <div style={{ background: "var(--card2)", border: "1px solid #00cc8815", borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 10, color: "#00cc88", letterSpacing: 2, marginBottom: 12 }}>+ {__("AJOUTER UNE SALLE", "ADD A ROOM")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--txt-dim)", display: "block", marginBottom: 4 }}>{__("Nom de la salle", "Room name")} *</label>
                    <input
                      value={newRoom.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoom((r: NewRoom) => ({ ...r, name: (e.target as HTMLInputElement).value }))}
                      placeholder={__("ex: Salle Principale", "e.g. Main Hall")}
                      style={INPUT_STYLE}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--txt-dim)", display: "block", marginBottom: 4 }}>{__("Type", "Type")}</label>
                    <select
                      value={newRoom.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewRoom((r: NewRoom) => ({ ...r, type: (e.target as HTMLSelectElement).value as "conference" | "workshop" }))}
                      style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                      <option value="conference">{__("Conférence", "Conference")}</option>
                      <option value="workshop">Workshop</option>
                    </select>
                  </div>
                </div>
                {newRoom.type === "conference" && (() => {
                  const svc = GUEST_LINK_SERVICES.find(s => s.value === newRoom.service) ?? GUEST_LINK_SERVICES[0];
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 10, color: "var(--txt-dim)", display: "block", marginBottom: 4 }}>{__("Lien d'accès studio (guest link)", "Studio access link (guest link)")}</label>
                      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 8 }}>
                        <select
                          value={newRoom.service}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewRoom((r: NewRoom) => ({ ...r, service: (e.target as HTMLSelectElement).value, guestLink: "" }))}
                          style={{ ...INPUT_STYLE, cursor: "pointer" }}
                        >
                          {GUEST_LINK_SERVICES.map(s => (
                            <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                          ))}
                        </select>
                        <input
                          value={newRoom.guestLink}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoom((r: NewRoom) => ({ ...r, guestLink: (e.target as HTMLInputElement).value }))}
                          placeholder={svc.placeholder}
                          style={INPUT_STYLE}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--txt-mute)", marginTop: 4 }}>
                        {__("Lien partagé aux speakers pour rejoindre la session", "Link shared with speakers to join the session")}
                      </div>
                    </div>
                  );
                })()}
                {newRoom.type === "workshop" && newRoom.name && (
                  <div style={{ marginBottom: 12, fontSize: 11, color: "var(--txt-dim)", background: "#9b59ff10", border: "1px solid #9b59ff20", borderRadius: 6, padding: "8px 12px" }}>
                    📹 JaaS room : <code style={{ color: "#9b59ff", fontFamily: "'Courier New', monospace" }}>EOCON-{newRoom.name.toUpperCase().replace(/\s+/g, "-")}</code>
                  </div>
                )}
                <button
                  onClick={addRoom}
                  disabled={roomSaving || !newRoom.name}
                  style={SAVE_BTN_STYLE(roomSaving || !newRoom.name)}>
                  {roomSaving ? __("Création…", "Creating…") : __("Créer la salle", "Create room")}
                </button>
              </div>
            )}
          </div>


          {/* ── CONNEXION RESTREAM ─────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", letterSpacing: 1 }}>🎬 {__("Connexion Restream (OAuth)", "Restream connection (OAuth)")}</div>
            <div style={{ flex: 1, height: 1, background: "#ff444415" }} />
          </div>

          <ArchBox color="#4488ff" icon="📡" title={__("COMMENT ÇA MARCHE", "HOW IT WORKS")}>
            <p style={{ margin: "0 0 8px" }}>
              {__("Pour les", "For")} <strong style={{ color: "var(--txt)" }}>{__("talks, panels et keynotes", "talks, panels and keynotes")}</strong>, {__("les participants voient un", "participants see a")} <strong style={{ color: "var(--txt)" }}>{__("embed YouTube", "YouTube embed")}</strong> {__("sur", "on")} <code style={{ color: "#4488ff" }}>/live</code>.
            </p>
            <p style={{ margin: "0 0 8px" }}>
              {__("Le speaker peut utiliser", "The speaker can use")} <strong style={{ color: "var(--txt)" }}>{__("n'importe quel outil", "any tool")}</strong> {__("pour sa salle privée — Zoom, Google Meet, Teams, Jitsi,", "for their private room — Zoom, Google Meet, Teams, Jitsi,")} <strong style={{ color: "var(--txt)" }}>Restream</strong>, OBS — {__("tant que l'outil envoie le flux vers YouTube via RTMP.", "as long as the tool sends the stream to YouTube via RTMP.")}
            </p>
            <p style={{ margin: 0, color: "var(--txt-dim)" }}>
              👉 {__("Configurez le lien live YouTube et le lien studio invité dans l'onglet", "Configure the YouTube live link and the studio guest link in the tab")} <strong style={{ color: "var(--txt-2)" }}>{__("Planification session", "Session planning")}</strong>.
            </p>
          </ArchBox>

          {/* Restream config */}
          <div style={{ background: "var(--card)", border: `1px solid ${restreamStatus?.configured ? "#ff444030" : "var(--bdr)"}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>🎬</span>
                <div>
                  <div style={{ fontSize: 11, color: "#ff6b6b", letterSpacing: 2, fontFamily: "'Courier New', monospace" }}>RESTREAM — {__("OPTION PRIORITAIRE", "PRIORITY OPTION")}</div>
                  <div style={{ fontSize: 10, color: "var(--txt-mute)", marginTop: 1 }}>{__("Invitez les speakers directement dans Restream Studio — ils présentent en visio et Restream diffuse vers YouTube + Facebook + Twitch simultanément.", "Invite speakers directly into Restream Studio — they present via video and Restream broadcasts to YouTube + Facebook + Twitch simultaneously.")}</div>
                </div>
              </div>
              <a href="https://restream.io" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#ff6b6b", border: "1px solid #ff444030", padding: "4px 10px", borderRadius: 5, textDecoration: "none", letterSpacing: 1 }}>
                → restream.io
              </a>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              {restreamStatus?.configured ? (
                <>
                  <span style={{ fontSize: 11, color: "var(--ac)", background: "var(--ac-bg)", border: "1px solid var(--ac-bdr)", padding: "6px 12px", borderRadius: 6, letterSpacing: 1 }}>
                    ✓ {__("Connecté via OAuth", "Connected via OAuth")}
                  </span>
                  {canWrite && (
                    <button
                      onClick={disconnectRestream}
                      disabled={restreamDisconnecting}
                      style={{ background: "transparent", border: "1px solid #ff000030", color: "#ff6b6b", padding: "6px 12px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                      {restreamDisconnecting ? "…" : __("Déconnecter", "Disconnect")}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span style={{ fontSize: 11, color: "var(--txt-mute)" }}>
                    {__("Non connecté", "Not connected")}
                  </span>
                  {canWrite && (
                    <button
                      onClick={connectRestream}
                      disabled={restreamConnecting}
                      style={{ background: "#ff4444", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: "bold", letterSpacing: 1 }}>
                      {restreamConnecting ? "…" : `🔗 ${__("Connecter Restream (OAuth)", "Connect Restream (OAuth)")}`}
                    </button>
                  )}
                </>
              )}
            </div>

            {restreamStatus?.configured && !restreamStatus?.error && (
              <>
                {/* RTMP URL + stream key */}
                {restreamStatus.rtmpUrl && (
                  <div style={{ background: "var(--card2)", border: "1px solid var(--bdr)", borderRadius: 8, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "var(--txt-2)", letterSpacing: 2, marginBottom: 8 }}>🔗 RTMP — {__("À CONFIGURER DANS OBS / ZOOM / RESTREAM STUDIO", "TO CONFIGURE IN OBS / ZOOM / RESTREAM STUDIO")}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: "var(--txt-dim)", width: 80, flexShrink: 0 }}>{__("URL serveur", "Server URL")}</div>
                      <code style={{ flex: 1, fontSize: 11, color: "#4488ff", fontFamily: "'Courier New', monospace", wordBreak: "break-all", background: "var(--card)", border: "1px solid #4488ff15", borderRadius: 5, padding: "6px 10px" }}>
                        {restreamStatus.rtmpUrl}
                      </code>
                      <button onClick={copyRtmp} style={{ fontSize: 10, color: rtmpCopied ? "var(--ac)" : "var(--txt-dim)", background: rtmpCopied ? "var(--ac-bg)" : "transparent", border: `1px solid ${rtmpCopied ? "var(--ac-bdr)" : "var(--bdr-2)"}`, padding: "5px 10px", borderRadius: 5, cursor: "pointer" }}>
                        {rtmpCopied ? `✓ ${__("Copié", "Copied")}` : `📋 ${__("Copier URL", "Copy URL")}`}
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--txt-dim)", width: 80, flexShrink: 0 }}>{__("Clé stream", "Stream key")}</div>
                      <code style={{ flex: 1, fontSize: 11, color: "#4488ff", fontFamily: "'Courier New', monospace", wordBreak: "break-all", background: "var(--card)", border: "1px solid #4488ff15", borderRadius: 5, padding: "6px 10px" }}>
                        {showRtmpKey ? restreamStatus.streamKey : "•".repeat(Math.min((restreamStatus.streamKey?.length ?? 0), 28))}
                      </code>
                      <button onClick={() => setShowRtmpKey((v: boolean) => !v)} style={{ fontSize: 10, color: "var(--txt-dim)", background: "transparent", border: "1px solid var(--bdr-2)", padding: "5px 10px", borderRadius: 5, cursor: "pointer" }}>
                        {showRtmpKey ? __("Masquer", "Hide") : __("Afficher", "Show")}
                      </button>
                      <button onClick={copyStreamKey} style={{ fontSize: 10, color: keyCopied ? "var(--ac)" : "var(--txt-dim)", background: keyCopied ? "var(--ac-bg)" : "transparent", border: `1px solid ${keyCopied ? "var(--ac-bdr)" : "var(--bdr-2)"}`, padding: "5px 10px", borderRadius: 5, cursor: "pointer" }}>
                        {keyCopied ? `✓ ${__("Copié", "Copied")}` : `📋 ${__("Copier clé", "Copy key")}`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Connected channels */}
                {(restreamStatus.channels ?? []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: "var(--txt-2)", letterSpacing: 2, marginBottom: 8 }}>{__("CANAUX CONNECTÉS", "CONNECTED CHANNELS")} ({restreamStatus.channels!.length})</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                      {restreamStatus.channels!.map(ch => (
                        <div key={ch.id} style={{ background: "var(--card2)", border: `1px solid ${ch.isLive ? "#ff444030" : "var(--bdr)"}`, borderRadius: 7, padding: "10px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{PLATFORM_ICON[ch.type] ?? "📺"}</span>
                            <span style={{ fontSize: 12, color: "var(--txt)", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.displayName}</span>
                            {ch.isLive && <span style={{ fontSize: 9, background: "#ff4444", color: "#fff", borderRadius: 4, padding: "1px 5px", letterSpacing: 1 }}>LIVE</span>}
                          </div>
                          <div style={{ fontSize: 10, color: ch.isActive ? "var(--ac)" : "var(--txt-mute)" }}>{ch.isActive ? `● ${__("Actif", "Active")}` : `○ ${__("Inactif", "Inactive")}`}</div>
                          {ch.embedUrl && (
                            <button
                              onClick={() => navigator.clipboard.writeText(ch.embedUrl!).catch(() => {})}
                              style={{ fontSize: 10, color: "#4488ff", background: "transparent", border: "none", padding: 0, cursor: "pointer", marginTop: 4 }}>
                              📋 {__("Copier embed URL", "Copy embed URL")}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {restreamStatus?.error && (
              <div style={{ fontSize: 11, color: "#ff6b6b", background: "#ff000015", border: "1px solid #ff000030", borderRadius: 6, padding: "8px 12px" }}>
                ⚠ {restreamStatus.error}
              </div>
            )}

            {!restreamStatus?.configured && (
              <div style={{ background: "var(--card2)", border: "1px solid #ff444015", borderRadius: 8, padding: 14, fontSize: 11, color: "var(--txt-dim)", lineHeight: 1.7 }}>
                <strong style={{ color: "#ff6b6b" }}>{__("Pourquoi Restream en priorité ?", "Why Restream first?")}</strong><br />
                • {__("Le speaker rejoint", "The speaker joins")} <strong style={{ color: "var(--txt-2)" }}>Restream Studio</strong> {__("(web, sans install) — vous l'invitez par lien", "(web, no install required) — you invite them by link")}<br />
                • {__("Restream diffuse automatiquement vers", "Restream automatically broadcasts to")} <strong style={{ color: "var(--txt-2)" }}>YouTube Live, Facebook, Twitch</strong>…<br />
                • {__("Vous récupérez l'URL embed YouTube générée et la collez dans le champ", "You copy the generated YouTube embed URL and paste it into the field")} <em>{__("Lien live", "Live link")}</em> {__("de la session", "of the session")}<br />
                • {__("Les participants voient le live YouTube sur", "Participants see the YouTube live on")} <code style={{ color: "#ff6b6b" }}>/live</code> — {__("sans aucune friction", "without any friction")}
              </div>
            )}
          </div>


          {/* ── OVERLAYS ──────────────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", letterSpacing: 1 }}>🎨 {__("Overlays Restream — Captions & Tickers", "Restream Overlays — Captions & Tickers")}</div>
            <div style={{ flex: 1, height: 1, background: "#ff6b3515" }} />
          </div>

          <ArchBox color="#ff6b35" icon="🎨" title={__("COMMENT ÇA MARCHE", "HOW IT WORKS")}>
            <p style={{ margin: "0 0 8px" }}>
              {__("Les", "The")} <strong style={{ color: "var(--txt)" }}>Captions</strong> {__("affichent le nom + titre du speaker en bas de l'écran dans Restream Studio.", "display the speaker's name + title at the bottom of the screen in Restream Studio.")}
              {" "}{__("Les", "The")} <strong style={{ color: "var(--txt)" }}>Tickers</strong> {__("font défiler le titre de la session en bandeau.", "scroll the session title as a banner.")}
            </p>
            <p style={{ margin: 0, color: "var(--txt-dim)" }}>
              {__("Créez-les ici en un clic par speaker ou en masse — sans doublons. Activez/désactivez depuis cette page ou directement dans Restream Studio.", "Create them here in one click per speaker or in bulk — without duplicates. Enable/disable from this page or directly in Restream Studio.")}
            </p>
          </ArchBox>

          {/* Header : Rafraîchir + Tout créer */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <button onClick={loadOverlays} disabled={overlaysLoading}
              style={{ fontSize: 11, color: "var(--txt-dim)", background: "transparent", border: "1px solid var(--bdr-2)", padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>
              {overlaysLoading ? "…" : `↺ ${__("Rafraîchir", "Refresh")}`}
            </button>
            {canWrite && (
              <button
                disabled={overlaysBulking || !restreamStatus?.configured}
                onClick={async () => {
                  setOverlaysBulking(true); setOverlaysBulkResult(null);
                  try {
                    const r = await overlayAction("bulk_all");
                    if (r?.error) setOverlaysBulkResult(`❌ ${r.error}`);
                    else setOverlaysBulkResult(`✓ ${r.captionsCreated} caption(s) + ${r.tickersCreated} ticker(s) ${__("créés", "created")} — ${r.skipped} ${__("doublon(s) ignoré(s)", "duplicate(s) skipped")}`);
                    await loadOverlays();
                  } finally { setOverlaysBulking(false); }
                }}
                style={{ fontSize: 11, color: overlaysBulking ? "var(--txt-mute)" : "#ff6b35", background: "#ff6b3510", border: "1px solid #ff6b3540", padding: "6px 16px", borderRadius: 6, cursor: overlaysBulking ? "not-allowed" : "pointer", fontWeight: 700 }}>
                {overlaysBulking ? __("Création en cours…", "Creating…") : `⚡ ${__("Tout créer automatiquement (sans doublons)", "Create all automatically (no duplicates)")}`}
              </button>
            )}
            {overlaysBulkResult && (
              <span style={{ fontSize: 11, color: overlaysBulkResult.startsWith("✓") ? "var(--ac)" : "#ff4444" }}>{overlaysBulkResult}</span>
            )}
          </div>

          {/* Captions existantes */}
          <div style={{ background: "var(--card)", border: "1px solid #ff6b3520", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#ff6b35", letterSpacing: 3, marginBottom: 12 }}>
              🖼 CAPTIONS ({overlays.captions.length})
              <span style={{ color: "var(--txt-mute)", marginLeft: 12, fontWeight: 400, letterSpacing: 1 }}>{__("texte principal + texte secondaire affiché sous le speaker", "primary text + secondary text displayed under the speaker")}</span>
            </div>
            {overlays.captions.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--txt-mute)", fontStyle: "italic" }}>{__("Aucune caption — utilisez les boutons ci-dessous pour en créer.", "No captions — use the buttons below to create some.")}</div>
            )}
            {overlays.captions.map(cap => (
              <div key={cap.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "var(--card)", border: `1px solid ${cap.active ? "#ff6b3540" : "var(--bdr)"}`, borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: cap.active ? "#ff6b35" : "var(--txt-2)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cap.text}</div>
                  {cap.secondaryText && <div style={{ fontSize: 11, color: "var(--txt-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cap.secondaryText}</div>}
                </div>
                <span style={{ fontSize: 10, color: cap.active ? "#ff6b35" : "var(--txt-mute)", background: cap.active ? "#ff6b3515" : "transparent", border: `1px solid ${cap.active ? "#ff6b3530" : "var(--bdr-2)"}`, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>
                  {cap.active ? `● ${__("ACTIF", "ACTIVE")}` : `○ ${__("inactif", "inactive")}`}
                </span>
                {canWrite && (
                  <>
                    <button onClick={async () => { await overlayAction("update_caption", { id: cap.id, active: !cap.active }); loadOverlays(); }}
                      style={{ fontSize: 10, color: cap.active ? "var(--txt-dim)" : "#ff6b35", background: "transparent", border: "1px solid var(--bdr-2)", padding: "4px 10px", borderRadius: 5, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {cap.active ? __("Désactiver", "Disable") : __("Activer", "Enable")}
                    </button>
                    <button onClick={async () => { await overlayAction("delete_caption", { id: cap.id }); loadOverlays(); }}
                      style={{ fontSize: 10, color: "#ff4444", background: "transparent", border: "1px solid #ff444420", padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>
                      🗑
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Tickers existants */}
          <div style={{ background: "var(--card)", border: "1px solid #ff6b3520", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#ff6b35", letterSpacing: 3, marginBottom: 12 }}>
              📰 TICKERS ({overlays.tickers.length})
              <span style={{ color: "var(--txt-mute)", marginLeft: 12, fontWeight: 400, letterSpacing: 1 }}>{__("bandeau défilant affiché en bas du stream", "scrolling banner displayed at the bottom of the stream")}</span>
            </div>
            {overlays.tickers.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--txt-mute)", fontStyle: "italic" }}>{__("Aucun ticker — utilisez les boutons ci-dessous pour en créer.", "No tickers — use the buttons below to create some.")}</div>
            )}
            {overlays.tickers.map(tick => (
              <div key={tick.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: "var(--card)", border: `1px solid ${tick.active ? "#ff6b3540" : "var(--bdr)"}`, borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ flex: 1, fontSize: 12, color: tick.active ? "#ff6b35" : "var(--txt-2)", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tick.text}</div>
                <span style={{ fontSize: 10, color: tick.active ? "#ff6b35" : "var(--txt-mute)", background: tick.active ? "#ff6b3515" : "transparent", border: `1px solid ${tick.active ? "#ff6b3530" : "var(--bdr-2)"}`, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>
                  {tick.active ? `● ${__("ACTIF", "ACTIVE")}` : `○ ${__("inactif", "inactive")}`}
                </span>
                {canWrite && (
                  <>
                    <button onClick={async () => { await overlayAction("update_ticker", { id: tick.id, active: !tick.active }); loadOverlays(); }}
                      style={{ fontSize: 10, color: tick.active ? "var(--txt-dim)" : "#ff6b35", background: "transparent", border: "1px solid var(--bdr-2)", padding: "4px 10px", borderRadius: 5, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {tick.active ? __("Désactiver", "Disable") : __("Activer", "Enable")}
                    </button>
                    <button onClick={async () => { await overlayAction("delete_ticker", { id: tick.id }); loadOverlays(); }}
                      style={{ fontSize: 10, color: "#ff4444", background: "transparent", border: "1px solid #ff444420", padding: "4px 10px", borderRadius: 5, cursor: "pointer" }}>
                      🗑
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Créer pour un speaker (combobox) */}
          {acceptedSpeakers.length > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid #ff6b3520", borderRadius: 10, padding: 16, marginBottom: 32 }}>
              <div style={{ fontSize: 10, color: "#ff6b35", letterSpacing: 3, marginBottom: 12 }}>👤 {__("CRÉER POUR UN SPEAKER", "CREATE FOR A SPEAKER")}</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: selectedOverlaySpeakerId != null ? 10 : 0 }}>
                <select
                  value={selectedOverlaySpeakerId ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedOverlaySpeakerId(parseInt((e.target as HTMLSelectElement).value) || null)}
                  style={{ ...INPUT_STYLE, flex: 1, minWidth: 200, cursor: "pointer" }}
                >
                  <option value="">— {__("Sélectionner un speaker", "Select a speaker")} —</option>
                  {acceptedSpeakers.map((sp: AcceptedSpeaker) => (
                    <option key={sp.id} value={sp.id}>{sp.name}{sp.title ? ` (${sp.title})` : ""}</option>
                  ))}
                </select>
                {selectedOverlaySpeakerId != null && canWrite && (() => {
                  const sp = acceptedSpeakers.find((s: AcceptedSpeaker) => s.id === selectedOverlaySpeakerId);
                  if (!sp) return null;
                  const captionText = [sp.name, sp.title].filter(Boolean).join(", ");
                  const tickerText  = sp.talkTitle || sp.name;
                  const busy        = overlayPerSpeaker[sp.id] ?? false;
                  return (
                    <>
                      <button disabled={busy}
                        onClick={async () => {
                          setOverlayPerSpeaker((s: Record<number, boolean>) => ({ ...s, [sp.id]: true }));
                          await overlayAction("create_caption", { text: captionText, secondaryText: sp.talkTitle || undefined });
                          await loadOverlays();
                          setOverlayPerSpeaker((s: Record<number, boolean>) => ({ ...s, [sp.id]: false }));
                        }}
                        style={{ fontSize: 10, color: "#ff6b35", background: "#ff6b3510", border: "1px solid #ff6b3530", padding: "6px 12px", borderRadius: 5, cursor: busy ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const }}>
                        + Caption
                      </button>
                      <button disabled={busy}
                        onClick={async () => {
                          setOverlayPerSpeaker((s: Record<number, boolean>) => ({ ...s, [sp.id]: true }));
                          await overlayAction("create_ticker", { text: tickerText });
                          await loadOverlays();
                          setOverlayPerSpeaker((s: Record<number, boolean>) => ({ ...s, [sp.id]: false }));
                        }}
                        style={{ fontSize: 10, color: "#ff6b35", background: "#ff6b3510", border: "1px solid #ff6b3530", padding: "6px 12px", borderRadius: 5, cursor: busy ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const }}>
                        + Ticker
                      </button>
                      <button disabled={busy}
                        onClick={async () => {
                          setOverlayPerSpeaker((s: Record<number, boolean>) => ({ ...s, [sp.id]: true }));
                          await overlayAction("bulk_speaker", { speakerId: sp.id });
                          await loadOverlays();
                          setOverlayPerSpeaker((s: Record<number, boolean>) => ({ ...s, [sp.id]: false }));
                        }}
                        style={{ fontSize: 10, color: busy ? "var(--txt-mute)" : "var(--ac)", background: busy ? "transparent" : "var(--ac-bg)", border: `1px solid ${busy ? "var(--bdr-2)" : "var(--ac-bdr)"}`, padding: "6px 12px", borderRadius: 5, cursor: busy ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const }}>
                        {busy ? "…" : `⚡ ${__("Les deux", "Both")}`}
                      </button>
                    </>
                  );
                })()}
              </div>
              {selectedOverlaySpeakerId != null && (() => {
                const sp = acceptedSpeakers.find((s: AcceptedSpeaker) => s.id === selectedOverlaySpeakerId);
                if (!sp) return null;
                return (
                  <div style={{ fontSize: 11, color: "var(--txt-mute)" }}>
                    Caption : <span style={{ color: "var(--txt-2)" }}>&quot;{[sp.name, sp.title].filter(Boolean).join(", ")}&quot;</span>
                    {sp.talkTitle && <> · Ticker : <span style={{ color: "var(--txt-2)" }}>&quot;{sp.talkTitle}&quot;</span></>}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── CREDENTIALS JAAS ────────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--txt)", letterSpacing: 1 }}>🔑 {__("JaaS Rooms (8x8.vc)", "JaaS Rooms (8x8.vc)")}</div>
            <div style={{ flex: 1, height: 1, background: "#9b59ff15" }} />
          </div>

          <ArchBox color="#9b59ff" icon="🎓" title={__("COMMENT ÇA MARCHE", "HOW IT WORKS")}>
            <p style={{ margin: "0 0 8px" }}>
              {__("Pour les", "For")} <strong style={{ color: "var(--txt)" }}>{__("ateliers / workshops", "workshops")}</strong>, {__("les participants rejoignent", "participants join")} <strong style={{ color: "var(--txt)" }}>{__("directement", "directly")}</strong> {__("la salle JaaS — pas de YouTube.", "the JaaS room — no YouTube.")}
            </p>
            <p style={{ margin: "0 0 8px" }}>
              {__("Le participant clique", "The participant clicks")} <em>{__("Rejoindre", "Join")}</em> {__("sur", "on")} <code style={{ color: "#9b59ff" }}>/live</code> {__("et se retrouve dans la room vidéo avec le formateur, en pair-à-pair (WebRTC).", "and enters the video room with the trainer, peer-to-peer (WebRTC).")}
            </p>
            <p style={{ margin: 0, color: "var(--txt-dim)" }}>
              {__("Contrairement aux sessions,", "Unlike sessions,")} <strong style={{ color: "var(--txt-2)" }}>{__("les ateliers ont besoin de JaaS", "workshops need JaaS")}</strong> {__("car les participants interagissent directement (Zoom/Meet ne peuvent pas être embarqués pour un usage à grande échelle sans licences par participant).", "because participants interact directly (Zoom/Meet cannot be embedded for large-scale use without per-participant licences).")}
            </p>
          </ArchBox>

          {/* JaaS credentials */}
          <div style={{ background: "var(--card)", border: "1px solid #9b59ff20", borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 3, marginBottom: 14 }}>🔑 CREDENTIALS JAAS (8x8.vc)</div>

            {(["appId", "apiKey"] as const).map(field => (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 2, display: "block", marginBottom: 4 }}>
                  {field === "appId" ? "APP ID (vpaas-magic-cookie-xxxx)" : "API KEY ID (kid)"}
                </label>
                <input value={jaas[field]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJaas((j: JaasConfig) => ({ ...j, [field]: (e.target as HTMLInputElement).value }))} disabled={!canWrite}
                  placeholder={field === "appId" ? "vpaas-magic-cookie-xxxx" : "xxxx"} style={INPUT_STYLE} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, color: "#9b59ff", letterSpacing: 2, display: "block", marginBottom: 4 }}>{__("CLÉ PRIVÉE RSA (PEM)", "RSA PRIVATE KEY (PEM)")}</label>
              <textarea value={jaas.privateKey} onChange={e => setJaas(j => ({ ...j, privateKey: (e.target as HTMLTextAreaElement).value }))}
                disabled={!canWrite} rows={5}
                placeholder={"-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"}
                style={{ width: "100%", background: "var(--card)", border: "1px solid #9b59ff20", borderRadius: 6, color: "var(--txt)", padding: "10px 12px", fontSize: 11, fontFamily: "'Courier New', monospace", boxSizing: "border-box" as const, resize: "vertical" as const, outline: "none" }} />
            </div>
            {canWrite && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={saveJaas} disabled={jaasSaving} style={{ ...SAVE_BTN_STYLE(jaasSaving), background: "#9b59ff", color: "#fff" }}>
                  {jaasSaved ? `✓ ${__("Sauvegardé", "Saved")}` : jaasSaving ? __("Sauvegarde…", "Saving…") : __("Sauvegarder config JaaS", "Save JaaS config")}
                </button>
                {jaas.appId && (
                  <a href={`https://8x8.vc/${jaas.appId}/EOCON-TEST`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "#9b59ff", background: "#9b59ff10", border: "1px solid #9b59ff30", padding: "8px 16px", borderRadius: 6, textDecoration: "none", letterSpacing: 1 }}>
                    🧪 {__("Tester la room", "Test room")}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
