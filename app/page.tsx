import { COMPETITION } from "@/config/scoring.config";

// Hall / lobby for the Mapon internal games. Each entry below is one game
// card - add new games here as they're built. "active" games link straight
// out to their live experience; "soon" entries render as locked placeholders
// so the hall visibly has room to grow. Colors lean on Mapon's own brand
// palette (blue/cyan/amber, config/tailwind.config.ts `mapon.*`) rather than
// the battle screen's arcade neon, so the hall itself reads more corporate.
type GameEntry = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  accent: string;
  href?: string;
  status: "active" | "soon";
};

const GAMES: GameEntry[] = [
  {
    id: "outbound-battle",
    name: "OUTBOUND BATTLE",
    tagline: `Temporada 1 · ${COMPETITION.startDate} → ${COMPETITION.endDate}`,
    icon: "🎮",
    color: "#0057FF",
    accent: "#33D6FF",
    href: "https://claude.ai/artifact/HGqUakYuZWj2pUN1ibNTKR?sk=uXXD_GQ0G2aM5c5czXF8Ug",
    status: "active",
  },
  {
    id: "coming-soon-1",
    name: "PRÓXIMAMENTE",
    tagline: "Nuevo juego en camino",
    icon: "🔒",
    color: "#8492c4",
    accent: "#8492c4",
    status: "soon",
  },
  {
    id: "coming-soon-2",
    name: "PRÓXIMAMENTE",
    tagline: "Nuevo juego en camino",
    icon: "🔒",
    color: "#8492c4",
    accent: "#8492c4",
    status: "soon",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center gap-10 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="font-pixel text-[10px] tracking-widest text-[#33D6FF] bg-[#0057FF]/10 border border-[#0057FF]/40 rounded-full px-4 py-2">
          MAPON SPAIN
        </span>
        <h1 className="font-display text-4xl sm:text-6xl text-white [-webkit-text-stroke:2px_#071a2e] drop-shadow-[0_6px_0_#0a3a52]">
          SALA DE <span className="text-[#33D6FF]">JUEGOS</span>
        </h1>
        <p className="font-mono-stat text-slate-400 text-sm max-w-md">
          elige una partida
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
        {GAMES.map((game) =>
          game.status === "active" ? (
            <a
              key={game.id}
              href={game.href}
              className="burst-panel game-panel rounded-2xl border px-6 py-8 flex flex-col items-center gap-3 transition-transform hover:scale-[1.03]"
              style={
                {
                  borderColor: `${game.color}55`,
                  background: `linear-gradient(160deg, ${game.color}1a, transparent)`,
                  "--panel-accent": game.accent,
                  "--burst-color": game.color,
                  "--burst-color-2": "#33D6FF",
                } as React.CSSProperties
              }
            >
              <span className="text-4xl">{game.icon}</span>
              <span className="font-display text-xl" style={{ color: game.accent }}>
                {game.name}
              </span>
              <span className="font-mono-stat text-[11px] text-slate-400">
                {game.tagline}
              </span>
              <span className="font-pixel text-[9px] tracking-widest text-[#FFB800] mt-2">
                ▶ JUGAR
              </span>
            </a>
          ) : (
            <div
              key={game.id}
              className="rounded-2xl border border-white/10 px-6 py-8 flex flex-col items-center gap-3 opacity-40"
            >
              <span className="text-4xl grayscale">{game.icon}</span>
              <span className="font-display text-xl text-slate-500">{game.name}</span>
              <span className="font-mono-stat text-[11px] text-slate-600">{game.tagline}</span>
            </div>
          )
        )}
      </div>
    </main>
  );
}
