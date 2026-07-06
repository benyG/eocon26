import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/adminPermissions";
import { getOpenAI, getEoconContext } from "@/lib/openai";
import { getCtaForContentType, getEventSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

interface PostsResult {
  linkedin_fr: string;
  linkedin_en: string;
  twitter_fr: string;
  twitter_en: string;
  instagram_fr: string;
  instagram_en: string;
  facebook_fr: string;
  facebook_en: string;
  whatsapp_fr: string;
  whatsapp_en: string;
}

export async function POST(req: NextRequest) {
  if (!(await hasPermission("communication", "write"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { brief, contextType, contextItem } = await req.json() as { brief: string; contextType?: string; contextItem?: Record<string, unknown> };
  if (!brief) return NextResponse.json({ error: "Missing brief" }, { status: 400 });

  let contextSection = "";
  if (contextType && contextItem) {
    contextSection = `\nContexte spécifique : ${contextType} — ${JSON.stringify(contextItem)}`;
  }

  const [eoconCtx, settings] = await Promise.all([getEoconContext(), getEventSettings()]);
  const cta = getCtaForContentType(contextType || "custom", settings);

  // Build the full CTA reference block — all authorized URLs
  const allCtas = [
    { label: "Inscriptions", url: settings.url_inscription },
    { label: "CFP", url: settings.url_cfp },
    { label: "CTF / EyesOpenCTF", url: settings.url_ctf },
    { label: "Programme", url: settings.url_programme },
    { label: "Partenariat sponsor", url: settings.url_sponsor },
  ].filter(c => c.url);

  let openai;
  try {
    openai = getOpenAI();
  } catch (e) {
    return NextResponse.json(
      { error: `Clé OpenAI manquante ou invalide : ${e instanceof Error ? e.message : String(e)}` },
      { status: 503 }
    );
  }

  // The CTA for this content type is mandatory when configured — per-language instruction
  const ctaInstruction = cta
    ? `\n🔗 CTA IMPOSÉ — tu DOIS terminer chaque post par le CTA exact correspondant à la langue du post. :\n  • Posts en français : "${cta.text}" → ${cta.url}\n  • Posts en anglais : "${cta.textEn}" → ${cta.url}\nN'utilise AUCUNE autre URL EOCON. N'invente rien. Ce lien et ce libellé (dans la bonne langue) uniquement.`
    : `\nAucun CTA configuré pour ce type de contenu. N'invente aucune URL liée à l'événement EOCON.`;

  const prompt = `${eoconCtx}${contextSection ? "\n" + contextSection : ""}
${ctaInstruction}

Tu es la voix d'EOCON.
Tu n'écris pas pour promouvoir une simple conférence. Tu écris pour incarner un mouvement cyber africain, une plateforme internationale, un rendez-vous stratégique pour celles et ceux qui veulent compter dans la cybersécurité.
Positionnement central :
EOCON est l'évènement bilingue d'une semaine qui connecte talents, experts,  professionnels, entreprises, décideurs et chercheurs pour accélérer la cybersécurité dans le monde et particulièrement en Afrique.

Phrase de référence disponible :
"Where Africa secures the future."

Axes éditoriaux prioritaires :
1. EOCON comme carrefour cyber bilingue : francophone, anglophone, international et africain en particulier, 15+ pays, accessibilité en ligne.
2. EOCON comme plateforme d'opportunités : apprendre, recruter, networker, se rendre visible, créer des collaborations.
3. EOCON comme espace de crédibilité technique : workshops, compétition CTF, experts, pratiques concrètes, montée en compétence.
4. EOCON comme mouvement d'écosystème : entreprises, institutions, étudiants, professionnels, communautés techniques.
5. EOCON comme rendez-vous stratégique africain à Douala, au cœur du hub économique de l'Afrique centrale.
6. EOCON comme dynamique durable : 7e édition, communauté établie, plateforme construite pour le long terme.

Règles éditoriales :
— Ne jamais réduire EOCON à une simple conférence.
— Ne jamais vendre uniquement des talks, des speakers ou un programme.
— Toujours vendre l'accès à une communauté de talents, à des opportunités, à un écosystème, à un moment important.
— Faire sentir que rater EOCON, c'est rater un signal fort dans l'évolution de la cybersécurité africaine, voir internationale.
— Le ton doit être ambitieux, visionnaire, premium, inspirant et concret.
— Éviter les formulations génériques comme "ne manquez pas cet événement exceptionnel".
— Éviter le langage corporate froid.
— Ne pas exagérer avec des promesses non prouvées.
— Ne pas inventer de chiffres, de noms, de sponsors, de speakers ou de partenaires.
— Utiliser les chiffres uniquement s'ils sont présents dans le contexte fourni.
— Adapter naturellement la langue, la culture et le ton à chaque plateforme.

À partir du brief suivant, génère des posts optimisés pour chaque réseau social.

Brief: ${brief}

Règles de format, Contraintes par réseau :

LinkedIn :
- 200 à 300 mots.
- Ton professionnel, stratégique et inspirant.
- Storytelling autour du mouvement EOCON.
- Mettre en avant l'écosystème, les talents, les décideurs et l'impact africain.
- Hashtags avant le CTA.
- Terminer par le CTA imposé.

Twitter/X :
- 260 caractères maximum, CTA inclus.
- Message direct, mémorable et percutant.
- 2 à 3 hashtags maximum.
- Hashtags avant le CTA.
- Terminer par le CTA imposé.
- Si le CTA rend les 260 caractères impossibles, prioriser le CTA et produire le message le plus court possible.

Instagram :
- 150 mots maximum.
- Ton visuel, émotionnel, engageant.
- Créer un sentiment d'appartenance et d'urgence.
- 8 à 10 hashtags variés.
- Hashtags avant le CTA.
- Terminer par le CTA imposé.

Facebook :
- 100 à 200 mots.
- Ton communautaire, chaleureux et engageant, adapté à une page événementielle.
- Favoriser l'interaction : poser une question ou inviter à partager.
- 4 à 6 hashtags pertinents.
- Hashtags avant le CTA.
- Terminer par le CTA imposé.

WhatsApp :
- 50 à 100 mots maximum — message court, direct et conversationnel.
- Commence par une accroche émoji percutante (ex: 🔐 🚀 🌍).
- Pas de hashtags.
- Ton chaleureux, humain et communautaire, comme un message entre membres.
- Une seule phrase d'appel à l'action claire à la fin.
- Terminer par le CTA imposé (lien direct).

Hashtags recommandés selon le contexte :
- Général: #EOCON2026, #EOCON, #EyesOpenSecurity, #SecureTheFuture, 
- Cyber: #Cybersecurity, #InfoSec, #CyberSecurityAfrica, #AppSec, #CloudSecurity
- CTF: #CTF, #EyesOpenCTF, #CaptureTheFlag, #EthicalHacking, #RedTeam, #BlueTeam, 
- Afrique : #AfricaTech, #DigitalAfrica, #AfricaCybersecurity, #TechAfrica
- Cameroun: #CameroonTech, #Douala, #Cameroun, #DigitalCameroon, 
- Business: #DigitalTransformation, #CyberRisk, #GRC, #Innovation, #TechLeadership
- Étudiants: #StudentsInTech, #WomenInCyber, #CyberTalent, #TechCareers

Réponds en JSON uniquement, sans markdown :
{
  "linkedin_fr": "...",
  "linkedin_en": "...",
  "twitter_fr": "...",
  "twitter_en": "...",
  "instagram_fr": "...",
  "instagram_en": "...",
  "facebook_fr": "...",
  "facebook_en": "...",
  "whatsapp_fr": "...",
  "whatsapp_en": "..."
}`;

  let response;
  try {
    response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Erreur API OpenAI : ${msg}` }, { status: 502 });
  }

  const text = response.choices[0]?.message?.content || "{}";
  let posts: PostsResult;
  try {
    posts = JSON.parse(text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()) as PostsResult;
  } catch {
    return NextResponse.json({ error: `Réponse IA non parsable. Réessayez ou vérifiez la clé OpenAI.\n\nRéponse brute : ${text.slice(0, 300)}` }, { status: 500 });
  }

  // Save to DB
  const platforms: Array<{ platform: string; lang: string; content: string }> = [
    { platform: "linkedin", lang: "fr", content: posts.linkedin_fr },
    { platform: "linkedin", lang: "en", content: posts.linkedin_en },
    { platform: "twitter", lang: "fr", content: posts.twitter_fr },
    { platform: "twitter", lang: "en", content: posts.twitter_en },
    { platform: "instagram", lang: "fr", content: posts.instagram_fr },
    { platform: "instagram", lang: "en", content: posts.instagram_en },
    { platform: "facebook", lang: "fr", content: posts.facebook_fr },
    { platform: "facebook", lang: "en", content: posts.facebook_en },
    { platform: "whatsapp", lang: "fr", content: posts.whatsapp_fr },
    { platform: "whatsapp", lang: "en", content: posts.whatsapp_en },
  ];

  // Create records individually so we can return the IDs (createMany doesn't return them)
  const created = await Promise.all(
    platforms.map(p => prisma.socialPost.create({ data: { brief, ...p } }))
  );
  const idMap: Record<string, number> = {};
  for (const r of created) { idMap[`${r.platform}_${r.lang}`] = r.id; }

  return NextResponse.json({ ...posts, _ids: idMap });
}

export async function GET() {
  if (!(await hasPermission("communication", "read"))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const posts = await prisma.socialPost.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json(posts);
}
