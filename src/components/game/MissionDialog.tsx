"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  FileCode,
  ListChecks,
  ArrowLeft,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useGameStore } from "@/lib/gameStore";
import { MISSIONS, type Mission } from "@/lib/missions";

function ChallengeTypeIcon({ type }: { type: Mission["challenge"]["type"] }) {
  if (type === "command_choice") return <Terminal className="h-3.5 w-3.5" />;
  if (type === "yaml_fix") return <FileCode className="h-3.5 w-3.5" />;
  return <ListChecks className="h-3.5 w-3.5" />;
}

// Inner component that owns the challenge input state. Using a `key`
// based on the active mission id causes React to remount this component
// whenever the active mission changes, naturally resetting selectedIndex
// and showFeedback without any setState-in-effect.
function MissionDialogInner({ mission }: { mission: Mission }) {
  const status = useGameStore((s) => s.statusOf(mission.id));
  const challengeOpen = useGameStore((s) => s.challengeOpen);
  const challengeResult = useGameStore((s) => s.challengeResult);
  const openChallenge = useGameStore((s) => s.openChallenge);
  const closeChallenge = useGameStore((s) => s.closeChallenge);
  const answerChallenge = useGameStore((s) => s.answerChallenge);
  const closeDialog = useGameStore((s) => s.closeDialog);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const prereqTitles = mission.prerequisites
    .map((id) => MISSIONS.find((m) => m.id === id)?.title ?? id)
    .join(", ");

  // ESC closes dialog — event listener is a legitimate effect use.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDialog();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeDialog]);

  const handleAnswer = () => {
    if (selectedIndex === null) return;
    const ok = answerChallenge(selectedIndex);
    setShowFeedback(true);
    if (ok) {
      // Auto-close shortly after success so the player sees the feedback.
      // closeDialog is from the Zustand store, so it stays stable across
      // remounts and is safe to call from a deferred timer.
      window.setTimeout(() => {
        closeDialog();
      }, 2400);
    }
  };

  const handleRetry = () => {
    setSelectedIndex(null);
    setShowFeedback(false);
  };

  return (
    <motion.div
      initial={{ scale: 0.92, y: 24, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.92, y: 24, opacity: 0 }}
      transition={{ type: "spring", damping: 24, stiffness: 220 }}
      className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f24] shadow-2xl"
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4 border-b border-white/10 p-5"
        style={{
          background: `linear-gradient(135deg, ${mission.color}25 0%, transparent 60%)`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1"
            style={{
              background: `${mission.color}25`,
              borderColor: `${mission.color}60`,
              boxShadow: `0 0 24px -8px ${mission.color}`,
            }}
          >
            {status === "completed" ? (
              <CheckCircle2
                className="h-6 w-6"
                style={{ color: "#22c55e" }}
              />
            ) : (
              <div
                className="h-5 w-5 rounded-full"
                style={{ background: mission.color }}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.25em]"
                style={{ color: mission.color }}
              >
                {mission.codename}
              </p>
              {status === "completed" && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/40">
                  Resolved
                </span>
              )}
            </div>
            <h2 className="mt-1 text-xl font-bold leading-tight text-white">
              {mission.title}
            </h2>
            {mission.prerequisites.length > 0 && (
              <p className="mt-1.5 text-xs text-white/50">
                Prerequisite:{" "}
                <span className="text-white/80">{prereqTitles}</span>
              </p>
            )}
          </div>
        </div>
        <button
          onClick={closeDialog}
          className="shrink-0 rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
          aria-label="Close mission dialog"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[60vh] overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          {!challengeOpen ? (
            <motion.div
              key="brief"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300/70">
                  Mission Brief
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  {mission.brief}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 p-4">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/70">
                  Telemetry
                </p>
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-emerald-200/85">
                  {mission.scenario}
                </pre>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-fuchsia-400/20 bg-fuchsia-500/10 p-3 text-xs text-fuchsia-200">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Reward:{" "}
                  <span className="font-bold text-fuchsia-100">
                    {mission.rewardXp} XP
                  </span>
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="challenge"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <button
                  onClick={() => {
                    closeChallenge();
                    setSelectedIndex(null);
                    setShowFeedback(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Brief
                </button>
                <div className="ml-2 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white/70">
                  <ChallengeTypeIcon type={mission.challenge.type} />
                  {mission.challenge.type === "command_choice"
                    ? "Pick the kubectl command"
                    : mission.challenge.type === "yaml_fix"
                    ? "Pick the corrected YAML"
                    : "Pick the best answer"}
                </div>
              </div>
              <p className="text-sm leading-relaxed text-white/85">
                {mission.challenge.prompt}
              </p>
              {mission.challenge.context && (
                <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-xs leading-relaxed text-emerald-200/85">
                  {mission.challenge.context}
                </pre>
              )}
              <div className="mt-4 space-y-2">
                {mission.challenge.options.map((opt, i) => {
                  const isSelected = selectedIndex === i;
                  const showCorrect =
                    showFeedback && i === mission.challenge.correctIndex;
                  const showWrong =
                    showFeedback &&
                    isSelected &&
                    i !== mission.challenge.correctIndex;
                  return (
                    <button
                      key={i}
                      disabled={
                        showFeedback && challengeResult === "correct"
                      }
                      onClick={() => setSelectedIndex(i)}
                      className={[
                        "group flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition",
                        showCorrect
                          ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100"
                          : showWrong
                          ? "border-rose-400/60 bg-rose-500/15 text-rose-100"
                          : isSelected
                          ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100"
                          : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.06]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs font-bold",
                          showCorrect
                            ? "border-emerald-400 bg-emerald-500/30 text-emerald-100"
                            : showWrong
                            ? "border-rose-400 bg-rose-500/30 text-rose-100"
                            : isSelected
                            ? "border-cyan-400 bg-cyan-500/30 text-cyan-100"
                            : "border-white/15 text-white/60 group-hover:border-white/30",
                        ].join(" ")}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <pre className="flex-1 whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">
                        {opt}
                      </pre>
                      {showCorrect && (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      )}
                      {showWrong && (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {showFeedback && challengeResult === "correct" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/15 p-4"
                  >
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <p className="text-sm font-bold uppercase tracking-wider">
                        Mission Resolved · +{mission.rewardXp} XP
                      </p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-emerald-100/85">
                      {mission.challenge.explanation}
                    </p>
                  </motion.div>
                )}
                {showFeedback && challengeResult === "wrong" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/15 p-4"
                  >
                    <div className="flex items-center gap-2 text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="text-sm font-bold uppercase tracking-wider">
                        That action made it worse
                      </p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-rose-100/85">
                      {mission.challenge.explanation}
                    </p>
                    <p className="mt-2 text-xs text-rose-200/70">
                      Re-read the brief and try a different approach.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer / actions */}
      <div className="border-t border-white/10 bg-black/30 p-5">
        {!challengeOpen ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={closeDialog}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
              Close
            </button>
            {status === "completed" ? (
              <div className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Already resolved
              </div>
            ) : (
              <button
                onClick={openChallenge}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-black shadow-lg transition hover:brightness-110"
                style={{ background: mission.color }}
              >
                <Play className="h-4 w-4 fill-black" />
                Start Mission
              </button>
            )}
          </div>
        ) : !showFeedback ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => {
                closeChallenge();
                setSelectedIndex(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to brief
            </button>
            <button
              onClick={handleAnswer}
              disabled={selectedIndex === null}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:shadow-[0_0_24px_-6px] enabled:hover:shadow-cyan-400/60"
            >
              <Terminal className="h-4 w-4" />
              Execute
            </button>
          </div>
        ) : challengeResult === "wrong" ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={closeDialog}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
              Abort
            </button>
            <button
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition hover:brightness-110"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : (
          <button
            onClick={closeDialog}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-black transition hover:bg-emerald-300 sm:ml-auto sm:w-auto"
          >
            <CheckCircle2 className="h-4 w-4" />
            Continue
          </button>
        )}
      </div>

      {/* Locked state banner */}
      {status === "locked" && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-6 text-center">
            <Lock className="mx-auto h-8 w-8 text-amber-300" />
            <p className="mt-3 text-sm font-bold text-amber-100">
              Mission locked
            </p>
            <p className="mt-1 text-xs text-amber-100/70">
              Complete {prereqTitles} first to unlock this mission.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function MissionDialog() {
  const dialogOpen = useGameStore((s) => s.dialogOpen);
  const activeMissionId = useGameStore((s) => s.activeMissionId);

  const mission = activeMissionId
    ? MISSIONS.find((m) => m.id === activeMissionId) ?? null
    : null;

  if (!dialogOpen || !mission) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        // z-[100] sits above every HUD layer (which cap at z-40) so the
        // dialog is always on top — including over the all-clear banner,
        // the logbook drawer, and the minimap. (Next.js dev-tools overlay
        // is intentionally higher; it is dev-only.)
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            useGameStore.getState().closeDialog();
          }
        }}
      >
        {/* key={mission.id} causes a clean remount when switching missions,
            resetting inner challenge state without setState-in-effect. */}
        <MissionDialogInner key={mission.id} mission={mission} />
      </motion.div>
    </AnimatePresence>
  );
}
