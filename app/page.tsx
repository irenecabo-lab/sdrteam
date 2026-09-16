import { COMPETITION } from "@/config/scoring.config";

// Hall / lobby for the Mapon internal games. Header nav, pill badge and
// typography stay Mapon-branded (slate #1F292F + lime #98CA02, per the
// Kahoot design brief). The active game's own card keeps its original
// arcade identity (cyan neon burst-panel, font-display/font-pixel) so it
// reads as its own product, distinct from the hall shell around it and
// from the plain "coming soon" placeholders. Real Mapon wordmark lives at
// /public/mapon-logo.png (transparent bg, on a white pill so the dark
// logo stays legible on the dark shell).
type GameEntry = {
  id: string;
  eyebrow: string;
  name: string;
  tagline: string;
  href?: string;
  status: "active" | "soon";
};

const GAMES: GameEntry[] = [
  {
    id: "outbound-battle",
    eyebrow: "Competición · Equipo SDR",
    name: "Outbound Battle",
    tagline: `Temporada 1 · ${COMPETITION.startDate} → ${COMPETITION.endDate}`,
    href: "https://claude.ai/artifact/HGqUakYuZWj2pUN1ibNTKR?sk=uXXD_GQ0G2aM5c5czXF8Ug",
    status: "active",
  },
  {
    id: "coming-soon-1",
    eyebrow: "Próximamente",
    name: "Nuevo juego",
    tagline: "En camino",
    status: "soon",
  },
  {
    id: "coming-soon-2",
    eyebrow: "Próximamente",
    name: "Nuevo juego",
    tagline: "En camino",
    status: "soon",
  },
];

export default function Home() {
  const activeGames = GAMES.filter((g) => g.status === "active");
  const soonGames = GAMES.filter((g) => g.status === "soon");

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
          <span className="inline-flex items-center bg-white rounded-md px-2.5 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mapon-logo.png" alt="Mapon" className="h-5 w-auto block" />
          </span>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">
            Mapon Spain · Concursos internos
          </span>
        </div>

        <div className="flex flex-col items-center text-center mb-14">
          <span className="inline-block text-[11px] font-semibold tracking-widest uppercase text-[#98CA02] bg-[#98CA02]/10 border border-[#98CA02]/30 rounded-full px-3 py-1 mb-5">
            Game hall
          </span>
          <p className="text-slate-400 text-sm max-w-md">
            Los concursos internos del equipo, todos en un mismo sitio.
          </p>
        </div>

        {/* Main entrance: the active game(s), centered like a hall's front door.
           Each keeps its own arcade identity (cyan neon, burst rays) rather
           than matching the hall's lime/slate shell - it's its own game. */}
        <div className="flex flex-wrap justify-center gap-5 mb-12">
          {activeGames.map((game) => (
            <a
              key={game.id}
              href={game.href}
              className="game-panel burst-panel relative w-full max-w-sm rounded-2xl border-2 overflow-hidden px-8 py-10 flex flex-col items-center text-center gap-3 transition-transform hover:scale-[1.02]"
              style={
                {
                  borderColor: "#2be3ff55",
                  background: "linear-gradient(160deg, #2be3ff14, #0e1526)",
                  "--panel-accent": "#2be3ff",
                  "--burst-color": "#2be3ff",
                  "--burst-color-2": "#ff3d7f",
                } as React.CSSProperties
              }
            >
              <span className="text-5xl">🎮</span>
              <span className="font-display text-2xl sm:text-3xl text-[#2be3ff] [-webkit-text-stroke:1px_#071a2e] drop-shadow-[0_4px_0_#0a3a52]">
                {game.name.toUpperCase()}
              </span>
              <span className="font-mono-stat text-[12px] text-slate-400">{game.tagline}</span>
              <span className="font-display text-base text-amber-300 mt-2 inline-flex items-center gap-1.5">
                ▶ JUGAR
              </span>
            </a>
          ))}
        </div>

        {/* Side doors: what's coming next, smaller and centered underneath */}
        {soonGames.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-600">
              Próximamente
            </span>
            <div className="flex flex-wrap justify-center gap-4">
              {soonGames.map((game) => (
                <div
                  key={game.id}
                  className="w-44 rounded-xl border border-white/5 bg-white/[0.02] p-5 flex flex-col gap-2 opacity-50"
                >
                  <span className="text-xl font-bold text-slate-500">{game.name}</span>
                  <span className="text-[12px] text-slate-600">{game.tagline}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
