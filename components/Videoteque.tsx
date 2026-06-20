"use client";
import { useEffect, useState } from "react";
import { Translations } from "@/lib/i18n";

interface SessionVideo {
  id: number;
  title: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  speaker: string | null;
  edition: string;
  category: string | null;
  isVisible: boolean;
  sortOrder: number;
}

function getYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) {
      return u.searchParams.get("v");
    }
  } catch {
    // ignore
  }
  return null;
}

function getThumbnail(video: SessionVideo): string {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  const id = getYoutubeId(video.youtubeUrl);
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return "";
}

function getCategoryColor(category: string | null): string {
  switch (category) {
    case "keynote": return "#cc00ff";
    case "talk": return "#00ff9d";
    case "workshop": return "#ff6600";
    case "panel": return "#0066ff";
    default: return "#00ff9d";
  }
}

function VideoModal({ video, lang, onClose }: { video: SessionVideo; lang?: "fr" | "en"; onClose: () => void }) {
  const youtubeId = getYoutubeId(video.youtubeUrl);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const title = lang === "en" && video.titleEn ? video.titleEn : video.title;
  const description = lang === "en" && video.descriptionEn ? video.descriptionEn : video.description;
  const categoryColor = getCategoryColor(video.category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto"
        style={{ background: "#0a0a0f", border: `1px solid ${categoryColor}40` }}
      >
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: `${categoryColor}20` }}>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{title}</h3>
            {video.speaker && (
              <p className="text-sm mt-1" style={{ color: categoryColor }}>{video.speaker}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-3xl leading-none ml-4 flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Video embed */}
        <div className="p-4">
          {youtubeId ? (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div
              className="w-full rounded-lg flex items-center justify-center"
              style={{ height: "300px", background: "#111" }}
            >
              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-green underline"
              >
                {video.youtubeUrl}
              </a>
            </div>
          )}
        </div>

        {/* Meta & description */}
        <div className="px-4 pb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className="text-xs font-bold px-2 py-1 rounded uppercase tracking-wider"
              style={{ background: `${categoryColor}20`, color: categoryColor, border: `1px solid ${categoryColor}40` }}
            >
              {video.edition}
            </span>
            {video.category && (
              <span
                className="text-xs font-bold px-2 py-1 rounded uppercase tracking-wider"
                style={{ background: `${categoryColor}20`, color: categoryColor, border: `1px solid ${categoryColor}40` }}
              >
                {video.category}
              </span>
            )}
          </div>
          {description && (
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  t: Translations;
  lang?: "fr" | "en";
}

export default function Videoteque({ t, lang = "fr" }: Props) {
  const [videos, setVideos] = useState<SessionVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEdition, setSelectedEdition] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeVideo, setActiveVideo] = useState<SessionVideo | null>(null);

  const vt = (t as unknown as { videoteque?: Record<string, string> }).videoteque;
  const labels = {
    title: vt?.title ?? (lang === "en" ? "Video Library" : "Vidéothèque"),
    subtitle: vt?.subtitle ?? (lang === "en" ? "Watch sessions from past editions" : "Regardez les sessions des éditions passées"),
    all_editions: vt?.all_editions ?? (lang === "en" ? "All Editions" : "Toutes les éditions"),
    all_categories: vt?.all_categories ?? (lang === "en" ? "All" : "Tous"),
    no_videos: vt?.no_videos ?? (lang === "en" ? "Videos coming soon." : "Les vidéos arrivent bientôt."),
    watch: vt?.watch ?? (lang === "en" ? "Watch" : "Regarder"),
  };

  useEffect(() => {
    fetch("/api/public/videos")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setVideos(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const editions = ["all", ...Array.from(new Set(videos.map(v => v.edition))).sort((a, b) => b.localeCompare(a))];
  const categories = ["all", ...Array.from(new Set(videos.map(v => v.category).filter(Boolean)))];

  const filtered = videos.filter(v => {
    if (selectedEdition !== "all" && v.edition !== selectedEdition) return false;
    if (selectedCategory !== "all" && v.category !== selectedCategory) return false;
    return true;
  });

  const filterBtnStyle = (active: boolean, color = "#00ff9d") => ({
    background: active ? `${color}20` : "transparent",
    border: `1px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
    color: active ? color : "#9ca3af",
  });

  return (
    <section id="videoteque" className="py-20 px-4" style={{ background: "rgba(10,10,15,0.3)" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span
              className="text-xs font-bold tracking-[0.3em] uppercase px-3 py-1 rounded"
              style={{ background: "rgba(0,255,157,0.1)", color: "#00ff9d", border: "1px solid rgba(0,255,157,0.3)" }}
            >
              EOCON
            </span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-black text-white mb-4"
            style={{ textShadow: "0 0 30px rgba(0,255,157,0.3)" }}
          >
            <span className="glitch" data-text={labels.title}>{labels.title}</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">{labels.subtitle}</p>
          <div className="w-24 h-1 mx-auto mt-6" style={{ background: "linear-gradient(90deg, #00ff9d, transparent)" }} />
        </div>

        {/* Filters */}
        {!loading && videos.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-10">
            {/* Edition filter */}
            <div className="flex flex-wrap gap-2">
              {editions.map(ed => (
                <button
                  key={ed}
                  onClick={() => setSelectedEdition(ed)}
                  className="px-3 py-1.5 rounded text-sm font-bold transition-all duration-200"
                  style={filterBtnStyle(selectedEdition === ed)}
                >
                  {ed === "all" ? labels.all_editions : `EOCON ${ed}`}
                </button>
              ))}
            </div>
            {/* Category filter */}
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat ?? "all"}
                    onClick={() => setSelectedCategory(cat ?? "all")}
                    className="px-3 py-1.5 rounded text-sm font-bold transition-all duration-200 capitalize"
                    style={filterBtnStyle(selectedCategory === (cat ?? "all"), "#cc00ff")}
                  >
                    {cat === "all" ? labels.all_categories : cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div
              className="w-10 h-10 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgba(0,255,157,0.2)", borderTopColor: "#00ff9d" }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-gray-500 text-lg">{labels.no_videos}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(video => {
              const thumbnail = getThumbnail(video);
              const categoryColor = getCategoryColor(video.category);
              const title = lang === "en" && video.titleEn ? video.titleEn : video.title;

              return (
                <div
                  key={video.id}
                  className="group rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 0 0 rgba(0,255,157,0)",
                  }}
                  onClick={() => setActiveVideo(video)}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.border = `1px solid ${categoryColor}40`;
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${categoryColor}15`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 rgba(0,255,157,0)";
                  }}
                >
                  {/* Thumbnail */}
                  <div className="relative overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: "#111" }}
                      >
                        <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                    {/* Play overlay */}
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: "rgba(0,0,0,0.5)" }}
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ background: `${categoryColor}cc`, boxShadow: `0 0 20px ${categoryColor}80` }}
                      >
                        <svg className="w-6 h-6 ml-1" fill="#000" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {/* Category badge */}
                    {video.category && (
                      <span
                        className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider"
                        style={{ background: `${categoryColor}cc`, color: "#000" }}
                      >
                        {video.category}
                      </span>
                    )}
                    {/* Edition badge */}
                    <span
                      className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: "rgba(0,0,0,0.7)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
                    >
                      {video.edition}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <h3 className="text-white font-bold text-sm leading-snug mb-2 line-clamp-2">{title}</h3>
                    {video.speaker && (
                      <p className="text-xs font-medium mb-3" style={{ color: categoryColor }}>
                        {video.speaker}
                      </p>
                    )}
                    <button
                      className="flex items-center gap-1.5 text-xs font-bold transition-colors duration-200"
                      style={{ color: categoryColor }}
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      {labels.watch}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* YouTube CTA */}
        <div className="text-center mt-14">
          <a
            href="https://www.youtube.com/@EOCON"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-sm transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: "rgba(255,0,0,0.12)",
              border: "1px solid rgba(255,0,0,0.4)",
              color: "#ff4444",
              boxShadow: "0 0 24px rgba(255,0,0,0.08)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,0,0,0.2)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 32px rgba(255,0,0,0.2)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,0,0,0.12)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 24px rgba(255,0,0,0.08)";
            }}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            {lang === "en" ? "More videos & Subscribe" : "Plus de vidéos & S'abonner"}
          </a>
        </div>
      </div>

      {/* Video modal */}
      {activeVideo && (
        <VideoModal video={activeVideo} lang={lang} onClose={() => setActiveVideo(null)} />
      )}
    </section>
  );
}
