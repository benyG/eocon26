"use client";

import { useState } from "react";
import type { ReactNode } from "react";

// ── Local helper components ────────────────────────────────────────────────────

function Step({ n, title, children }: { n: number | string; title: string; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#00ff9d20", border: "1px solid #00ff9d50", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#00ff9d", fontFamily: "'Courier New', monospace", flexShrink: 0, marginTop: 2 }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.8 }}>{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }: { children?: ReactNode }) {
  return (
    <div style={{ background: "#00ff9d08", border: "1px solid #00ff9d25", borderRadius: 8, padding: "10px 14px", margin: "12px 0", fontSize: 12, color: "#aaa", lineHeight: 1.8 }}>
      <span style={{ color: "#00ff9d", fontWeight: 700, marginRight: 6 }}>💡</span>{children}
    </div>
  );
}

function Warn({ children }: { children?: ReactNode }) {
  return (
    <div style={{ background: "#ffaa0008", border: "1px solid #ffaa0030", borderRadius: 8, padding: "10px 14px", margin: "12px 0", fontSize: 12, color: "#aaa", lineHeight: 1.8 }}>
      <span style={{ color: "#ffaa00", fontWeight: 700, marginRight: 6 }}>⚠</span>{children}
    </div>
  );
}

function Info({ children }: { children?: ReactNode }) {
  return (
    <div style={{ background: "#4488ff08", border: "1px solid #4488ff25", borderRadius: 8, padding: "10px 14px", margin: "12px 0", fontSize: 12, color: "#aaa", lineHeight: 1.8 }}>
      <span style={{ color: "#4488ff", fontWeight: 700, marginRight: 6 }}>ℹ</span>{children}
    </div>
  );
}

function Code({ children }: { children: string }) {
  return <code style={{ background: "#050508", border: "1px solid #ffffff15", borderRadius: 4, padding: "2px 7px", fontSize: 11, color: "#4488ff", fontFamily: "'Courier New', monospace" }}>{children}</code>;
}

function Section({ title, color = "#00ff9d", children }: { title: string; color?: string; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 10, color, letterSpacing: 3, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 1, background: `${color}20` }} />
        {title}
        <div style={{ flex: 1, height: 1, background: `${color}20` }} />
      </div>
      {children}
    </div>
  );
}

// ── Chapter content ────────────────────────────────────────────────────────────

function ChapterOverview({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "🗺 Vue d'ensemble" : "🗺 Overview"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "Comprendre l'architecture avant de commencer." : "Understand the architecture before starting."}
      </p>

      <Section title={isFr ? "DEUX FORMATS DE SESSION" : "TWO SESSION FORMATS"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "#4488ff08", border: "1px solid #4488ff25", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#4488ff", letterSpacing: 2, marginBottom: 8 }}>📡 SESSIONS LIVE</div>
            <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.8 }}>
              {isFr
                ? <>Talks, keynotes, panels.<br/>Flux : Speaker → Restream Studio → YouTube Live → Embed <Code>/live</Code><br/>Participants voient un player YouTube.</>
                : <>Talks, keynotes, panels.<br/>Flow: Speaker → Restream Studio → YouTube Live → Embed <Code>/live</Code><br/>Participants see a YouTube player.</>}
            </div>
          </div>
          <div style={{ background: "#9b59ff08", border: "1px solid #9b59ff25", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#9b59ff", letterSpacing: 2, marginBottom: 8 }}>🎓 ATELIERS (WORKSHOPS)</div>
            <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.8 }}>
              {isFr
                ? <>Workshops interactifs.<br/>Flux : Participants → Room JaaS (WebRTC P2P)<br/>Pas de YouTube. Connexion directe.</>
                : <>Interactive workshops.<br/>Flow: Participants → JaaS Room (WebRTC P2P)<br/>No YouTube. Direct connection.</>}
            </div>
          </div>
        </div>
      </Section>

      <Section title={isFr ? "RÔLES & RESPONSABILITÉS" : "ROLES & RESPONSIBILITIES"}>
        {[
          { role: isFr ? "🔧 Technicien streaming" : "🔧 Streaming technician", color: "#00ff9d", desc: isFr ? "Configure Restream, valide le flux, gère les urgences techniques, prépare chaque session." : "Configures Restream, validates stream, handles technical issues, prepares each session." },
          { role: isFr ? "🎙 Modérateur" : "🎙 Moderator", color: "#4488ff", desc: isFr ? "Accueille le speaker dans Restream Studio, introduit les sessions, filtre les Q&A, gère le timing." : "Welcomes speaker in Restream Studio, introduces sessions, filters Q&A, manages timing." },
          { role: isFr ? "👤 Speaker" : "👤 Speaker", color: "#ffaa00", desc: isFr ? "Rejoint Restream Studio via son lien d'invitation, présente son contenu depuis son navigateur." : "Joins Restream Studio via invite link, presents content from their browser." },
        ].map(r => (
          <div key={r.role} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #ffffff08" }}>
            <div style={{ width: 140, fontSize: 12, color: r.color, flexShrink: 0, fontWeight: 600 }}>{r.role}</div>
            <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.7 }}>{r.desc}</div>
          </div>
        ))}
      </Section>

      <Section title={isFr ? "CHRONOLOGIE TYPE (J-0)" : "TYPICAL TIMELINE (D-0)"}>
        {[
          { time: "H-2h",    col: "#666",     txt: isFr ? "Vérification token Restream + canaux YouTube actifs" : "Check Restream token + YouTube channels active" },
          { time: "H-1h",    col: "#666",     txt: isFr ? "Ouvrir Studio, ajouter le speaker, vérifier équipe (📅 Planification)" : "Open Studio, add speaker, check team (📅 Planning)" },
          { time: "H-30min", col: "#ffaa00",  txt: isFr ? "Test stream en Preview, valider audio/vidéo" : "Test stream in Preview, validate audio/video" },
          { time: "H-15min", col: "#ffaa00",  txt: isFr ? "↗ Récupérer le lien embed YouTube dans Planification → Sauvegarder" : "↗ Fetch YouTube embed link in Planning → Save" },
          { time: "H-10min", col: "#ff6b6b",  txt: isFr ? "Tester page /live (navigation privée) + Q&A test" : "Test /live page (incognito) + test Q&A" },
          { time: "H-5min",  col: "#ff6b6b",  txt: isFr ? "Overlays préparés, speaker prêt, modérateur en ligne" : "Overlays ready, speaker ready, moderator online" },
          { time: "H-0",     col: "#00ff9d",  txt: isFr ? "🔴 Go Live → broadcast annonce participants" : "🔴 Go Live → broadcast announcement to participants" },
        ].map(t => (
          <div key={t.time} style={{ display: "flex", gap: 16, padding: "7px 0", borderBottom: "1px solid #ffffff06" }}>
            <div style={{ width: 56, fontSize: 11, color: t.col, fontFamily: "'Courier New', monospace", flexShrink: 0 }}>{t.time}</div>
            <div style={{ fontSize: 12, color: "#aaa" }}>{t.txt}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function ChapterRestream({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "1 · Configurer Restream (OAuth)" : "1 · Set up Restream (OAuth)"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "La connexion utilise OAuth 2.0 — pas de token manuel. À faire une seule fois, ou après un «Token invalide ou expiré»." : "The connection uses OAuth 2.0 — no manual token. Done once, or after a 'Token invalid or expired' error."}
      </p>

      <Section title={isFr ? "PRÉREQUIS — VARIABLES D'ENVIRONNEMENT" : "PREREQUISITES — ENVIRONMENT VARIABLES"} color="#ffaa00">
        <Step n={1} title={isFr ? "Créer une application OAuth sur restream.io" : "Create an OAuth app on restream.io"}>
          {isFr
            ? <>Connectez-vous sur <strong style={{ color: "#fff" }}>restream.io</strong> avec le compte EOCON.<br/>Allez dans : <Code>Profile → Developers → Create application</Code><br/>Renseignez :<br/>• Nom : <em>EOCON 2026 Admin</em><br/>• Redirect URI : <Code>https://[votre-domaine]/api/admin/live/restream/callback</Code><br/>Copiez le <strong style={{ color: "#fff" }}>Client ID</strong> et le <strong style={{ color: "#fff" }}>Client Secret</strong>.</>
            : <>Log in to <strong style={{ color: "#fff" }}>restream.io</strong> with the EOCON account.<br/>Go to: <Code>Profile → Developers → Create application</Code><br/>Fill in:<br/>• Name: <em>EOCON 2026 Admin</em><br/>• Redirect URI: <Code>https://[your-domain]/api/admin/live/restream/callback</Code><br/>Copy the <strong style={{ color: "#fff" }}>Client ID</strong> and <strong style={{ color: "#fff" }}>Client Secret</strong>.</>}
        </Step>

        <Step n={2} title={isFr ? "Configurer les variables d'environnement" : "Set the environment variables"}>
          {isFr
            ? <>Dans votre <Code>.env</Code> ou panneau d&apos;hébergement (Vercel, Railway…) :<br/><br/><Code>RESTREAM_CLIENT_ID=xxxxx</Code><br/><Code>RESTREAM_CLIENT_SECRET=xxxxx</Code><br/><Code>RESTREAM_REDIRECT_URI=https://[domaine]/api/admin/live/restream/callback</Code><br/><br/>Redémarrez l&apos;application après modification.</>
            : <>In your <Code>.env</Code> or hosting panel (Vercel, Railway…):<br/><br/><Code>RESTREAM_CLIENT_ID=xxxxx</Code><br/><Code>RESTREAM_CLIENT_SECRET=xxxxx</Code><br/><Code>RESTREAM_REDIRECT_URI=https://[domain]/api/admin/live/restream/callback</Code><br/><br/>Restart the application after changes.</>}
          <Warn>{isFr ? "RESTREAM_REDIRECT_URI doit correspondre exactement à ce qui est déclaré dans l'application Restream (avec /api/admin/live/restream/callback à la fin)." : "RESTREAM_REDIRECT_URI must exactly match what is declared in the Restream app (ending with /api/admin/live/restream/callback)."}</Warn>
        </Step>
      </Section>

      <Section title={isFr ? "CONNEXION — DANS L'ADMIN" : "CONNECTION — IN ADMIN"} color="#00ff9d">
        <Step n={3} title={isFr ? "Cliquer «Connecter Restream (OAuth)»" : "Click 'Connect Restream (OAuth)'"}>
          {isFr
            ? <><Code>Admin → Live Streaming → ⚙️ Configuration → Section Restream</Code><br/>Cliquez <strong style={{ color: "#ff4444" }}>🔗 Connecter Restream (OAuth)</strong>.<br/>Vous êtes redirigé vers restream.io → autorisez l&apos;application → retour automatique dans l&apos;admin.<br/>Le statut passe à <strong style={{ color: "#00ff9d" }}>✓ Connecté via OAuth</strong>.</>
            : <><Code>Admin → Live Streaming → ⚙️ Configuration → Restream section</Code><br/>Click <strong style={{ color: "#ff4444" }}>🔗 Connect Restream (OAuth)</strong>.<br/>You are redirected to restream.io → authorize the app → automatically returned to admin.<br/>Status changes to <strong style={{ color: "#00ff9d" }}>✓ Connected via OAuth</strong>.</>}
          <Tip>{isFr ? "Le token OAuth est valide ~1h et se renouvelle automatiquement via le refresh token. La reconnexion manuelle n'est nécessaire que si le refresh token expire aussi (rare, ~30 jours)." : "The OAuth token is valid ~1h and auto-renews via the refresh token. Manual reconnection is only needed if the refresh token also expires (rare, ~30 days)."}</Tip>
        </Step>

        <Step n={4} title={isFr ? "Token invalide ou expiré — que faire ?" : "Token invalid or expired — what to do?"}>
          {isFr
            ? <>Si le message <strong style={{ color: "#ff6b6b" }}>⚠ Token invalide ou expiré</strong> s&apos;affiche dans l&apos;admin :<br/>1. Cliquez <strong style={{ color: "#ff6b6b" }}>Déconnecter</strong><br/>2. Cliquez <strong style={{ color: "#ff4444" }}>🔗 Connecter Restream (OAuth)</strong><br/>3. Ré-autorisez sur restream.io<br/>Le nouveau token est valide et le refresh token est remis à zéro.</>
            : <>If the <strong style={{ color: "#ff6b6b" }}>⚠ Token invalid or expired</strong> message appears in admin:<br/>1. Click <strong style={{ color: "#ff6b6b" }}>Disconnect</strong><br/>2. Click <strong style={{ color: "#ff4444" }}>🔗 Connect Restream (OAuth)</strong><br/>3. Re-authorize on restream.io<br/>The new token is valid and the refresh token is reset.</>}
        </Step>
      </Section>

      <Section title={isFr ? "CANAUX & DESTINATION YOUTUBE" : "CHANNELS & YOUTUBE DESTINATION"} color="#4488ff">
        <Step n={5} title={isFr ? "Vérifier les canaux connectés" : "Verify connected channels"}>
          {isFr
            ? <>Une fois connecté, les canaux Restream s&apos;affichent dans le widget <Code>🔴 En direct</Code>. Vérifiez que <strong style={{ color: "#fff" }}>YouTube</strong> est présent et <strong style={{ color: "#00ff9d" }}>Actif</strong>.<br/>Si YouTube n&apos;apparaît pas : sur <Code>restream.io → Canaux → Ajouter YouTube</Code> → connectez le compte YouTube EOCON.</>
            : <>Once connected, Restream channels appear in the <Code>🔴 Live</Code> widget. Verify that <strong style={{ color: "#fff" }}>YouTube</strong> is listed and <strong style={{ color: "#00ff9d" }}>Active</strong>.<br/>If YouTube doesn&apos;t appear: on <Code>restream.io → Channels → Add YouTube</Code> → connect the EOCON YouTube account.</>}
          <Warn>{isFr ? "Sans canal YouTube actif dans Restream, les boutons ↗ Récupérer et + Créer ne peuvent pas générer d'URL embed YouTube." : "Without an active YouTube channel in Restream, the ↗ Fetch and + Create buttons cannot generate a YouTube embed URL."}</Warn>
        </Step>

        <Step n={6} title={isFr ? "Configurer la destination YouTube dans Restream" : "Configure the YouTube destination in Restream"}>
          {isFr
            ? <>Sur <Code>restream.io → Canaux → YouTube</Code> :<br/>• Confidentialité par défaut : <strong style={{ color: "#ff6b6b" }}>Public</strong> (ou Non répertorié pour les tests)<br/>• Catégorie : Science et technologie<br/>Ces paramètres s&apos;appliquent aux événements créés depuis l&apos;admin.</>
            : <>On <Code>restream.io → Channels → YouTube</Code>:<br/>• Default privacy: <strong style={{ color: "#ff6b6b" }}>Public</strong> (or Unlisted for testing)<br/>• Category: Science &amp; Technology<br/>These settings apply to events created from the admin.</>}
        </Step>
      </Section>

      <Tip>{isFr ? "La clé RTMP et l'URL de stream s'affichent dans ⚙️ Configuration une fois connecté. Utilisez-les pour les speakers qui préfèrent OBS, Zoom ou Teams à la place de Restream Studio." : "The RTMP key and stream URL appear in ⚙️ Configuration once connected. Use them for speakers who prefer OBS, Zoom, or Teams instead of Restream Studio."}</Tip>
    </div>
  );
}

function ChapterTeam({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "2 · Constituer l'équipe streaming" : "2 · Assemble the streaming team"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "Désigner le modérateur, les techniciens et les speakers pour chaque session — dans l'onglet Planification." : "Assign the moderator, technicians and speakers for each session — in the Planning tab."}
      </p>

      <Step n={1} title={isFr ? "Ouvrir l'onglet Planification session" : "Open the Session planning tab"}>
        {isFr
          ? <><Code>Admin → Live Streaming → 📅 Planification session</Code><br/>Cet onglet liste toutes les sessions et permet de configurer l&apos;équipe, les liens live et le lien studio pour chaque session.</>
          : <><Code>Admin → Live Streaming → 📅 Session planning</Code><br/>This tab lists all sessions and lets you configure the team, live links, and studio link for each session.</>}
      </Step>

      <Step n={2} title={isFr ? "Sélectionner la session cible" : "Select the target session"}>
        {isFr
          ? <>Choisissez la session dans la liste déroulante.<br/>La fiche de planification se charge automatiquement avec les données sauvegardées (si déjà configurée).</>
          : <>Select the session from the dropdown.<br/>The planning form loads automatically with saved data (if already configured).</>}
      </Step>

      <Step n={3} title={isFr ? "Désigner le ou les modérateurs" : "Designate the moderator(s)"}>
        {isFr
          ? <>Dans la section <strong style={{ color: "#fff" }}>Modérateurs</strong>, sélectionnez un ou plusieurs membres de l&apos;équipe EOCON.<br/>Ces personnes animeront le Q&A et géreront le timing de la session.</>
          : <>In the <strong style={{ color: "#fff" }}>Moderators</strong> section, select one or more EOCON team members.<br/>They will run the Q&A and manage session timing.</>}
        <Tip>{isFr ? "Le modérateur idéal comprend le sujet de la session et parle couramment la langue du speaker." : "The ideal moderator understands the session topic and speaks the speaker's language fluently."}</Tip>
      </Step>

      <Step n={4} title={isFr ? "Désigner le ou les techniciens" : "Designate the technician(s)"}>
        {isFr
          ? <>Dans la section <strong style={{ color: "#fff" }}>Techniciens</strong>, sélectionnez les membres de l&apos;équipe responsables du flux Restream et des overlays.<br/>Ces personnes auront la main sur Studio pendant le live.</>
          : <>In the <strong style={{ color: "#fff" }}>Technicians</strong> section, select the team members responsible for the Restream stream and overlays.<br/>They will control Studio during the live.</>}
      </Step>

      <Step n={5} title={isFr ? "Ajouter les panélistes / speakers extra" : "Add panelists / extra speakers"}>
        {isFr
          ? <>Pour un panel ou un atelier avec plusieurs intervenants, ajoutez les speakers supplémentaires dans la section <strong style={{ color: "#fff" }}>Panélistes</strong>.<br/>Les speakers principaux sont déjà attachés à la session via le pipeline CFP.</>
          : <>For a panel or workshop with multiple speakers, add them in the <strong style={{ color: "#fff" }}>Panelists</strong> section.<br/>Main speakers are already attached to the session via the CFP pipeline.</>}
      </Step>

      <Step n={6} title={isFr ? "Renseigner le lien Restream Studio (webinaire)" : "Enter the Restream Studio link (webinar)"}>
        {isFr
          ? <>Sur <Code>studio.restream.io</Code>, créez ou ouvrez votre session.<br/>Cliquez <strong style={{ color: "#fff" }}>Inviter des guests</strong> → copiez le lien d&apos;invitation guest.<br/>Collez-le dans le champ <strong style={{ color: "#fff" }}>Lien webinaire / studio invité</strong>.<br/>Ce lien sera inclus dans les emails d&apos;invitation speaker et modérateur.</>
          : <>On <Code>studio.restream.io</Code>, create or open your session.<br/>Click <strong style={{ color: "#fff" }}>Invite guests</strong> → copy the guest invite link.<br/>Paste it in the <strong style={{ color: "#fff" }}>Webinar / studio guest link</strong> field.<br/>This link will be included in speaker and moderator invitation emails.</>}
        <Info>{isFr ? "Le lien guest Restream est unique par session. Régénérez-le si une session est compromise." : "The Restream guest link is unique per session. Regenerate it if a session is compromised."}</Info>
      </Step>

      <Step n={7} title={isFr ? "Sauvegarder la planification" : "Save the planning"}>
        {isFr ? "Cliquez Sauvegarder. La configuration est mémorisée et rechargée automatiquement lors de la prochaine sélection de cette session." : "Click Save. The configuration is saved and reloaded automatically the next time this session is selected."}
      </Step>
    </div>
  );
}

function ChapterInvite({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "3 · Envoyer les invitations" : "3 · Send invitations"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "Un clic par personne. Chaque email est personnalisé selon le rôle." : "One click per person. Each email is personalized by role."}
      </p>

      <Step n={1} title={isFr ? "Envoyer l'invitation speaker" : "Send speaker invitation"}>
        {isFr
          ? <>Dans la section Équipe, cliquez <strong style={{ color: "#00ff9d" }}>Envoyer invitation</strong> à côté du speaker.<br/>L&apos;email contient :<br/>• Le lien Restream Studio (accès guest direct)<br/>• Le titre et l&apos;heure de sa session<br/>• Une checklist pré-live (caméra, micro, navigateur)<br/>• Le contact du technicien</>
          : <>In the Team section, click <strong style={{ color: "#00ff9d" }}>Send invitation</strong> next to the speaker.<br/>The email contains:<br/>• The Restream Studio link (direct guest access)<br/>• The session title and time<br/>• A pre-live checklist (camera, mic, browser)<br/>• The technician&apos;s contact info</>}
        <Tip>{isFr ? "Envoyez J-1 pour laisser le temps au speaker de tester. Renvoyez J-0 H-2h comme rappel." : "Send J-1 to give the speaker time to test. Resend J-0 H-2h as a reminder."}</Tip>
      </Step>

      <Step n={2} title={isFr ? "Envoyer le briefing modérateur" : "Send moderator briefing"}>
        {isFr
          ? <>Cliquez <strong style={{ color: "#00ff9d" }}>Envoyer invitation</strong> à côté du modérateur.<br/>L&apos;email contient :<br/>• Le lien Restream Studio (accès modérateur/co-host)<br/>• Le lien d&apos;accès à l&apos;interface Q&A de modération<br/>• L&apos;URL RTMP et la clé de stream (pour référence)<br/>• Le guide de son rôle (accueil, Q&A, timing, clôture)</>
          : <>Click <strong style={{ color: "#00ff9d" }}>Send invitation</strong> next to the moderator.<br/>The email contains:<br/>• The Restream Studio link (moderator/co-host access)<br/>• The Q&A moderation interface link<br/>• The RTMP URL and stream key (for reference)<br/>• Their role guide (welcome, Q&A, timing, close)</>}
      </Step>

      <Step n={3} title={isFr ? "Confirmer la réception" : "Confirm receipt"}>
        {isFr
          ? <>Demandez au speaker et au modérateur de confirmer la réception de leur email (WhatsApp ou signal).<br/>Si un email n&apos;arrive pas : vérifier les spams, ou copier le lien Restream manuellement.</>
          : <>Ask the speaker and moderator to confirm receipt of their email (WhatsApp or signal).<br/>If an email doesn&apos;t arrive: check spam, or copy the Restream link manually.</>}
        <Warn>{isFr ? "Ne partagez jamais la clé RTMP complète par email non sécurisé. La clé masquée dans l'email est suffisante pour référence." : "Never share the full RTMP key via unsecured email. The masked key in the email is sufficient for reference."}</Warn>
      </Step>

      <Step n="→" title={isFr ? "Speaker avec OBS / Zoom / Teams" : "Speaker using OBS / Zoom / Teams"}>
        {isFr
          ? <>Si le speaker préfère streamer depuis son propre outil vers Restream :<br/>1. Partagez-lui l&apos;URL RTMP complète + clé de stream (via canal sécurisé)<br/>2. Dans son outil : Paramètres → Streaming → RTMP → coller URL + clé<br/>3. Restream reçoit le flux RTMP et le redistribue vers YouTube<br/>4. Pas besoin de Restream Studio dans ce cas.</>
          : <>If the speaker prefers to stream from their own tool to Restream:<br/>1. Share the full RTMP URL + stream key (via secure channel)<br/>2. In their tool: Settings → Streaming → RTMP → paste URL + key<br/>3. Restream receives the RTMP stream and redistributes to YouTube<br/>4. Restream Studio is not needed in this case.</>}
        <Info>{isFr ? "Zoom, Meet et Teams permettent de streamer en RTMP. La qualité dépend de la connexion du speaker. Restream Studio est recommandé car il normalise la qualité et permet l'ajout d'overlays." : "Zoom, Meet, and Teams can stream via RTMP. Quality depends on the speaker's connection. Restream Studio is recommended as it normalizes quality and allows overlays."}</Info>
      </Step>
    </div>
  );
}

function ChapterStudio({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "4 · Restream Studio — accueil & préparation" : "4 · Restream Studio — welcome & prep"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "Gérer la salle virtuelle avant et pendant le live." : "Manage the virtual room before and during the live."}
      </p>

      <Step n={1} title={isFr ? "Ouvrir Restream Studio" : "Open Restream Studio"}>
        {isFr
          ? <>Allez sur <Code>studio.restream.io</Code> avec le compte EOCON.<br/>Créez un nouvel événement ou continuez un événement existant.<br/>Vérifiez que les destinations (YouTube, etc.) sont bien listées à droite.</>
          : <>Go to <Code>studio.restream.io</Code> with the EOCON account.<br/>Create a new event or continue an existing one.<br/>Verify that destinations (YouTube, etc.) are listed on the right.</>}
      </Step>

      <Step n={2} title={isFr ? "Inviter le speaker (guest link)" : "Invite the speaker (guest link)"}>
        {isFr
          ? <>Cliquez <strong style={{ color: "#fff" }}>+ Inviter</strong> en haut de l&apos;interface Studio.<br/>Sélectionnez <strong style={{ color: "#fff" }}>Guest link</strong> — c&apos;est le lien à envoyer au speaker.<br/>Le speaker clique → accès navigateur direct, sans compte Restream.</>
          : <>Click <strong style={{ color: "#fff" }}>+ Invite</strong> at the top of the Studio interface.<br/>Select <strong style={{ color: "#fff" }}>Guest link</strong> — this is the link to send to the speaker.<br/>The speaker clicks → direct browser access, no Restream account needed.</>}
        <Tip>{isFr ? "Jusqu'à 6 guests simultanés en plan gratuit. Pour les panels, passez en plan payant si besoin." : "Up to 6 simultaneous guests on the free plan. For panels, upgrade if needed."}</Tip>
      </Step>

      <Step n={3} title={isFr ? "Vérifier audio/vidéo du speaker" : "Check speaker audio/video"}>
        {isFr
          ? <>Une fois le speaker connecté, vérifiez dans le panneau :<br/>• 🎤 Micro actif (barre de niveau verte qui bouge)<br/>• 📷 Caméra active et image nette<br/>• 🌐 Connexion stable (indicateur vert)<br/>Demandez-lui de parler — vérifiez que vous l&apos;entendez clairement.</>
          : <>Once the speaker is connected, check in the panel:<br/>• 🎤 Mic active (green level bar moving)<br/>• 📷 Camera active and clear image<br/>• 🌐 Stable connection (green indicator)<br/>Ask them to speak — verify you hear them clearly.</>}
        <Warn>{isFr ? "Si le speaker a un écho : demandez-lui de mettre des écouteurs. Si la qualité vidéo est faible : vérifier la connexion (câble > WiFi)." : "If the speaker has echo: ask them to use headphones. If video quality is poor: check connection (cable > WiFi)."}</Warn>
      </Step>

      <Step n={4} title={isFr ? "Configurer les overlays (banières)" : "Set up overlays (banners)"}>
        {isFr
          ? <>Dans Studio → onglet <strong style={{ color: "#fff" }}>Overlays</strong> (ou Calques) :<br/>• <strong style={{ color: "#fff" }}>Lower third</strong> : nom et titre du speaker (ex: &quot;Jean Dupont — RSSI, Acme Corp&quot;)<br/>• <strong style={{ color: "#fff" }}>Logo EOCON</strong> : coin supérieur droit<br/>• <strong style={{ color: "#fff" }}>Titre de la session</strong> : affiché les 3 premières minutes<br/>Préparez-les <em>avant</em> le live, activez-les au bon moment.</>
          : <>In Studio → <strong style={{ color: "#fff" }}>Overlays</strong> (or Layers) tab:<br/>• <strong style={{ color: "#fff" }}>Lower third</strong>: speaker name and title (e.g., &quot;Jane Smith — CISO, Acme Corp&quot;)<br/>• <strong style={{ color: "#fff" }}>EOCON Logo</strong>: top right corner<br/>• <strong style={{ color: "#fff" }}>Session title</strong>: shown for the first 3 minutes<br/>Prepare them <em>before</em> the live, activate at the right time.</>}
      </Step>

      <Step n={5} title={isFr ? "Test stream en mode Preview" : "Test stream in Preview mode"}>
        {isFr
          ? <>Dans Studio → cliquez <strong style={{ color: "#fff" }}>Preview</strong> (pas Go Live encore).<br/>Vérifiez la qualité dans le preview player.<br/>Corrigez les problèmes avant de démarrer le live public.</>
          : <>In Studio → click <strong style={{ color: "#fff" }}>Preview</strong> (not Go Live yet).<br/>Check quality in the preview player.<br/>Fix any issues before starting the public live.</>}
      </Step>
    </div>
  );
}

function ChapterAdminConf({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "5 · Lier le live YouTube à la session" : "5 · Link the YouTube live to the session"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "Renseigner l'URL embed YouTube dans la session pour que les participants voient le live sur /live. L'admin propose deux méthodes automatiques." : "Set the YouTube embed URL on the session so participants see the live on /live. The admin offers two automatic methods."}
      </p>

      <Section title={isFr ? "MÉTHODE 1 — AUTO-DÉTECTION (recommandée)" : "METHOD 1 — AUTO-DETECT (recommended)"} color="#00ff9d">
        <Step n={1} title={isFr ? "Démarrer le stream dans Restream Studio (Preview ou Go Live)" : "Start the stream in Restream Studio (Preview or Go Live)"}>
          {isFr
            ? <>Dans Restream Studio, lancez en <strong style={{ color: "#fff" }}>Preview</strong> ou directement <strong style={{ color: "#ff4444" }}>Go Live</strong>.<br/>Restream crée automatiquement une diffusion YouTube et active son canal.</>
            : <>In Restream Studio, launch in <strong style={{ color: "#fff" }}>Preview</strong> or directly <strong style={{ color: "#ff4444" }}>Go Live</strong>.<br/>Restream automatically creates a YouTube broadcast and activates its channel.</>}
        </Step>

        <Step n={2} title={isFr ? "Cliquer ↗ Récupérer dans Planification session" : "Click ↗ Fetch in Session planning"}>
          {isFr
            ? <><Code>Admin → Live Streaming → 📅 Planification session → sélectionner la session</Code><br/>Dans le champ <strong style={{ color: "#fff" }}>Lien live YouTube (embed)</strong>, cliquez <strong style={{ color: "#00ff9d" }}>↗ Récupérer</strong>.<br/>Le système interroge l&apos;API Restream, détecte le canal YouTube en cours et renseigne automatiquement l&apos;URL embed.<br/>Un message de confirmation s&apos;affiche : <em>&quot;✓ URL récupérée (live en cours)&quot;</em> ou <em>&quot;✓ URL récupérée (événement Restream)&quot;</em>.</>
            : <><Code>Admin → Live Streaming → 📅 Session planning → select session</Code><br/>In the <strong style={{ color: "#fff" }}>YouTube live link (embed)</strong> field, click <strong style={{ color: "#00ff9d" }}>↗ Fetch</strong>.<br/>The system queries the Restream API, detects the active YouTube channel and automatically fills in the embed URL.<br/>A confirmation message appears: <em>&quot;✓ URL fetched (live in progress)&quot;</em> or <em>&quot;✓ URL fetched (Restream event)&quot;</em>.</>}
          <Tip>{isFr ? "Si le message dit «Aucun live actif détecté», c'est que Restream n'est pas encore en stream. Lancez Preview dans Studio d'abord." : "If the message says 'No active live detected', Restream is not streaming yet. Launch Preview in Studio first."}</Tip>
        </Step>

        <Step n={3} title={isFr ? "Sauvegarder la planification" : "Save the planning"}>
          {isFr ? "Cliquez Sauvegarder. L'URL est maintenant liée à la session — le player YouTube apparaîtra sur /live." : "Click Save. The URL is now linked to the session — the YouTube player will appear on /live."}
        </Step>
      </Section>

      <Section title={isFr ? "MÉTHODE 2 — CRÉER UN ÉVÉNEMENT RESTREAM" : "METHOD 2 — CREATE A RESTREAM EVENT"} color="#4488ff">
        <Step n="▸" title={isFr ? "Cliquer + Créer dans Planification session" : "Click + Create in Session planning"}>
          {isFr
            ? <>Dans le champ <strong style={{ color: "#fff" }}>Lien live YouTube</strong>, cliquez <strong style={{ color: "#4488ff" }}>+ Créer</strong>.<br/>Le système crée un nouvel événement Restream (non listé) au nom de la session sélectionnée.<br/>YouTube assigne un ID vidéo → l&apos;URL embed est générée et renseignée automatiquement.<br/>Utile pour préparer les sessions <strong style={{ color: "#fff" }}>à l&apos;avance</strong>, sans être en train de streamer.</>
            : <>In the <strong style={{ color: "#fff" }}>YouTube live link</strong> field, click <strong style={{ color: "#4488ff" }}>+ Create</strong>.<br/>The system creates a new (unlisted) Restream event named after the selected session.<br/>YouTube assigns a video ID → the embed URL is generated and filled in automatically.<br/>Useful to prepare sessions <strong style={{ color: "#fff" }}>in advance</strong>, without streaming yet.</>}
          <Info>{isFr ? "Cette méthode nécessite que le token Restream soit configuré et que le canal YouTube soit connecté dans restream.io." : "This method requires the Restream token to be configured and the YouTube channel to be connected in restream.io."}</Info>
        </Step>
      </Section>

      <Section title={isFr ? "MÉTHODE 3 — COPIE MANUELLE (fallback)" : "METHOD 3 — MANUAL COPY (fallback)"} color="#888">
        <Step n="▸" title={isFr ? "Via le widget 🔴 En direct" : "Via the 🔴 Live widget"}>
          {isFr
            ? <>Quand Restream est en live : <Code>Admin → 🔴 En direct</Code> → widget Restream → bouton <strong style={{ color: "#00ff9d" }}>📋 Copier embed YouTube</strong>.<br/>Copiez et collez dans le champ Lien live de la session (Planification).</>
            : <>When Restream is live: <Code>Admin → 🔴 Live</Code> → Restream widget → <strong style={{ color: "#00ff9d" }}>📋 Copy YouTube embed</strong> button.<br/>Copy and paste in the session&apos;s Live link field (Planning).</>}
        </Step>
        <Step n="▸" title={isFr ? "Via YouTube Studio (toujours dispo)" : "Via YouTube Studio (always available)"}>
          {isFr
            ? <>YouTube Studio → Diffusions → clic droit sur la vidéo → Partager → Intégrer → extraire l&apos;ID.<br/>Format attendu : <Code>https://www.youtube.com/embed/XXXXXXXXXXX</Code></>
            : <>YouTube Studio → Broadcasts → right-click video → Share → Embed → extract ID.<br/>Expected format: <Code>https://www.youtube.com/embed/XXXXXXXXXXX</Code></>}
          <Warn>{isFr ? "Ne collez pas le lien de la page YouTube mais l'URL embed (avec /embed/ dans l'URL). Sinon le player ne s'affichera pas sur /live." : "Don't paste the YouTube page link but the embed URL (with /embed/ in the URL). Otherwise the player won't display on /live."}</Warn>
        </Step>
      </Section>
    </div>
  );
}

function ChapterValidate({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "6 · Valider le flux côté participants" : "6 · Validate the stream for participants"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "Toujours tester en navigation privée — vous n'êtes pas connecté comme participant normal." : "Always test in incognito mode — you're not logged in as a regular participant."}
      </p>

      <Step n={1} title={isFr ? "Ouvrir /live en navigation privée" : "Open /live in incognito mode"}>
        {isFr
          ? <>Ouvrez un onglet de navigation privée (Ctrl+Maj+N sur Chrome).<br/>Allez sur <Code>/live</Code>.<br/>Connectez-vous avec un compte participant test (ou lien d&apos;accès test).</>
          : <>Open an incognito window (Ctrl+Shift+N on Chrome).<br/>Go to <Code>/live</Code>.<br/>Log in with a test participant account (or test access link).</>}
        <Tip>{isFr ? "Créez un compte participant test dans Admin → Registrations avec un email jetable. Envoyez-lui le lien d'accès." : "Create a test participant account in Admin → Registrations with a throwaway email. Send them the access link."}</Tip>
      </Step>

      <Step n={2} title={isFr ? "Vérifier l'affichage du player" : "Verify the player display"}>
        {isFr
          ? <>Le player YouTube doit s&apos;afficher. Si le stream est en preview (pas encore Go Live) :<br/>• Un placeholder s&apos;affiche (&quot;Le live n&apos;a pas encore commencé&quot;) — <strong style={{ color: "#00ff9d" }}>C&apos;est normal</strong><br/>Une fois Go Live lancé dans Studio, le player démarre automatiquement.<br/><br/>Si le player ne s&apos;affiche pas : vérifiez que l&apos;URL embed dans la session commence bien par <Code>https://www.youtube.com/embed/</Code></>
          : <>The YouTube player should display. If the stream is in preview (not yet Go Live):<br/>• A placeholder shows (&quot;Live hasn&apos;t started yet&quot;) — <strong style={{ color: "#00ff9d" }}>This is normal</strong><br/>Once Go Live is launched in Studio, the player starts automatically.<br/><br/>If the player doesn&apos;t appear: verify the session embed URL starts with <Code>https://www.youtube.com/embed/</Code></>}
      </Step>

      <Step n={3} title={isFr ? "Tester le Q&A" : "Test the Q&A"}>
        {isFr
          ? <>Depuis la page <Code>/live</Code> participant : posez une question de test (ex: &quot;Test technique&quot;).<br/>Dans l&apos;admin : <Code>🔴 En direct → Modération Q&A → En attente</Code><br/>La question doit apparaître. Testez :<br/>• Bouton <strong style={{ color: "#00ff9d" }}>✓ Approuver</strong> — la question passe à &quot;Approuvées&quot;<br/>• Bouton <strong style={{ color: "#4488ff" }}>✅ Répondue</strong> — elle passe à &quot;Répondues&quot;<br/>• Bouton <strong style={{ color: "#ff6b6b" }}>✕</strong> — suppression</>
          : <>From the <Code>/live</Code> participant page: submit a test question (e.g., &quot;Technical test&quot;).<br/>In admin: <Code>🔴 Live → Q&A Moderation → Pending</Code><br/>The question should appear. Test:<br/>• <strong style={{ color: "#00ff9d" }}>✓ Approve</strong> button — question moves to &quot;Approved&quot;<br/>• <strong style={{ color: "#4488ff" }}>✅ Answered</strong> button — moves to &quot;Answered&quot;<br/>• <strong style={{ color: "#ff6b6b" }}>✕</strong> button — delete</>}
      </Step>

      <Step n={4} title={isFr ? "Vérifier les statistiques" : "Check statistics"}>
        {isFr
          ? <>Dans <Code>🔴 En direct</Code>, les compteurs &quot;En ligne&quot; et &quot;Sessions actives&quot; doivent augmenter lors de votre test.<br/>Rafraîchissez avec le bouton <strong style={{ color: "#fff" }}>↺ Rafraîchir</strong> si nécessaire.</>
          : <>In <Code>🔴 Live</Code>, the &quot;Online&quot; and &quot;Active sessions&quot; counters should increase during your test.<br/>Refresh with the <strong style={{ color: "#fff" }}>↺ Refresh</strong> button if needed.</>}
      </Step>
    </div>
  );
}

function ChapterGoLive({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "7 · Go Live — démarrer le streaming" : "7 · Go Live — start streaming"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "Séquence de démarrage — dans cet ordre exact." : "Start sequence — in this exact order."}
      </p>

      <Step n={1} title={isFr ? "Briefing final (H-5 min)" : "Final briefing (H-5 min)"}>
        {isFr
          ? <>Confirmez avec le modérateur et le speaker :<br/>• Tout le monde est prêt et connecté dans Restream Studio<br/>• Overlays préparés (titre session, nom speaker)<br/>• Modérateur a l&apos;interface Q&A ouverte<br/>• Technicien a l&apos;admin ouvert sur <Code>🔴 En direct</Code></>
          : <>Confirm with the moderator and speaker:<br/>• Everyone is ready and connected in Restream Studio<br/>• Overlays prepared (session title, speaker name)<br/>• Moderator has the Q&A interface open<br/>• Technician has admin open on <Code>🔴 Live</Code></>}
      </Step>

      <Step n={2} title={isFr ? "Démarrer le stream dans Restream Studio" : "Start stream in Restream Studio"}>
        {isFr
          ? <>Dans Studio → cliquez le gros bouton <strong style={{ color: "#ff6b6b" }}>Go Live</strong> (ou &quot;Start Streaming&quot;).<br/>Attendez la confirmation de connexion des destinations (YouTube, etc.).<br/>Un compte à rebours de 5 secondes s&apos;affiche avant que le stream démarre.</>
          : <>In Studio → click the big <strong style={{ color: "#ff6b6b" }}>Go Live</strong> button (or &quot;Start Streaming&quot;).<br/>Wait for connection confirmation from destinations (YouTube, etc.).<br/>A 5-second countdown shows before the stream starts.</>}
        <Warn>{isFr ? "Ne fermez pas Restream Studio pendant le live — cela couperait immédiatement le stream." : "Don't close Restream Studio during the live — it would immediately cut the stream."}</Warn>
      </Step>

      <Step n={3} title={isFr ? "Vérifier le widget Restream dans l'admin" : "Check the Restream widget in admin"}>
        {isFr
          ? <>Dans <Code>Admin → 🔴 En direct</Code>, le widget Restream doit passer à <strong style={{ color: "#ff6b6b" }}>EN DIRECT</strong>.<br/>Les canaux actifs s&apos;affichent avec leur badge LIVE.<br/>Rafraîchissez si l&apos;état n&apos;est pas mis à jour (auto-refresh toutes les 30s).</>
          : <>In <Code>Admin → 🔴 Live</Code>, the Restream widget should show <strong style={{ color: "#ff6b6b" }}>LIVE</strong>.<br/>Active channels display with their LIVE badge.<br/>Refresh if state isn&apos;t updated (auto-refresh every 30s).</>}
      </Step>

      <Step n={4} title={isFr ? "Envoyer l'annonce broadcast" : "Send broadcast announcement"}>
        {isFr
          ? <>Dans <Code>🔴 En direct → Annonce broadcast</Code> :<br/>Tapez ex : &quot;🔴 La session [Titre] vient de démarrer ! Rejoignez le live sur /live&quot;<br/>Cochez &quot;Activer l&apos;annonce&quot; → Sauvegarder.<br/>Le message apparaît en banner sur la page /live de tous les participants connectés.</>
          : <>In <Code>🔴 Live → Broadcast announcement</Code>:<br/>Type e.g.: &quot;🔴 Session [Title] has just started! Join the live on /live&quot;<br/>Check &quot;Enable announcement&quot; → Save.<br/>The message appears as a banner on the /live page for all connected participants.</>}
        <Tip>{isFr ? "Attendez 30 secondes après Go Live pour que le stream YouTube soit stable avant d'envoyer le broadcast." : "Wait 30 seconds after Go Live for the YouTube stream to stabilize before sending the broadcast."}</Tip>
      </Step>

      <Step n={5} title={isFr ? "Modérateur : ouvrir la session" : "Moderator: open the session"}>
        {isFr
          ? <>Le modérateur, dans Restream Studio, accueille à voix haute :<br/><em>&quot;Bonjour et bienvenue à EOCON 2026. Je suis [Nom], votre modérateur pour cette session. Aujourd&apos;hui nous accueillons [Speaker]...&quot;</em><br/>Le speaker peut ensuite commencer sa présentation.</>
          : <>The moderator, in Restream Studio, verbally welcomes:<br/><em>&quot;Hello and welcome to EOCON 2026. I&apos;m [Name], your moderator for this session. Today we welcome [Speaker]...&quot;</em><br/>The speaker can then begin their presentation.</>}
      </Step>
    </div>
  );
}

function ChapterAnimate({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "8 · Animation pendant le live" : "8 · Managing the live session"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "Rôles partagés entre le technicien (overlays, flux) et le modérateur (Q&A, timing)." : "Roles shared between technician (overlays, stream) and moderator (Q&A, timing)."}
      </p>

      <Section title={isFr ? "CÔTÉ TECHNICIEN — RESTREAM STUDIO" : "TECHNICIAN — RESTREAM STUDIO"} color="#4488ff">
        <Step n="▸" title={isFr ? "Gestion des overlays (banières)" : "Overlay management (banners)"}>
          {isFr
            ? <>Studio → Overlays :<br/>• <strong style={{ color: "#fff" }}>Lower third</strong> : activer à l&apos;intro du speaker → désactiver après 2 min<br/>• <strong style={{ color: "#fff" }}>Slide de titre</strong> : afficher au début et après chaque pause<br/>• <strong style={{ color: "#fff" }}>Compteur</strong> : widget Timer → démarrer quand la session commence<br/>• <strong style={{ color: "#fff" }}>Alerte</strong> : &quot;5 minutes restantes&quot; → activer manuellement à H-5</>
            : <>Studio → Overlays:<br/>• <strong style={{ color: "#fff" }}>Lower third</strong>: activate at speaker intro → deactivate after 2 min<br/>• <strong style={{ color: "#fff" }}>Title slide</strong>: show at start and after each break<br/>• <strong style={{ color: "#fff" }}>Timer</strong>: Timer widget → start when session begins<br/>• <strong style={{ color: "#fff" }}>Alert</strong>: &quot;5 minutes remaining&quot; → activate manually at H-5</>}
        </Step>

        <Step n="▸" title={isFr ? "Gestion du flux" : "Stream management"}>
          {isFr
            ? <>Vérifiez régulièrement dans l&apos;admin :<br/>• Compteurs en ligne stables<br/>• Widget Restream : pas d&apos;alerte d&apos;erreur<br/>• Qualité vidéo dans le preview Studio<br/>En cas de coupure : vérifiez la connexion du speaker, relancez Studio si nécessaire.</>
            : <>Regularly check in admin:<br/>• Online counters stable<br/>• Restream widget: no error alerts<br/>• Video quality in Studio preview<br/>In case of disconnection: check speaker connection, relaunch Studio if needed.</>}
        </Step>
      </Section>

      <Section title={isFr ? "CÔTÉ MODÉRATEUR — Q&A ADMIN" : "MODERATOR — Q&A ADMIN"} color="#9b59ff">
        <Step n="▸" title={isFr ? "Surveiller les questions entrantes" : "Monitor incoming questions"}>
          {isFr
            ? <>Dans <Code>Admin → 🔴 En direct → Q&A → En attente</Code><br/>Les nouvelles questions apparaissent automatiquement (rafraîchissement manuel avec ↺).<br/>Lisez chaque question : est-elle pertinente, respectueuse, en lien avec le sujet ?</>
            : <>In <Code>Admin → 🔴 Live → Q&A → Pending</Code><br/>New questions appear automatically (manual refresh with ↺).<br/>Read each question: is it relevant, respectful, on-topic?</>}
        </Step>

        <Step n="▸" title={isFr ? "Approuver et poser les questions" : "Approve and ask questions"}>
          {isFr
            ? <>• Approuvez les bonnes questions avec <strong style={{ color: "#00ff9d" }}>✓ Approuver</strong><br/>• Choisissez le bon moment pour interrompre le speaker (pause, fin de slide)<br/>• Lisez la question à voix haute : <em>&quot;J&apos;ai une question de [Nom si renseigné] : ...&quot;</em><br/>• Après réponse : cliquez <strong style={{ color: "#4488ff" }}>✅ Répondue</strong></>
            : <>• Approve good questions with <strong style={{ color: "#00ff9d" }}>✓ Approve</strong><br/>• Choose the right moment to interrupt the speaker (pause, end of slide)<br/>• Read the question out loud: <em>&quot;I have a question from [Name if given]: ...&quot;</em><br/>• After answer: click <strong style={{ color: "#4488ff" }}>✅ Answered</strong></>}
          <Tip>{isFr ? "Regroupez les questions similaires. Annoncez au speaker combien de questions ont été soumises pour créer une dynamique." : "Group similar questions together. Tell the speaker how many questions were submitted to create momentum."}</Tip>
        </Step>
      </Section>
    </div>
  );
}

function ChapterEnd({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "9 · Fin de session & session suivante" : "9 · End session & next session"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "Clôturer proprement et enchaîner sans coupure visible." : "Close cleanly and transition without visible gaps."}
      </p>

      <Step n={1} title={isFr ? "H-5 min — Overlay \"5 minutes restantes\"" : "H-5 min — \"5 minutes remaining\" overlay"}>
        {isFr
          ? <>Technicien : activer l&apos;overlay &quot;5 min restantes&quot; dans Studio.<br/>Modérateur : signaler discrètement au speaker (chat privé Studio).</>
          : <>Technician: activate &quot;5 min remaining&quot; overlay in Studio.<br/>Moderator: signal discreetly to speaker (Studio private chat).</>}
      </Step>

      <Step n={2} title={isFr ? "Dernier Q&A et clôture" : "Last Q&A and close"}>
        {isFr
          ? <>Modérateur pose les 1-2 dernières questions.<br/>Puis : <em>&quot;Merci [Speaker], c&apos;était passionnant. Nous aurons une pause de X minutes avant la prochaine session...&quot;</em><br/>Technicien : activer overlay &quot;Merci !&quot; ou slide de transition.</>
          : <>Moderator asks the last 1-2 questions.<br/>Then: <em>&quot;Thank you [Speaker], that was fascinating. We&apos;ll have a X-minute break before the next session...&quot;</em><br/>Technician: activate &quot;Thank you!&quot; or transition slide overlay.</>}
      </Step>

      <Step n={3} title={isFr ? "Arrêter le stream" : "Stop the stream"}>
        {isFr
          ? <>Dans Restream Studio → <strong style={{ color: "#ff6b6b" }}>Stop Streaming</strong>.<br/>YouTube enregistre automatiquement la diffusion (disponible en replay).<br/>Dans l&apos;admin : le widget Restream passe à &quot;HORS LIGNE&quot;.</>
          : <>In Restream Studio → <strong style={{ color: "#ff6b6b" }}>Stop Streaming</strong>.<br/>YouTube automatically saves the broadcast (available as replay).<br/>In admin: the Restream widget switches to &quot;OFFLINE&quot;.</>}
      </Step>

      <Step n={4} title={isFr ? "Nettoyer le Q&A" : "Clean up Q&A"}>
        {isFr
          ? <>Dans <Code>🔴 En direct → Q&A</Code> :<br/>Approuvez ou supprimez les questions restantes en attente.<br/>Marquez comme &quot;Répondues&quot; les questions approuvées qui n&apos;ont pas eu le temps d&apos;être posées.</>
          : <>In <Code>🔴 Live → Q&A</Code>:<br/>Approve or delete remaining pending questions.<br/>Mark as &quot;Answered&quot; approved questions that didn&apos;t get asked.</>}
      </Step>

      <Step n={5} title={isFr ? "Préparer la session suivante" : "Prepare the next session"}>
        {isFr
          ? <>1. Dans Studio : déconnectez le speaker actuel et invitez le suivant<br/>2. Répétez la vérification audio/vidéo<br/>3. Créez un nouveau broadcast YouTube (ou réutilisez la même clé RTMP)<br/>4. Mettez à jour le <strong style={{ color: "#fff" }}>Lien live</strong> de la prochaine session dans l&apos;admin<br/>5. Envoyez un broadcast participants : &quot;Prochaine session dans X minutes : [Titre]&quot;</>
          : <>1. In Studio: disconnect current speaker and invite the next one<br/>2. Repeat audio/video check<br/>3. Create a new YouTube broadcast (or reuse the same RTMP key)<br/>4. Update the <strong style={{ color: "#fff" }}>Live link</strong> for the next session in admin<br/>5. Send participant broadcast: &quot;Next session in X minutes: [Title]&quot;</>}
        <Tip>{isFr ? "Si vous utilisez la même clé RTMP Restream, l'URL embed YouTube peut rester la même pour toutes les sessions de la journée — YouTube crée un seul stream continu." : "If you use the same Restream RTMP key, the YouTube embed URL can remain the same for all sessions of the day — YouTube creates one continuous stream."}</Tip>
      </Step>
    </div>
  );
}

function ChapterWorkshop({ isFr }: { isFr: boolean }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "10 · Ateliers — Rooms JaaS" : "10 · Workshops — JaaS Rooms"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "Les ateliers sont en P2P direct — pas de streaming YouTube." : "Workshops are direct P2P — no YouTube streaming."}
      </p>

      <Section title={isFr ? "CONFIGURATION (une seule fois)" : "SETUP (once)"} color="#9b59ff">
        <Step n={1} title={isFr ? "Obtenir les credentials JaaS" : "Get JaaS credentials"}>
          {isFr
            ? <>Allez sur <Code>8x8.vc/products/jaas</Code> → créez un compte gratuit.<br/>Récupérez : <strong style={{ color: "#fff" }}>App ID</strong> (vpaas-magic-cookie-xxxx), <strong style={{ color: "#fff" }}>API Key ID</strong>, <strong style={{ color: "#fff" }}>Clé privée RSA</strong>.<br/>Plan gratuit : jusqu&apos;à 200 rooms simultanées, 200 participants par room.</>
            : <>Go to <Code>8x8.vc/products/jaas</Code> → create a free account.<br/>Get: <strong style={{ color: "#fff" }}>App ID</strong> (vpaas-magic-cookie-xxxx), <strong style={{ color: "#fff" }}>API Key ID</strong>, <strong style={{ color: "#fff" }}>Private RSA Key</strong>.<br/>Free plan: up to 200 simultaneous rooms, 200 participants per room.</>}
        </Step>

        <Step n={2} title={isFr ? "Saisir les credentials dans l'admin" : "Enter credentials in admin"}>
          {isFr
            ? <><Code>Admin → Live Streaming → ⚙️ Configuration → Étape 2 : Ateliers JaaS</Code><br/>Renseignez App ID, API Key ID et la clé privée RSA → Sauvegarder.</>
            : <><Code>Admin → Live Streaming → ⚙️ Configuration → Step 2: JaaS Workshops</Code><br/>Enter App ID, API Key ID, and the RSA private key → Save.</>}
        </Step>

        <Step n={3} title={isFr ? "Créer les rooms workshop" : "Create workshop rooms"}>
          {isFr
            ? <>Bouton <strong style={{ color: "#9b59ff" }}>+ Ajouter workshop</strong>.<br/>Renseignez : Titre FR, Titre EN, Room ID (nom unique, ex: &quot;workshop-osint-2026&quot;).<br/>Cochez &quot;Actif&quot; pour le rendre visible sur <Code>/live</Code>.</>
            : <>Click <strong style={{ color: "#9b59ff" }}>+ Add workshop</strong>.<br/>Enter: Title FR, Title EN, Room ID (unique name, e.g. &quot;workshop-osint-2026&quot;).<br/>Check &quot;Active&quot; to make it visible on <Code>/live</Code>.</>}
          <Tip>{isFr ? "Utilisez des room IDs courts et descriptifs sans espaces ni caractères spéciaux. Ils sont permanents." : "Use short, descriptive room IDs without spaces or special characters. They are permanent."}</Tip>
        </Step>
      </Section>

      <Section title={isFr ? "PENDANT L'ATELIER" : "DURING THE WORKSHOP"} color="#9b59ff">
        <Step n="▸" title={isFr ? "Comment les participants rejoignent" : "How participants join"}>
          {isFr
            ? <>Sur <Code>/live</Code>, les ateliers actifs apparaissent avec un bouton <strong style={{ color: "#9b59ff" }}>Rejoindre</strong>.<br/>Clic → ouverture de la room JaaS directement dans le navigateur.<br/>Pas d&apos;application à installer. Caméra/micro demandés à l&apos;entrée.</>
            : <>On <Code>/live</Code>, active workshops appear with a <strong style={{ color: "#9b59ff" }}>Join</strong> button.<br/>Click → JaaS room opens directly in the browser.<br/>No app to install. Camera/mic requested on entry.</>}
        </Step>

        <Step n="▸" title={isFr ? "Rôle du formateur (moderator)" : "Trainer role (moderator)"}>
          {isFr
            ? <>Le formateur rejoint la même room avec le lien depuis l&apos;admin (ou directement via Jitsi).<br/>Il est automatiquement modérateur et peut :<br/>• Couper le micro des participants (bouton Silence all)<br/>• Exclure un participant si nécessaire<br/>• Partager son écran pour les démonstrations</>
            : <>The trainer joins the same room via the link from admin (or directly via Jitsi).<br/>They are automatically the moderator and can:<br/>• Mute participant microphones (Silence all button)<br/>• Remove a participant if needed<br/>• Share their screen for demos</>}
        </Step>

        <Warn>{isFr ? "Capacité recommandée : 30 participants max pour une bonne qualité. Au-delà, les ressources navigateur peuvent saturner. Prévoyez plusieurs rooms si l'atelier est populaire." : "Recommended capacity: 30 participants max for good quality. Beyond that, browser resources may get saturated. Plan multiple rooms if the workshop is popular."}</Warn>
      </Section>
    </div>
  );
}

function ChapterChecklist({ isFr }: { isFr: boolean }) {
  const checks = isFr ? [
    { group: "J-3 (3 jours avant)",  items: [
      "Équipe streaming affectée dans Admin → 📅 Planification session (modérateurs + techniciens)",
      "Lien Restream Studio (guest) renseigné dans la planification de chaque session",
      "Emails d'invitation envoyés (speaker + modérateur) depuis la planification",
      "Confirmation de réception vérifiée (WhatsApp / Signal)",
    ]},
    { group: "J-1 (veille)",          items: [
      "Test technique complet avec chaque speaker (30 min)",
      "Overlays préparés et testés dans Studio",
      "Workshops JaaS créés et testés (si applicable)",
      "Page /live testée avec compte participant test",
      "Lien live YouTube pré-créé via «+ Créer» dans Planification (optionnel mais recommandé)",
    ]},
    { group: "H-2h",                  items: [
      "Restream connecté, token valide (Admin → ⚙️ Configuration)",
      "YouTube Live activé et lié à Restream (canal visible dans widget 🔴 En direct)",
      "Studio ouvert, speaker de la 1ère session connecté",
    ]},
    { group: "H-30min",               items: [
      "Test stream en mode Preview dans Restream Studio",
      "Audio/vidéo speaker validé",
      "Overlays vérifiés (lower third, titre session, logo)",
    ]},
    { group: "H-15min",               items: [
      "URL embed YouTube récupérée via ↗ Récupérer dans Planification session (ou via bouton 📋 dans widget 🔴 En direct)",
      "Planification sauvegardée (point vert visible sur la session)",
      "Page /live testée en navigation privée — player YouTube visible",
    ]},
    { group: "H-10min",               items: [
      "Q&A testé (question test soumise et modérée)",
      "Annonce broadcast rédigée dans 🔴 En direct",
      "Modérateur confirmé en ligne dans Studio",
    ]},
    { group: "H-5min",                items: [
      "Briefing final équipe (speaker, modérateur, technicien)",
      "Lower third speaker prêt à activer",
      "Admin ouvert sur 🔴 En direct",
    ]},
    { group: "H-0 — GO LIVE",         items: [
      "Studio → Go Live !",
      "Attendre 30 secondes (stabilisation flux YouTube)",
      "Vérifier widget Restream : EN DIRECT + canal YouTube actif",
      "Activer lower third speaker dans Studio",
      "Envoyer broadcast participants («🔴 La session X démarre !»)",
    ]},
    { group: "Après chaque session",  items: [
      "Studio → Stop Streaming",
      "Q&A nettoyé (questions résiduelles approuvées ou supprimées)",
      "Prochain speaker invité dans Studio",
      "↗ Récupérer ou + Créer dans Planification pour la prochaine session",
      "Broadcast transition envoyé («Prochaine session dans X min : [Titre]»)",
    ]},
  ] : [
    { group: "D-3 (3 days before)",  items: [
      "Streaming team assigned in Admin → 📅 Session planning (moderators + technicians)",
      "Restream Studio guest link entered in each session's planning",
      "Invitation emails sent (speaker + moderator) from planning",
      "Receipt confirmed (WhatsApp / Signal)",
    ]},
    { group: "D-1 (day before)",      items: [
      "Full technical test with each speaker (30 min)",
      "Overlays prepared and tested in Studio",
      "JaaS workshops created and tested (if applicable)",
      "/live page tested with test participant account",
      "YouTube live link pre-created via '+ Create' in Planning (optional but recommended)",
    ]},
    { group: "H-2h",                  items: [
      "Restream connected, token valid (Admin → ⚙️ Configuration)",
      "YouTube Live active and linked to Restream (channel visible in 🔴 Live widget)",
      "Studio open, 1st session speaker connected",
    ]},
    { group: "H-30min",               items: [
      "Test stream in Preview mode in Restream Studio",
      "Speaker audio/video validated",
      "Overlays verified (lower third, session title, logo)",
    ]},
    { group: "H-15min",               items: [
      "YouTube embed URL fetched via ↗ Fetch in Session planning (or via 📋 button in 🔴 Live widget)",
      "Planning saved (green dot visible on session)",
      "/live page tested in incognito — YouTube player visible",
    ]},
    { group: "H-10min",               items: [
      "Q&A tested (test question submitted and moderated)",
      "Broadcast announcement drafted in 🔴 Live",
      "Moderator confirmed online in Studio",
    ]},
    { group: "H-5min",                items: [
      "Final team briefing (speaker, moderator, technician)",
      "Speaker lower third ready to activate",
      "Admin open on 🔴 Live",
    ]},
    { group: "H-0 — GO LIVE",         items: [
      "Studio → Go Live!",
      "Wait 30 seconds (YouTube stream stabilization)",
      "Check Restream widget: LIVE + YouTube channel active",
      "Activate speaker lower third in Studio",
      "Send participant broadcast ('🔴 Session X starting!')",
    ]},
    { group: "After each session",    items: [
      "Studio → Stop Streaming",
      "Q&A cleaned up (remaining questions approved or deleted)",
      "Next speaker invited in Studio",
      "↗ Fetch or + Create in Planning for the next session",
      "Transition broadcast sent ('Next session in X min: [Title]')",
    ]},
  ];

  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#fff", fontWeight: 900, marginBottom: 6, fontFamily: "'Courier New', monospace" }}>
        {isFr ? "📋 Checklist rapide" : "📋 Quick checklist"}
      </h2>
      <p style={{ color: "#666", fontSize: 12, marginBottom: 24 }}>
        {isFr ? "À imprimer ou garder ouverte le jour J." : "Print it or keep it open on event day."}
      </p>

      {checks.map(group => (
        <div key={group.group} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "#00ff9d", letterSpacing: 2, marginBottom: 8, fontFamily: "'Courier New', monospace" }}>{group.group.toUpperCase()}</div>
          {group.items.map(item => (
            <div key={item} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid #ffffff06" }}>
              <div style={{ width: 16, height: 16, border: "1px solid #ffffff30", borderRadius: 3, flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: "#aaa" }}>{item}</div>
            </div>
          ))}
        </div>
      ))}

      <Info>{isFr ? "Cette checklist est dans l'admin — pas besoin de l'imprimer. Gardez l'onglet guide ouvert en parallèle de l'interface Live pendant l'événement." : "This checklist is in the admin — no need to print. Keep the guide tab open alongside the Live interface during the event."}</Info>
    </div>
  );
}

// ── Chapter registry ───────────────────────────────────────────────────────────

const CHAPTERS = [
  { id: "overview",  icon: "🗺",  title: { fr: "Vue d'ensemble",                en: "Overview" } },
  { id: "restream",  icon: "🎬",  title: { fr: "1 · Configurer Restream",       en: "1 · Set up Restream" } },
  { id: "team",      icon: "👥",  title: { fr: "2 · Équipe streaming",          en: "2 · Streaming team" } },
  { id: "invite",    icon: "📨",  title: { fr: "3 · Invitations",               en: "3 · Send invitations" } },
  { id: "studio",    icon: "🎙",  title: { fr: "4 · Restream Studio",           en: "4 · Restream Studio" } },
  { id: "adminconf", icon: "⚙️",  title: { fr: "5 · Config session admin",      en: "5 · Admin session config" } },
  { id: "validate",  icon: "✅",  title: { fr: "6 · Valider le flux",           en: "6 · Validate stream" } },
  { id: "golive",    icon: "🔴",  title: { fr: "7 · Go Live",                   en: "7 · Go Live" } },
  { id: "animate",   icon: "🎭",  title: { fr: "8 · Animation",                 en: "8 · Live management" } },
  { id: "end",       icon: "🏁",  title: { fr: "9 · Fin & transition",          en: "9 · End & transition" } },
  { id: "workshop",  icon: "🎓",  title: { fr: "10 · Ateliers JaaS",            en: "10 · JaaS Workshops" } },
  { id: "checklist", icon: "📋",  title: { fr: "Checklist rapide",              en: "Quick checklist" } },
];

// ── Main export ────────────────────────────────────────────────────────────────

export default function StreamingGuide({ onClose }: { onClose: () => void }) {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [chapter, setChapter] = useState("overview");
  const isFr = lang === "fr";

  const renderChapter = () => {
    switch (chapter) {
      case "overview":  return <ChapterOverview isFr={isFr} />;
      case "restream":  return <ChapterRestream isFr={isFr} />;
      case "team":      return <ChapterTeam isFr={isFr} />;
      case "invite":    return <ChapterInvite isFr={isFr} />;
      case "studio":    return <ChapterStudio isFr={isFr} />;
      case "adminconf": return <ChapterAdminConf isFr={isFr} />;
      case "validate":  return <ChapterValidate isFr={isFr} />;
      case "golive":    return <ChapterGoLive isFr={isFr} />;
      case "animate":   return <ChapterAnimate isFr={isFr} />;
      case "end":       return <ChapterEnd isFr={isFr} />;
      case "workshop":  return <ChapterWorkshop isFr={isFr} />;
      case "checklist": return <ChapterChecklist isFr={isFr} />;
      default:          return null;
    }
  };

  const currentIdx = CHAPTERS.findIndex(c => c.id === chapter);
  const prev = currentIdx > 0 ? CHAPTERS[currentIdx - 1] : null;
  const next = currentIdx < CHAPTERS.length - 1 ? CHAPTERS[currentIdx + 1] : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000f0", zIndex: 2000, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: "#07070e", borderBottom: "2px solid #00ff9d30", padding: "12px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#00ff9d", letterSpacing: 3, fontFamily: "'Courier New', monospace" }}>{isFr ? "EOCON 2026 · DOCUMENTATION OPÉRATEUR" : "EOCON 2026 · OPERATOR DOCUMENTATION"}</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", fontFamily: "'Courier New', monospace", marginTop: 2 }}>
            {isFr ? "Guide Streaming — Technicien & Modérateur" : "Streaming Guide — Technician & Moderator"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["fr","en"] as const).map(l => (
            <button key={l} onClick={() => setLang(l)} style={{ padding: "5px 12px", borderRadius: 5, fontSize: 11, cursor: "pointer", background: lang === l ? "#00ff9d20" : "transparent", border: `1px solid ${lang === l ? "#00ff9d" : "#333"}`, color: lang === l ? "#00ff9d" : "#555", fontFamily: "'Courier New', monospace", letterSpacing: 1 }}>
              {l.toUpperCase()}
            </button>
          ))}
          <button onClick={onClose} style={{ padding: "5px 14px", borderRadius: 5, fontSize: 12, cursor: "pointer", background: "transparent", border: "1px solid #ffffff20", color: "#888", marginLeft: 8 }}>✕</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 210, background: "#050508", borderRight: "1px solid #ffffff08", overflowY: "auto", padding: "10px 0", flexShrink: 0 }}>
          {CHAPTERS.map(ch => (
            <button key={ch.id} onClick={() => setChapter(ch.id)} style={{
              width: "100%", textAlign: "left", background: chapter === ch.id ? "#00ff9d12" : "transparent",
              border: "none", borderLeft: `3px solid ${chapter === ch.id ? "#00ff9d" : "transparent"}`,
              padding: "9px 16px", cursor: "pointer", color: chapter === ch.id ? "#00ff9d" : "#666",
              fontSize: 11, display: "flex", alignItems: "center", gap: 8, lineHeight: 1.4,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{ch.icon}</span>
              <span>{isFr ? ch.title.fr : ch.title.en}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "30px 40px", background: "#08080f" }}>
          {renderChapter()}

          {/* Prev / Next */}
          <div style={{ display: "flex", gap: 12, marginTop: 36, paddingTop: 20, borderTop: "1px solid #ffffff08" }}>
            {prev && (
              <button onClick={() => setChapter(prev.id)} style={{ background: "transparent", border: "1px solid #ffffff20", color: "#888", padding: "8px 16px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
                ← {isFr ? prev.title.fr : prev.title.en}
              </button>
            )}
            <div style={{ flex: 1 }} />
            {next && (
              <button onClick={() => setChapter(next.id)} style={{ background: "#00ff9d15", border: "1px solid #00ff9d40", color: "#00ff9d", padding: "8px 20px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                {isFr ? next.title.fr : next.title.en} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
