"use client";

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useGameStore } from "@/lib/gameStore";
import StartScreen from "@/components/game/StartScreen";
import MissionDialog from "@/components/game/MissionDialog";
import Hud from "@/components/game/Hud";

// The 3D scene relies on WebGL and @react-three/fiber, both of which only
// run in the browser. We load it with ssr: false so the server never tries
// to render the Canvas.
const Scene = dynamic(() => import("@/components/game/Scene"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-screen w-full place-items-center bg-[#05060f] text-cyan-200">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
        <p className="text-xs uppercase tracking-[0.25em] text-white/60">
          Booting cluster link…
        </p>
      </div>
    </div>
  ),
});

// useSyncExternalStore is the canonical way to detect "are we on the client"
// without triggering setState-in-effect warnings or hydration mismatches.
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export default function Home() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const started = useGameStore((s) => s.started);
  const hydrate = useGameStore((s) => s.hydrate);

  // Hydrate the Zustand store from localStorage once on mount.
  // hydrate is a store action (no local setState), so this effect just
  // synchronises React with an external system (localStorage) — the
  // intended use of effects per React docs.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isClient) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-[#05060f]">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
      </div>
    );
  }

  if (!started) {
    return <StartScreen />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#05060f] text-white">
      {/* Full-screen 3D world */}
      <div className="absolute inset-0">
        <Scene />
      </div>

      {/* HUD overlay */}
      <Hud />

      {/* Mission dialogue (space-to-open) */}
      <MissionDialog />
    </div>
  );
}
