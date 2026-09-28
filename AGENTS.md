# AGENTS.md

Instructions for AI coding agents contributing to **Kube Rescue** — a
browser-based 3D Kubernetes incident-response game.

## What this project is

An astronaut walks a 3D "cluster floor", approaches beacons representing
broken Kubernetes subsystems, reads an incident brief, and answers a
diagnostic challenge. Missions are pure data; the engine is generic.

## Commands

Use **Bun** as the package manager (repo has `bun.lock`, no `package-lock.json`).

```bash
bun install        # install deps
bun run dev        # dev server on http://localhost:3000 (Next.js App Router)
bun run lint       # eslint — MUST pass before you finish
bun run build      # production build (standalone output)
```

There is no test suite. Validate changes with `bun run lint` and, where
possible, by loading the dev server and exercising the flow (open a beacon,
answer the challenge, check XP/save behavior).

## Architecture map

| File | Role |
| --- | --- |
| `src/lib/missions.ts` | ★ Single source of truth for mission data, the `Mission`/`Challenge` types, and localStorage save helpers (`loadSave`, `persistSave`, `getMissionStatus`, `STORAGE_KEY`). |
| `src/lib/gameStore.ts` | Zustand store shared by the 3D scene and the React HUD. Persistent slice (player name, completed missions, XP) + session slice (dialog open, nearby beacon, challenge state). |
| `src/app/page.tsx` | Only route. Loads `Scene` with `ssr: false` (WebGL), hydrates the store from localStorage on mount. |
| `src/components/game/Scene.tsx` | R3F canvas: floor, cluster, beacons, astronaut. Detects nearby beacons, opens missions on Space. |
| `src/components/game/Astronaut.tsx` | Player + camera controller. Defines `WORLD_BOUNDS` (±22 on x/z). |
| `src/components/game/MissionBeacon.tsx` | Per-beacon 3D visuals. **Memoized** — keep props minimal and stable. |
| `src/components/game/MissionDialog.tsx` | Dialogue + challenge UI driven by the store. |
| `src/components/game/Hud.tsx` | XP bar, mission log, exit. |
| `src/components/game/StartScreen.tsx` | Name entry, resume, wipe save. |
| `src/components/ui/` | shadcn/ui primitives — do not hand-edit casually. |

Key data flow: `MISSIONS` (data) → `Scene` renders beacons → proximity sets
`nearbyMissionId` in the store → Space opens dialog via `setActiveMission` →
`answerChallenge` grades the answer, appends to `completedMissions`, adds
`rewardXp`, and persists to `localStorage` under `STORAGE_KEY`.

## Conventions

- **TypeScript everywhere.** No `any`. Missions must satisfy the exported
  `Mission` interface — `bun run lint` and `tsc` will enforce it.
- **React 19 / Next 16 patterns:**
  - Effects only to synchronise with external systems (localStorage, three.js).
    No setState-in-effect chains — the codebase deliberately avoids them; keep
    it that way. Prefer derived state or store actions.
  - The "is it client yet" check uses `useSyncExternalStore` — reuse that
    pattern, don't invent hydration hacks.
- **3D components:** client-only. Anything importing `@react-three/fiber`
  must be dynamically imported with `ssr: false` or live under `components/game/`.
- **Beacons are memoized.** Don't add store subscriptions inside
  `MissionBeacon`; pass data via props.
- **State:** all game state lives in the Zustand store, not component state
  (except purely local UI like the mission log toggle).
- **Styling:** Tailwind utility classes; dark HUD palette on `#05060f` with
  cyan accents. shadcn/ui components for 2D UI.
- **Comments explain *why***, not what. Match the existing comment style
  (short rationale notes at the top of tricky blocks).
- **Deps:** use only packages already in `package.json`. Adding one requires
  justification.

## Mission content guidelines

Missions teach real Kubernetes operations. Keep the bar high:

- **Realistic**: use plausible pod/deployment names, namespaces, kubectl
  output, and versions. The scenario text should read like a real
  `kubectl describe` / `logs` snippet.
- **Unambiguous**: exactly one correct option; distractors must be plausible
  but clearly wrong on technical grounds.
- **Explain**: the `explanation` field is shown after answering — it should
  teach *why* the answer is right and *why* the best distractor is wrong.
- **Chain**: `prerequisites` reference other mission `id`s and define the
  game's progression graph. `crashloop` is the entry mission; `clusterrestored`
  is the finale (it should depend on the last major mission).

Full step-by-step procedure: [`.agents/skills/add-mission/SKILL.md`](.agents/skills/add-mission/SKILL.md).

## Out of scope for quick edits

- Don't change `STORAGE_KEY` (invalidates every player's save).
- Don't reposition existing beacons casually — positions are tuned to avoid
  overlap and stay inside `WORLD_BOUNDS` (±22, see `Astronaut.tsx`).
- Don't edit `src/components/ui/*` (generated shadcn components).
