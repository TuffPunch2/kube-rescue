# Kube Rescue 🛰️

**Kube Rescue** is a browser-based 3D game that teaches real-world Kubernetes
incident response. You play an SRE astronaut dropped onto a damaged cluster
floor. glowing beacons mark broken subsystems — walk up to one, read the
incident brief, and answer a realistic diagnostic challenge (pick the right
`kubectl` command, fix a broken YAML, etc.) to restore it.

Crash the pod? No. Rescue the cluster. ✅

## Gameplay

- **Explore** — drive your astronaut around a hexagonal cluster floor with
  WASD / arrow keys. The camera follows from above.
- **Beacons** — each glowing beacon is a mission. Locked beacons are dimmed;
  available beacons pulse and show `PRESS SPACE` when you're close.
- **Incidents** — opening a beacon gives you a narrative brief and a technical
  scenario, then a challenge: choose the correct command or fix.
- **Progression** — missions form a prerequisite chain (you can't fix the
  control plane before you've recovered the nodes). Each solved incident
  grants XP; your save persists in `localStorage`.
- **Finale** — solve every subsystem, renew the expired certs, and close the
  incident at the cluster core.

## Tech stack

| Layer      | Tech                                        |
| ---------- | ------------------------------------------- |
| Framework  | Next.js (App Router) + React 19             |
| 3D         | three.js, @react-three/fiber, @react-three/drei |
| State      | Zustand (persistent slice + session slice)  |
| Styling    | Tailwind CSS v4 + shadcn/ui (Radix)         |
| Animations | framer-motion                               |
| Runtime    | Bun (lockfile: `bun.lock`)                  |

## Getting started

```bash
# install dependencies
bun install

# run the dev server on http://localhost:3000
bun run dev

# lint
bun run lint

# production build (standalone output)
bun run build
```

Requires Node.js ≥ 20 (or Bun ≥ 1.1) and a WebGL-capable browser.

## Project structure

```
src/
├── app/               # Next.js App Router (single page: src/app/page.tsx)
├── components/
│   ├── game/          # The game: Scene, Astronaut, MissionBeacon, HUD, dialogs
│   └── ui/            # shadcn/ui primitives
├── lib/
│   ├── missions.ts    # ★ Mission definitions + save/persist helpers
│   └── gameStore.ts   # Zustand store shared by 3D scene and React HUD
```

## Contributing

Contributions are very welcome — especially **new missions**! A mission is
just an entry in `src/lib/missions.ts`: a real-world Kubernetes failure mode,
a narrative brief, a scenario with realistic `kubectl` output, and a multiple
choice challenge with a well-explained answer.

Agents and AI assistants should read [`AGENTS.md`](AGENTS.md), which contains
the architecture notes, coding conventions, and a step-by-step skill for
adding missions (`.agents/skills/add-mission/SKILL.md`).

1. Fork the repo and create a branch.
2. Make your change (`bun run lint` should pass).
3. Open a pull request describing the incident you added (or the bug you fixed).

## License

Licensed under the [Apache License 2.0](LICENSE).
