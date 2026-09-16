import Link from "next/link";
import { COMPETITION } from "@/config/scoring.config";

// This is a minimal index for the deployed app itself. The full pixel-art
// "rules of the game" landing (team reveal, KPI breakdown, route map) lives
// as its own published page - see README.md for the link - so it isn't
// duplicated here. This index just gets anyone who opens the deployed app
// straight to the live scoreboard.
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center">
      <span className="font-pixel text-[10px] tracking-widest text-cyan-300 bg-cyan-950/60 border border-cyan-400/40 rounded-full px-4 py-2">
        TEMPORADA 1 · SPAIN OUTBOUND LEAGUE
      </span>
      <h1 className="font-display text-4xl sm:text-6xl text-white [-webkit-text-stroke:2px_#071a2e] drop-shadow-[0_6px_0_#0a3a52]">
        MAPON OUTBOUND <span className="text-cyan-300">BATTLE</span>
      </h1>
      <p className="font-mono-stat text-amber-300 tracking-widest text-sm">
        {COMPETITION.startDate} → {COMPETITION.endDate}
      </p>
      <Link
        href="/battle"
        className="font-display text-lg bg-amber-300 text-[#2b1c00] rounded-full px-8 py-4 shadow-[0_0_0_1px_rgba(255,203,71,0.6),0_0_30px_rgba(255,203,71,0.4)]"
      >
        🎮 ENTRAR AL SCOREBOARD
      </Link>
      <a href="https://claude.ai/artifact/HGqUakYuZWj2pUN1ibNTKR" target="_blank" rel="noopener" className="font-pixel text-[10px] tracking-widest text-cyan-300 underline underline-offset-4">
              📖 VER LAS REGLAS COMPLETAS
      </a>
    </main>
  );
}
