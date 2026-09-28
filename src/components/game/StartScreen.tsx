"use client";

import { useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Rocket, Satellite, Terminal, Trash2, ChevronRight } from "lucide-react";
import { useGameStore } from "@/lib/gameStore";
import { MISSIONS, STORAGE_KEY, type GameSave } from "@/lib/missions";

// Subscribe to localStorage "storage" events so the save indicator
// stays in sync if another tab updates the save.
function subscribeStorage(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function readSavedRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readServerSavedRaw(): string | null {
  return null;
}

export default function StartScreen() {
  const [name, setName] = useState("");

  // useSyncExternalStore gives us a hydration-safe read of localStorage
  // (server: returns null, client: returns the actual value or null).
  const savedRaw = useSyncExternalStore(
    subscribeStorage,
    readSavedRaw,
    readServerSavedRaw
  );
  let parsedSave: GameSave | null = null;
  try {
    parsedSave = savedRaw ? (JSON.parse(savedRaw) as GameSave) : null;
  } catch {
    parsedSave = null;
  }
  const hasSave = !!parsedSave?.playerName;
  const resumeName = parsedSave?.playerName ?? "";

  const startGame = useGameStore((s) => s.startGame);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const completed = useGameStore((s) => s.completedMissions);
  const savedXp = useGameStore((s) => s.totalXp);

  // The parent page hydrates the Zustand store on mount via an effect,
  // so `completed` and `savedXp` will populate after first paint.

  const handleStart = () => {
    startGame(name);
  };

  const handleResume = () => {
    startGame(resumeName);
  };

  const handleReset = () => {
    resetProgress();
    setName("");
  };

  const completedCount = completed.length;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05060f] text-white">
      {/* Starfield background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(217,70,239,0.1),transparent_60%)]" />
        {Array.from({ length: 80 }).map((_, i) => {
          const left = (i * 37.13) % 100;
          const top = (i * 53.71) % 100;
          const delay = (i % 7) * 0.6;
          const size = i % 5 === 0 ? 2.5 : 1.5;
          return (
            <motion.span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                opacity: 0.5,
              }}
              animate={{ opacity: [0.15, 0.9, 0.15] }}
              transition={{
                duration: 3.2,
                delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* Decorative orbit rings */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-0 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[640px] w-[640px] rounded-full border border-cyan-500/10" />
        <div className="absolute inset-12 rounded-full border border-fuchsia-500/10" />
        <div className="absolute inset-24 rounded-full border border-cyan-500/20" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/20 ring-1 ring-cyan-400/40">
            <Satellite className="h-5 w-5 text-cyan-300" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wider text-cyan-200">
              KUBERESQ-9
            </p>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
              Orbital Cluster Rescue
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/60 sm:flex">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live mission feed
        </div>
      </header>

      {/* Hero / form */}
      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-24 pt-10 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center"
        >
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.25em] text-cyan-200">
            <Terminal className="h-3.5 w-3.5" />
            Pilot check-in
          </p>
          <h1 className="bg-gradient-to-br from-white via-cyan-100 to-fuchsia-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-6xl">
            Strap in, cadet.
            <br />
            The cluster needs you.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            A solar flare scrambled the production Kubernetes cluster. Six
            subsystems are degraded. Walk your astronaut across the orbiting
            nodes, open each mission brief, and prove you can bring the
            control plane back to green.
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
          className="mt-12 w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-md sm:p-8"
        >
          <label
            htmlFor="pilot-name"
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80"
          >
            Astronaut call sign
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                id="pilot-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) handleStart();
                }}
                placeholder="e.g. Commander Rivera"
                maxLength={32}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none ring-cyan-400/40 transition focus:border-cyan-400/60 focus:ring-2"
              />
            </div>
            <button
              onClick={handleStart}
              disabled={!name.trim()}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-5 py-3 text-sm font-bold uppercase tracking-wider text-black transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:shadow-[0_0_30px_-5px] enabled:hover:shadow-cyan-400/60"
            >
              <Rocket className="h-4 w-4" />
              Launch
              <ChevronRight className="h-4 w-4 transition group-enabled:group-hover:translate-x-0.5" />
            </button>
          </div>

          {hasSave && (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-400/20 ring-1 ring-amber-300/40">
                  <Rocket className="h-4 w-4 text-amber-300" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-amber-100">
                    Previous logbook found — {resumeName}
                  </p>
                  <p className="text-xs text-amber-100/70">
                    {completedCount} / {MISSIONS.length} missions resolved ·{" "}
                    {savedXp} XP banked
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResume}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-300 px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-amber-200"
                >
                  Resume
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Wipe
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Mission preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {MISSIONS.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20"
            >
              <div
                className="mb-3 grid h-9 w-9 place-items-center rounded-lg ring-1"
                style={{
                  background: `${m.color}1a`,
                  borderColor: `${m.color}40`,
                  boxShadow: `0 0 20px -8px ${m.color}`,
                }}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ background: m.color }}
                />
              </div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                {m.codename}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug text-white">
                {m.title}
              </p>
            </div>
          ))}
        </motion.div>

        <p className="mt-12 text-center text-xs text-white/40">
          No accounts. No servers. Your progress lives only in this browser.
        </p>
      </main>
    </div>
  );
}
