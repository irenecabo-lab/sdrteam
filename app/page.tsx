import { COMPETITION } from "@/config/scoring.config";

// Hall / lobby for the Mapon internal games. Matches Mapon's actual internal
// brand style (per the Kahoot design brief she shared): near-black slate
// #1F292F, one confident lime green #98CA02 (secondary #65B200) as the only
// accent, clean sans-serif type, no emoji, no arcade/pixel styling. Add new
// games to GAMES as they're built; "soon" entries render as locked
// placeholders so the hall visibly has room to grow. Each game gets its own
// accent color so cards read as distinct products under one shared shell.
type GameEntry = {
  id: string;
  eyebrow: string;
  name: string;
  tagline: string;
  accent: string;
  href?: string;
  status: "active" | "soon";
};

const GAMES: GameEntry[] = [
  {
    id: "outbound-battle",
    eyebrow: "Competición · Equipo SDR",
    name: "Outbound Battle",
    tagline: `Temporada 1 · ${COMPETITION.startDate} → ${COMPETITION.endDate}`,
    accent: "#98CA02",
    href: "https://claude.ai/artifact/HGqUakYuZWj2pUN1ibNTKR?sk=uXXD_GQ0G2aM5c5czXF8Ug",
    status: "active",
  },
  {
    id: "coming-soon-1",
    eyebrow: "Próximamente",
    name: "Nuevo juego",
    tagline: "En camino",
    accent: "#8492c4",
    status: "soon",
  },
  {
    id: "coming-soon-2",
    eyebrow: "Próximamente",
    name: "Nuevo juego",
    tagline: "En camino",
    accent: "#8492c4",
    status: "soon",
  },
];

export default function Home() {
  return (
    <main
      className="min-h-screen relative overflow-hidden px-6 py-12 sm:py-16"
      style={{ background: "#1F292F" }}
    >
      <div
        className="pointer-events-none absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full opacity-[0.07]"
        style={{ background: "#98CA02", filter: "blur(70px)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-52 -left-40 w-[420px] h-[420px] rounded-full opacity-[0.05]"
        style={{ background: "#65B200", filter: "blur(70px)" }}
      />

      <div className="relative max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-14">
          <span className="text-lg font-bold tracking-tight text-white">
            map<span style={{ color: "#98CA02" }}>o</span>n
          </span>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">
            Mapon Spain · Concursos internos
          </span>
        </div>

        <div className="mb-12">
          <span className="inline-block text-[11px] font-semibold tracking-widest uppercase text-[#98CA02] bg-[#98CA02]/10 border border-[#98CA02]/30 rounded-full px-3 py-1 mb-5">
            Sala de juegos
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight max-w-xl">
            Elige a qué <span style={{ color: "#98CA02" }}>jugamos</span>
          </h1>
          <p className="text-slate-400 text-sm mt-3 max-w-md">
            Los concursos internos del equipo, todos en un mismo sitio.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {GAMES.map((game) =>
            game.status === "active" ? (
              <a
                key={game.id}
                href={game.href}
                className="rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-colors p-6 flex flex-col gap-3 text-left"
              >
                <span
                  className="text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: game.accent }}
                >
                  {game.eyebrow}
                </span>
                <span className="text-xl font-bold text-white">{game.name}</span>
                <span className="text-[13px] text-slate-400 flex-1">{game.tagline}</span>
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase"
                  style={{ color: game.accent }}
                >
                  Jugar <span aria-hidden>→</span>
                </span>
              </a>
            ) : (
              <div
                key={game.id}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 flex flex-col gap-3 opacity-50"
              >
                <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-600">
                  {game.eyebrow}
                </span>
                <span className="text-xl font-bold text-slate-500">{game.name}</span>
                <span className="text-[13px] text-slate-600 flex-1">{game.tagline}</span>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}
