import { COMPETITION } from "@/config/scoring.config";

// Hall / lobby for the Mapon internal games. The hall shell itself
// (background, header, type) uses Mapon's own corporate look - dark green,
// plain body typography, no arcade styling - so it reads as an official
// Mapon space. Each game card below keeps its OWN visual identity instead
// (colors, fonts): this is a hall of different games, so every game we add
// here should look different from the others and from the shell around it.
// Add new games to GAMES as they're built; "soon" entries render as locked
// placeholders so the hall visibly has room to grow.
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
    color: "#2be3ff",
    accent: "#2be3ff",
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
    <main
      className="min-h-screen flex flex-col items-center gap-10 px-6 py-16 text-center"
      style={{
        background:
          "radial-gradient(ellipse 1100px 600px at 50% -10%, #0f3a28 0%, transparent 60%), #04120c",
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-[#25D07A] bg-[#25D07A]/10 border border-[#25D07A]/40 rounded-full px-4 py-2">
          Mapon Spain
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white">
          Sala de <span className="text-[#25D07A]">juegos</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-md">elige una partida</p>
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
                  background: `linear-gradient(160deg, ${game.color}1f, transparent), #0a1420`,
                  "--panel-accent": game.accent,
                  "--burst-color": game.color,
                  "--burst-color-2": "#ff3d7f",
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
              <span className="font-pixel text-[9px] tracking-widest text-amber-300 mt-2">
                ▶ JUGAR
              </span>
            </a>
          ) : (
            <div
              key={game.id}
              className="rounded-2xl border border-white/10 px-6 py-8 flex flex-col items-center gap-3 opacity-40"
            >
              <span className="text-4xl grayscale">{game.icon}</span>
              <span className="text-xl font-semibold text-slate-500">{game.name}</span>
              <span className="text-[11px] text-slate-600">{game.tagline}</span>
            </div>
          )
        )}
      </div>
    </main>
  );
}
