"use client";

import { useEffect, useRef } from "react";

// Tracks pressed movement keys. Supports arrows + ZQSD + WASD.
// We intentionally ignore modifiers and key repeat; we only care about
// whether a key is currently held down.

export interface MovementKeys {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

const KEY_MAP: Record<string, keyof MovementKeys> = {
  ArrowUp: "forward",
  ArrowDown: "back",
  ArrowLeft: "left",
  ArrowRight: "right",
  z: "forward",
  Z: "forward",
  s: "back",
  S: "back",
  q: "left",
  Q: "left",
  d: "right",
  D: "right",
  w: "forward",
  W: "forward",
  a: "left",
  A: "left",
};

export function useKeyboardControls(
  ref: React.MutableRefObject<MovementKeys>,
  enabledRef: React.MutableRefObject<boolean>
) {
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      const key = KEY_MAP[e.key];
      if (key) {
        ref.current[key] = true;
        // Prevent page scroll for arrow keys
        if (
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight"
        ) {
          e.preventDefault();
        }
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      const key = KEY_MAP[e.key];
      if (key) ref.current[key] = false;
    };
    const handleBlur = () => {
      ref.current.forward = false;
      ref.current.back = false;
      ref.current.left = false;
      ref.current.right = false;
    };
    window.addEventListener("keydown", handleDown, { passive: false });
    window.addEventListener("keyup", handleUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [ref, enabledRef]);
}

// Global space-press handler. We use a ref-callback pattern so the
// 3D scene can subscribe without re-rendering on every keystroke.
export function useSpaceHandler(onSpace: () => void, enabled: boolean) {
  const cbRef = useRef(onSpace);
  useEffect(() => {
    cbRef.current = onSpace;
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (!enabled) return;
      // Don't trigger when focus is in input/textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      cbRef.current();
    };
    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [enabled]);
}
