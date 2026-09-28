"use client";

import { useRef, useState } from "react";
import { Hand } from "lucide-react";
import { joystickInput, resetJoystick } from "./joystickInput";
import { useGameStore } from "@/lib/gameStore";

// Max knob travel in px; input normalised to [-1, 1] against this.
const JOYSTICK_RADIUS = 52;

// Touch overlay: analog joystick (bottom-left) + Interact button (bottom-right).
// Rendered only on coarse-pointer devices; writes into the shared
// joystickInput object so Astronaut's useFrame can consume it without re-renders.
export default function MobileControls() {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  // Component is only mounted after hydration on the client (page.tsx), so
  // matchMedia is safe in the lazy initialiser — no effect needed.
  const [isTouch] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches
  );

  const tryOpenNearbyMission = useGameStore((s) => s.tryOpenNearbyMission);
  const nearbyMissionId = useGameStore((s) => s.nearbyMissionId);
  const controlsLocked = useGameStore(
    (s) => s.dialogOpen || s.challengeOpen || !s.started
  );

  const updateKnob = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }
    setKnob({ x: dx, y: dy });
    joystickInput.x = dx / JOYSTICK_RADIUS;
    // Screen Y grows downward, so negate: dragging up = forward (inputZ +1).
    joystickInput.y = -dy / JOYSTICK_RADIUS;
  };

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (controlsLocked) return;
    pointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateKnob(e.clientX, e.clientY);
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    updateKnob(e.clientX, e.clientY);
  };

  const handleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setKnob({ x: 0, y: 0 });
    resetJoystick();
  };

  if (!isTouch) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* Joystick */}
      <div
        ref={baseRef}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        className={`pointer-events-auto absolute bottom-8 left-8 flex h-32 w-32 touch-none items-center justify-center rounded-full border border-cyan-400/30 bg-slate-900/50 backdrop-blur-sm ${
          controlsLocked ? "opacity-40" : ""
        }`}
      >
        <div
          className="h-14 w-14 rounded-full border border-cyan-300/60 bg-cyan-400/30 shadow-[0_0_16px_rgba(34,211,238,0.4)]"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Interact button — only when a beacon is in range and no dialog open */}
      {nearbyMissionId && !controlsLocked && (
        <button
          onClick={tryOpenNearbyMission}
          className="pointer-events-auto absolute bottom-12 right-8 flex h-20 w-20 touch-none flex-col items-center justify-center gap-1 rounded-full border border-cyan-300/60 bg-cyan-500/25 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.45)] backdrop-blur-sm active:bg-cyan-400/40"
        >
          <Hand className="h-6 w-6" />
          <span className="text-[10px] uppercase tracking-widest">Interact</span>
        </button>
      )}
    </div>
  );
}
