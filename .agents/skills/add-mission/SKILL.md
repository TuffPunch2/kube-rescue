---
name: add-mission
description: Add a new Kubernetes incident mission to Kube Rescue. Use whenever the task involves creating, extending, or modifying missions in src/lib/missions.ts.
---

# Skill: Add a Mission

Goal: add a new entry to `MISSIONS` in `src/lib/missions.ts` that compiles,
lints, is reachable through the prerequisite graph, and renders correctly as
a beacon.

## 1. Review existing missions

Read `src/lib/missions.ts` first. Match the voice: the `brief` is written in
second person, addressed to the player as an SRE on call ("The team
suspects…", "The SRE on call has asked you…"). Note the level of technical
detail in `scenario` and `explanation` — it's high, not watered down.

## 2. Pick a real failure mode

One mission = one real-world Kubernetes issue. Good candidates not yet
covered: ImagePullBackOff (bad tag / registry auth), OOMKilled (wrong memory
limits), DNS resolution failures (CoreDNS / NetworkPolicy), PVC stuck Pending
(StorageClass), node DiskPressure eviction, liveness probe kill loops,
Helm/rollout stuck, kubelet notReady, NetworkPolicy blocking traffic, RBAC
forbidden errors, Service selector mismatch.

Check `id` values of existing missions and choose a unique kebab-case `id`.

## 3. Write the mission object

```ts
{
  id: "oomkilled",                      // unique, kebab-case
  title: "OOMKilled",                   // human title
  codename: "MEM-BLAST",                // 3–8 chars, shown on the beacon
  brief: "...",                         // narrative, 2nd person, 2–4 sentences
  scenario: "...",                      // realistic kubectl output / describe
  position: [-14, 10],                  // [x, z], see step 4
  color: "#ef4444",                     // hex accent color for the beacon
  icon: "alert-triangle",               // lucide-style icon name (metadata)
  prerequisites: ["crashloop"],         // ids of required missions
  rewardXp: 100,                        // 100 easy → 300 finale-tier
  challenge: {
    type: "command_choice",             // "command_choice" | "yaml_fix" | "multi_choice"
    prompt: "...",                      // the question
    context: "...",                     // kubectl snippet / YAML the player sees
    options: ["...", "...", "...", "..."],   // exactly 4, one correct
    correctIndex: 0,                    // index of the correct option
    explanation: "...",                 // teach why; mention why top distractor fails
  },
}
```

Rules:

- `options` must have exactly one correct answer, unambiguous to anyone who
  understands the topic.
- Distractors must be *plausible commands/YAML that are wrong* — not nonsense.
- Escape quotes in `context`/`options` correctly (JSON-in-string patches need
  `\"`, as seen in the `crashloop` mission).
- `explanation` should also carry flavor/humor — the existing missions do.

## 4. Choose a position

- World bounds: **x and z must be within [-22, 22]** (`WORLD_BOUNDS` in
  `src/components/game/Astronaut.tsx`). Prefer |x|,|z| ≤ 18.
- Don't overlap existing beacons — beacons are ~4 units wide with labels.
  Check the `position` of every existing mission before picking.
- Avoid `[0, 0]`: that's the finale beacon (`clusterrestored`, CORE-HEAL).

## 5. Wire into the progression graph

- `prerequisites` must reference **existing** mission ids (a typo locks the
  mission forever). Keep the chain meaningful: infrastructure before
  control-plane, finale (`clusterrestored`) last.
- If the new mission should gate the finale, add its id to
  `clusterrestored.prerequisites`.

## 6. Validate

```bash
bun run lint
```

Also confirm by reading: no duplicate ids, all prerequisite ids resolve, `tsc`
clean via the lint/build step. If you can run the dev server, spawn the game,
verify the beacon appears at the chosen position, and that completing a
prerequisite unlocks it.

## Checklist before finishing

- [ ] Unique `id`; all `prerequisites` resolve to existing ids
- [ ] Position within ±18 and not overlapping another beacon
- [ ] Exactly one unambiguously correct option; explanation teaches
- [ ] Voice/tone matches existing briefs and explanations
- [ ] `bun run lint` passes
