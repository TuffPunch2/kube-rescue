"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Satellite,
  LogOut,
  Activity,
  Map as MapIcon,
  Keyboard,
} from "lucide-react";
import { useGameStore } from "@/lib/gameStore";
import { MISSIONS, type BeaconStatus } from "@/lib/missions";

const STATUS_LABEL: Record<BeaconStatus, string> = {
  locked: "Locked",
  available: "Available",
  completed: "Resolved",
};

const STATUS_COLOR: Record<BeaconStatus, string> = {
  locked: "#475569",
  available: "#22d3ee",
  completed: "#22c55e",
};

export default function Hud() {
  const playerName = useGameStore((s) => s.playerName);
  const totalXp = useGameStore((s) => s.totalXp);
  const completedMissions = useGameStore((s) => s.completedMissions);
  const nearbyMissionId = useGameStore((s) => s.nearbyMissionId);
  const dialogOpen = useGameStore((s) => s.dialogOpen);
  const challengeOpen = useGameStore((s) => s.challengeOpen);
  const signOut = useGameStore((s) => s.signOut);
  const setActiveMission = useGameStore((s) => s.setActiveMission);
  const statusOf = useGameStore((s) => s.statusOf);

  const [showLog, setShowLog] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // ESC closes panels
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowLog(false);
        setShowMap(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const total = MISSIONS.length;
  const done = completedMissions.length;
  const progress = Math.round((done / total) * 100);
  const allDone = done === total;

  const nearbyMission = nearbyMissionId
    ? MISSIONS.find((m) => m.id === nearbyMissionId)
    : null;
  const nearbyStatus = nearbyMissionId ? statusOf(nearbyMissionId) : null;

  return (
    <>
      {/* Top-left: Player status */}
      <div className="pointer-events-none absolute left-4 top-4 z-30">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/20 ring-1 ring-cyan-400/40">
            <Satellite className="h-4 w-4 text-cyan-300" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
              Cadet
            </p>
            <p className="max-w-[140px] truncate text-sm font-semibold text-white">
              {playerName}
            </p>
          </div>
          <div className="ml-2 hidden sm:block">
            <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-right">
              <p className="text-[9px] uppercase tracking-wider text-cyan-200/60">
                XP
              </p>
              <p className="text-sm font-bold text-cyan-100">{totalXp}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Return to the start screen? Your progress is saved in this browser and you can resume any time."
                )
              ) {
                signOut();
              }
            }}
            className="ml-1 hidden rounded-md p-2 text-white/50 transition hover:bg-white/10 hover:text-white sm:block"
            aria-label="Exit to menu"
            title="Exit to menu"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Top-right: Progress + logbook button */}
      <div className="pointer-events-none absolute right-4 top-4 z-30 flex flex-col items-end gap-2">
        <div className="pointer-events-auto w-60 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
            <span className="text-white/40">Missions</span>
            <span className="font-bold text-cyan-200">
              {done} / {total}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: allDone
                  ? "linear-gradient(90deg, #22c55e, #4ade80)"
                  : "linear-gradient(90deg, #22d3ee, #a855f7)",
              }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", damping: 26, stiffness: 200 }}
            />
          </div>
          {allDone && (
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Cluster restored
            </p>
          )}
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => {
              setShowMap((v) => !v);
              setShowLog(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-white/70 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
          >
            <MapIcon className="h-3.5 w-3.5" />
            Map
          </button>
          <button
            onClick={() => {
              setShowLog((v) => !v);
              setShowMap(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-white/70 backdrop-blur-md transition hover:bg-white/10 hover:text-white"
          >
            <Activity className="h-3.5 w-3.5" />
            Log
          </button>
        </div>
      </div>

      {/* Bottom-center: Interaction hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center">
        <AnimatePresence>
          {nearbyMission &&
            nearbyStatus &&
            nearbyStatus !== "locked" &&
            !dialogOpen &&
            !challengeOpen && (
              <motion.div
                initial={{ y: 18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 18, opacity: 0 }}
                className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-black/70 px-5 py-3 backdrop-blur-md"
              >
                <div
                  className="grid h-9 w-9 place-items-center rounded-lg ring-1"
                  style={{
                    background: `${nearbyMission.color}25`,
                    borderColor: `${nearbyMission.color}60`,
                  }}
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: nearbyMission.color }}
                  />
                </div>
                <div className="leading-tight">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                    {nearbyMission.codename} ·{" "}
                    {nearbyStatus === "completed" ? "Review" : "Mission ready"}
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {nearbyMission.title}
                  </p>
                </div>
                <kbd className="ml-2 inline-flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-200 shadow-[0_0_20px_-5px] shadow-cyan-400/60">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                  Space
                </kbd>
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Bottom-left: Controls hint */}
      <div className="pointer-events-none absolute bottom-5 left-4 z-30 hidden sm:block">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-[10px] uppercase tracking-wider text-white/50 backdrop-blur-md">
          <Keyboard className="h-3.5 w-3.5" />
          Arrows / WASD / ZQSD
          <span className="mx-1 h-3 w-px bg-white/20" />
          Space: interact
          <span className="mx-1 h-3 w-px bg-white/20" />
          Esc: close
        </div>
      </div>

      {/* All-clear banner */}
      <AnimatePresence>
        {allDone && !dialogOpen && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 top-1/2 z-40 flex -translate-y-1/2 justify-center"
          >
            <div className="rounded-3xl border border-emerald-400/40 bg-black/85 px-8 py-6 text-center shadow-2xl backdrop-blur-md">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-300">
                Cluster fully restored
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                Mission complete, {playerName}.
              </p>
              <p className="mt-1 text-sm text-white/60">
                Total XP: {totalXp} · {total}/{total} subsystems green
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logbook drawer */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="pointer-events-auto absolute right-4 top-32 z-40 max-h-[70vh] w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f24]/95 shadow-2xl backdrop-blur-md"
          >
            <div className="border-b border-white/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-200/70">
                Mission Log
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                Cadet {playerName}
              </p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-3">
              {MISSIONS.map((m, idx) => {
                const status = statusOf(m.id);
                const isDone = status === "completed";
                const isLocked = status === "locked";
                return (
                  <div
                    key={m.id}
                    className={[
                      "mb-2 rounded-xl border p-3 transition",
                      isLocked
                        ? "border-white/5 bg-white/[0.02]"
                        : isDone
                        ? "border-emerald-400/30 bg-emerald-500/10"
                        : "border-white/10 bg-white/[0.04]",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-bold"
                        style={{
                          background: isLocked ? "#1e293b" : `${m.color}25`,
                          color: isLocked ? "#64748b" : m.color,
                          border: `1px solid ${
                            isLocked ? "#334155" : `${m.color}60`
                          }`,
                        }}
                      >
                        {isDone ? "✓" : isLocked ? "·" : idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={[
                            "truncate text-sm font-semibold",
                            isLocked ? "text-white/40" : "text-white",
                          ].join(" ")}
                        >
                          {m.title}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider text-white/40">
                          {STATUS_LABEL[status]}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: `${STATUS_COLOR[status]}22`,
                          color: STATUS_COLOR[status],
                        }}
                      >
                        {m.rewardXp} XP
                      </span>
                    </div>
                    {!isLocked && !isDone && (
                      <button
                        onClick={() => {
                          setActiveMission(m.id);
                          setShowLog(false);
                        }}
                        className="mt-2 w-full rounded-md border border-white/10 bg-white/5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white/70 transition hover:bg-white/10 hover:text-white"
                      >
                        Open brief
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimap */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="pointer-events-auto absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-[#0a0f24]/95 p-5 shadow-2xl backdrop-blur-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-200/70">
                Cluster Map
              </p>
              <button
                onClick={() => setShowMap(false)}
                className="text-xs text-white/50 transition hover:text-white"
              >
                Esc
              </button>
            </div>
            <div className="relative h-72 w-72 overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {/* Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/30" />
              <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-400/20" />
              {/* Missions - map uses cluster coordinates (x, z) */}
              {MISSIONS.map((m) => {
                const status = statusOf(m.id);
                // World coords range: -22..22 → map 0..100%
                const leftPct = ((m.position[0] + 24) / 48) * 100;
                const topPct = ((m.position[1] + 24) / 48) * 100;
                const isLocked = status === "locked";
                const isDone = status === "completed";
                return (
                  <div
                    key={m.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                  >
                    <div
                      className="grid h-6 w-6 place-items-center rounded-full ring-2"
                      style={{
                        background: isLocked ? "#1e293b" : `${m.color}33`,
                        borderColor: isLocked ? "#334155" : m.color,
                        boxShadow: isLocked
                          ? "none"
                          : `0 0 16px -2px ${m.color}`,
                        color: isLocked ? "#64748b" : m.color,
                      }}
                      title={m.title}
                    >
                      {isDone ? "✓" : isLocked ? "·" : "!"}
                    </div>
                  </div>
                );
              })}
              {/* Player marker (approximate from store - no live position here for simplicity) */}
              <div className="absolute left-1/2 top-[68%] -translate-x-1/2 -translate-y-1/2">
                <div className="h-3 w-3 animate-pulse rounded-full bg-white ring-2 ring-cyan-400" />
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-white/40">
              ✓ resolved · ! available · · locked
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
