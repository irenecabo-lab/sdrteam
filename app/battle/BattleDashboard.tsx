"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TEAMS, ownersByTeam, ownerById, targetFor, type TeamId } from "@/config/owners.config";
import { fleetTierFor, STAGE_TRANSITION_POINTS, TOCHA_BONUS_POINTS, TOCHA_MIN_FLEET_SIZE } from "@/config/scoring.config";
import { competitionDates } from "@/lib/date";
import { avatarFor } from "./Avatars";
import RefreshButton from "./RefreshButton";
import type { CompetitionState } from "@/lib/scoring/aggregate";

type DashboardState = Omit<CompetitionState, "fleetTierFor">;

const TEAM_IDS: TeamId[] = ["TEAM_1", "TEAM_2"];

function fmtEur(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function fmtDateShort(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(d);
}

function fmtTimestamp(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

function Bar({ pct, color }: { pct: number; color: string }) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${width}%`, background: color }} />
    </div>
  );
}

export default function BattleDashboard({ state }: { state: DashboardState }) {
  const [view, setView] = useState<"total" | "persdr">("total");

  const leader: TeamId | null =
    state.teams.TEAM_1.totalPoints === state.teams.TEAM_2.totalPoints
      ? null
      : state.teams.TEAM_1.totalPoints > state.teams.TEAM_2.totalPoints
      ? "TEAM_1"
      : "TEAM_2";

  const historyData = state.battleHistory.map((h) => ({
    date: fmtDateShort(h.date),
    "Team 1": h.teamPoints.TEAM_1,
    "Team 2": h.teamPoints.TEAM_2,
  }));

  return (
    <main className="min-h-screen pb-24">
      {/* header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-[#070b16]/85 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 font-mono-stat text-[10px] text-slate-500 hover:text-cyan-300 transition-colors mb-1.5"
            >
              ← Menú
            </Link>
            <span className="block font-pixel text-[9px] tracking-widest text-cyan-300">MAPON OUTBOUND BATTLE</span>
            <h1 className="font-display text-2xl sm:text-3xl text-white leading-none mt-1">
              🎮 SCOREBOARD <span className="text-cyan-300">EN VIVO</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right font-mono-stat text-xs text-slate-400">
              <div>
                {state.timeLeft.ended
                  ? "🏁 BATALLA FINALIZADA"
                  : `⏳ quedan ${state.timeLeft.days}d ${state.timeLeft.hours}h`}
              </div>
              <div className="text-[10px] text-slate-500">
                fuente: {state.source === "hubspot" ? "HubSpot" : "manual"} · actualizado{" "}
                {fmtTimestamp(state.generatedAt)}
              </div>
            </div>
            <RefreshButton />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* view toggle */}
        <div className="flex justify-center mt-8 mb-8">
          <div className="inline-flex rounded-full bg-white/5 border border-white/10 p-1 gap-1">
            {[
              { id: "total", label: "TOTAL" },
              { id: "persdr", label: "POR SDR" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setView(opt.id as typeof view)}
                className={`font-pixel text-[9px] tracking-widest rounded-full px-4 py-2 transition ${
                  view === opt.id ? "bg-cyan-400 text-[#071626]" : "text-slate-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* VS hero */}
        <section className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center mb-10">
          {TEAM_IDS.map((teamId, idx) => {
            const team = state.teams[teamId];
            const meta = TEAMS[teamId];
            const Avatar = avatarFor(teamId);
            const isLeader = leader === teamId;
            const rivalColor = teamId === "TEAM_1" ? TEAMS.TEAM_2.color : TEAMS.TEAM_1.color;
            return (
              <div
                key={teamId}
                className={`burst-panel relative rounded-2xl border p-6 overflow-hidden flex flex-col items-center text-center gap-3 animate-pop-in ${
                  idx === 1 ? "md:order-3" : ""
                } ${isLeader ? "animate-pulse-glow" : ""}`}
                style={
                  {
                    borderColor: `${meta.color}55`,
                    background: `linear-gradient(160deg, ${meta.color}14, transparent)`,
                    boxShadow: isLeader ? `0 0 30px ${meta.color}55` : undefined,
                    "--burst-color": meta.color,
                    "--burst-color-2": rivalColor,
                  } as CSSProperties
                }
              >
                {isLeader && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-pixel text-[9px] tracking-widest bg-amber-300 text-[#2b1c00] rounded-full px-3 py-1 z-10">
                    👑 EN CABEZA
                  </span>
                )}
                <Avatar className="w-20 h-20" />
                <div>
                  <div className="font-display text-xl text-white">{meta.name}</div>
                  <div className="text-sm text-slate-400">{meta.nickname}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {ownersByTeam(teamId).map((o) => o.name).join(" · ")}
                  </div>
                </div>
                <div className="font-mono-stat text-4xl font-bold" style={{ color: meta.color }}>
                  {team.totalPoints}
                  <span className="text-sm text-slate-400 ml-1">pts</span>
                </div>
                <div className="w-full">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>
                      Nv.{team.level} {team.name}
                    </span>
                    <span>{team.xp} XP</span>
                  </div>
                  <Bar pct={team.progressPct} color={meta.color} />
                </div>
              </div>
            );
          })}
          <div className="md:order-2 font-display text-3xl text-amber-300 text-center">VS</div>
        </section>

        {/* today's battle */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 mb-10 flex flex-wrap items-center justify-between gap-3">
          <div className="font-pixel text-[9px] tracking-widest text-amber-300 flex items-center gap-2">
            <span className="dot-live" />⚔ BATALLA DE HOY · {state.todayBattle.date}
          </div>
          <div className="flex items-center gap-6 font-mono-stat text-sm">
            <span style={{ color: TEAMS.TEAM_1.color }}>{TEAMS.TEAM_1.name}: {state.todayBattle.teamPoints.TEAM_1} pts</span>
            <span style={{ color: TEAMS.TEAM_2.color }}>{TEAMS.TEAM_2.name}: {state.todayBattle.teamPoints.TEAM_2} pts</span>
            <span className="text-slate-400">
              {state.todayBattle.winner ? `${TEAMS[state.todayBattle.winner].name} gana hoy` : "empate"}
            </span>
          </div>
        </section>

        {/* always-visible roster breakdown, right under the teams */}
        <MemberBreakdown state={state} />

        {view === "persdr" ? (
          <PerSdrTable state={state} />
        ) : (
          <>
            {/* stage route + KPI grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {TEAM_IDS.map((teamId) => {
                const team = state.teams[teamId];
                const meta = TEAMS[teamId];
                const tier = team.totals.biggestFleet > 0 ? fleetTierFor(team.totals.biggestFleet) : null;
                return (
                  <div
                    key={teamId}
                    className="game-panel burst-panel relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                    style={{ "--panel-accent": meta.color, "--burst-color": meta.color, "--burst-color-2": `${meta.color}00` } as CSSProperties}
                  >
                    <div className="font-display text-lg mb-3 text-center" style={{ color: meta.color }}>
                      {meta.name}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <Stat label="📞 Llamadas" value={team.totals.calls} sub={`${team.activity.completionPct.calls}% objetivo`} />
                      <Stat label="⏱ Minutos en conversación" value={team.totals.talkTimeMinutes} sub={`${team.activity.completionPct.talkTimeMinutes}% objetivo`} />
                      <Stat label="📅 Meetings agendadas" value={team.totals.meetingsBooked} sub={`${team.activity.completionPct.meetingsBooked}% objetivo`} />
                      <Stat label="✅ Meetings celebradas" value={team.totals.meetingsHeld} />
                      <Stat
                        label="🐘 Flota más grande"
                        value={team.totals.biggestFleet || "—"}
                        sub={tier ? `${tier.label} (+${tier.points})` : undefined}
                      />
                      <Stat label="💰 Pipeline generado" value={fmtEur(team.totals.pipelineEur)} />
                    </div>

                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">🗺 Ruta del pipeline</div>
                    <div className="space-y-1.5 mb-4">
                      {STAGE_TRANSITION_POINTS.map((rule, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{rule.label}</span>
                          <span className="font-mono-stat text-cyan-300">+{rule.points}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10 mt-1">
                        <span className="text-slate-300 font-semibold">Total conquistado en ruta</span>
                        <span className="font-mono-stat font-semibold" style={{ color: meta.color }}>
                          +{team.stagePoints}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">✨ Jugadas especiales</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-300">
                      <BonusLine label="🔥 Llamadas de calidad (+3min)" value={team.bonuses.qualityCallPoints} />
                      <BonusLine label="✅ Meetings celebradas" value={team.bonuses.meetingHeldPoints} />
                      <BonusLine label="⚡ Quick capture" value={team.bonuses.quickCapturePoints} />
                      <BonusLine label="🐾 Capturas de flota" value={team.bonuses.fleetCapturePoints} />
                      <BonusLine label="🐉 Boost empresas tochas" value={team.bonuses.tochaPoints} />
                      <BonusLine label="💰 Pipeline" value={team.bonuses.pipelinePoints} />
                    </div>
                  </div>
                );
              })}
            </section>

            {/* battle history chart */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-10">
              <div className="font-display text-lg text-white mb-4">📈 Historial de batalla</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#223055" />
                    <XAxis dataKey="date" stroke="#8492c4" fontSize={11} />
                    <YAxis stroke="#8492c4" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: "#0e1526", border: "1px solid #223055", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Team 1" stroke={TEAMS.TEAM_1.color} strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Team 2" stroke={TEAMS.TEAM_2.color} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}

        {/* biggest capture spotlight */}
        {state.biggestCapture && (
          <section
            className="game-panel burst-panel relative overflow-hidden rounded-2xl border border-amber-300/30 bg-amber-300/5 p-5 mb-10 flex items-center gap-4"
            style={{ "--panel-accent": "#ffcb47", "--burst-color": "#ffcb47", "--burst-color-2": "#ff9d3d" } as CSSProperties}
          >
            <span className="text-4xl">🏆</span>
            <div>
              <div className="font-pixel text-[9px] tracking-widest text-amber-300 mb-1">CAPTURA MÁS GRANDE</div>
              <div className="text-white">
                <span className="font-semibold">{state.biggestCapture.ownerName}</span>
                {" "}capturó{" "}
                <span className="font-semibold">{state.biggestCapture.meeting.companyName || "una cuenta"}</span>
                {" — "}
                <span className="font-mono-stat text-amber-300">{state.biggestCapture.meeting.fleetSize} vehículos</span>
                {(state.biggestCapture.meeting.fleetSize ?? 0) >= TOCHA_MIN_FLEET_SIZE && (
                  <span className="ml-2 text-xs text-rose-300">🐉 BOOST POR EMPRESAS TOCHAS (+{TOCHA_BONUS_POINTS})</span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* capture feed */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="font-display text-lg text-white mb-4">📡 Feed de capturas</div>
          {state.captureFeed.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay capturas registradas en la ventana de la competición.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {state.captureFeed.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 text-sm rounded-lg px-3 py-2 bg-white/[0.03] border-l-2"
                  style={{ borderColor: TEAMS[item.team].color }}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="flex-1 text-slate-200">{item.text}</span>
                  {item.points != null && (
                    <span className="font-mono-stat text-xs" style={{ color: TEAMS[item.team].color }}>
                      +{item.points}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono-stat whitespace-nowrap">{fmtTimestamp(item.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="font-mono-stat text-lg text-white">{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

function BonusLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-mono-stat text-slate-400">+{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="font-mono-stat text-sm text-white">{value}</div>
    </div>
  );
}

// Always-visible roster panel right under the team cards - who's doing what,
// person by person, regardless of which view (TOTAL/POR SDR) is
// selected below.
function MemberBreakdown({ state }: { state: DashboardState }) {
  const numDays = competitionDates().length;
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
      {TEAM_IDS.map((teamId) => {
        const meta = TEAMS[teamId];
        const Avatar = avatarFor(teamId);
        const rows = state.perSdr.filter((s) => s.team === teamId);
        const topCalls = Math.max(0, ...rows.map((r) => r.calls));
        return (
          <div
            key={teamId}
            className="game-panel burst-panel relative overflow-hidden rounded-2xl border p-4"
            style={
              {
                borderColor: `${meta.color}33`,
                "--panel-accent": meta.color,
                "--burst-color": meta.color,
                "--burst-color-2": `${meta.color}00`,
              } as CSSProperties
            }
          >
            <div className="space-y-3">
              {rows.map((r) => {
                const owner = ownerById(r.ownerId);
                const target = owner ? targetFor(owner) : null;
                const callsGoal = target ? target.calls * numDays : 0;
                const callsPct = callsGoal > 0 ? Math.round((r.calls / callsGoal) * 100) : 0;
                const barColor = callsPct >= 100 ? "#ffcb47" : callsPct >= 50 ? meta.color : "#ff9d3d";
                const isTop = r.calls > 0 && r.calls === topCalls;
                return (
                  <div key={r.ownerId} className="rounded-lg bg-white/[0.04] border border-white/5 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 font-semibold text-sm text-white">
                        <Avatar className="w-6 h-6 shrink-0" />
                        {r.name}
                        {isTop && <span title="Ritmo más alto del equipo">🥇</span>}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        objetivo: {target?.calls ?? 0} llamadas/día · {target?.meetingsBooked ?? 0} meetings/día
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center mb-2">
                      <MiniStat label="📞 Llamadas" value={r.calls} />
                      <MiniStat label="📅 Agendadas" value={r.meetingsBooked} />
                      <MiniStat label="✅ Celebradas" value={r.meetingsHeld} />
                      <MiniStat label="🐘 Flota máx." value={r.biggestFleet || "—"} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Bar pct={callsPct} color={barColor} />
                      <span className="font-mono-stat text-[10px] text-slate-400 w-8 text-right">{callsPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

const PER_SDR_COLUMNS: { key: string; label: string; align?: "right" }[] = [
  { key: "calls", label: "📞 Llamadas", align: "right" },
  { key: "talkTimeMinutes", label: "⏱ Min. hablados", align: "right" },
  { key: "qualityCalls", label: "🔥 Llam. de calidad", align: "right" },
  { key: "meetingsBooked", label: "📅 Agendadas", align: "right" },
  { key: "meetingsHeld", label: "✅ Celebradas", align: "right" },
  { key: "biggestFleet", label: "🐘 Flota máx.", align: "right" },
  { key: "pipelineEur", label: "💰 Pipeline", align: "right" },
];

function PerSdrTable({ state }: { state: DashboardState }) {
  return (
    // Full width, stacked (not side-by-side): each team's table has 8
    // columns, and squeezing two into a half-width column forced a lateral
    // scrollbar. Landscape/full-width per table avoids that entirely.
    <section className="grid grid-cols-1 gap-6 mb-10">
      {TEAM_IDS.map((teamId) => {
        const meta = TEAMS[teamId];
        const rows = state.perSdr.filter((s) => s.team === teamId).sort((a, b) => b.calls - a.calls);
        const topCallerId = rows[0]?.ownerId;
        return (
          <div
            key={teamId}
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: `${meta.color}33`, background: `linear-gradient(160deg, ${meta.color}0d, transparent)` }}
          >
            <div
              className="px-5 py-3 border-b flex items-center justify-between"
              style={{ borderColor: `${meta.color}33` }}
            >
              <span className="font-display text-lg" style={{ color: meta.color }}>
                {meta.name}
              </span>
              <span className="font-pixel text-[9px] tracking-widest text-slate-500">
                {rows.length} SDR{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] sm:text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 text-left bg-white/[0.03]">
                    <th className="py-2.5 pl-5 pr-3 font-pixel text-[8px] tracking-widest font-normal">SDR</th>
                    {PER_SDR_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        className="py-2.5 px-3 text-right font-pixel text-[8px] tracking-widest font-normal whitespace-nowrap"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr
                      key={r.ownerId}
                      className={`border-t border-white/5 text-slate-200 hover:bg-white/[0.03] transition-colors ${
                        idx % 2 === 1 ? "bg-white/[0.015]" : ""
                      }`}
                    >
                      <td className="py-2.5 pl-5 pr-3 font-medium whitespace-nowrap">
                        {r.name}
                        {r.ownerId === topCallerId && <span className="ml-1.5">🥇</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-stat">{r.calls}</td>
                      <td className="py-2.5 px-3 text-right font-mono-stat">{r.talkTimeMinutes}</td>
                      <td className="py-2.5 px-3 text-right font-mono-stat">{r.qualityCalls}</td>
                      <td className="py-2.5 px-3 text-right font-mono-stat">{r.meetingsBooked}</td>
                      <td className="py-2.5 px-3 text-right font-mono-stat">{r.meetingsHeld}</td>
                      <td className="py-2.5 px-3 text-right font-mono-stat">{r.biggestFleet || "—"}</td>
                      <td className="py-2.5 pl-3 pr-5 text-right font-mono-stat">{fmtEur(r.pipelineEur)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 text-slate-300 font-semibold" style={{ borderColor: `${meta.color}33` }}>
                    <td className="py-2.5 pl-5 pr-3 font-pixel text-[8px] tracking-widest text-slate-500">TOTAL</td>
                    <td className="py-2.5 px-3 text-right font-mono-stat">{rows.reduce((a, r) => a + r.calls, 0)}</td>
                    <td className="py-2.5 px-3 text-right font-mono-stat">
                      {rows.reduce((a, r) => a + r.talkTimeMinutes, 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-stat">
                      {rows.reduce((a, r) => a + r.qualityCalls, 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-stat">
                      {rows.reduce((a, r) => a + r.meetingsBooked, 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-stat">
                      {rows.reduce((a, r) => a + r.meetingsHeld, 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-stat">
                      {Math.max(0, ...rows.map((r) => r.biggestFleet || 0)) || "—"}
                    </td>
                    <td className="py-2.5 pl-3 pr-5 text-right font-mono-stat">
                      {fmtEur(rows.reduce((a, r) => a + r.pipelineEur, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
}
