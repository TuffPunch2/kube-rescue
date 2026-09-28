"use client";

import { useRef, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import Astronaut from "./Astronaut";
import KubeCluster from "./KubeCluster";
import MissionBeacon from "./MissionBeacon";
import { useSpaceHandler } from "./useKeyboardControls";
import { MISSIONS, type BeaconStatus } from "@/lib/missions";
import { useGameStore } from "@/lib/gameStore";

const INTERACTION_RANGE = 2.6;
const PROXIMITY_CHECK_INTERVAL = 4; // frames

export default function Scene() {
  const astronautPos = useRef(new THREE.Vector3(0, 0, 0));
  const controlsEnabled = useRef(true);
  const frameCounter = useRef(0);

  const completedMissions = useGameStore((s) => s.completedMissions);
  const setNearbyMission = useGameStore((s) => s.setNearbyMission);
  const setActiveMission = useGameStore((s) => s.setActiveMission);
  const nearbyMissionId = useGameStore((s) => s.nearbyMissionId);
  const dialogOpen = useGameStore((s) => s.dialogOpen);
  const challengeOpen = useGameStore((s) => s.challengeOpen);
  const playerName = useGameStore((s) => s.playerName);

  // Disable 3D movement while any dialog is open
  useEffect(() => {
    controlsEnabled.current = !(dialogOpen || challengeOpen);
  }, [dialogOpen, challengeOpen]);

  // Space opens the dialog when nearby + no dialog active
  const onSpace = () => {
    const nearby = useGameStore.getState().nearbyMissionId;
    if (!nearby) return;
    const m = MISSIONS.find((x) => x.id === nearby);
    if (!m) return;
    const status = useGameStore.getState().statusOf(nearby);
    if (status === "locked") return; // can't open locked
    setActiveMission(nearby);
  };

  useSpaceHandler(onSpace, !dialogOpen && !challengeOpen);

  // Mission statuses precomputed
  const statuses = useMemo(() => {
    const map: Record<string, BeaconStatus> = {};
    MISSIONS.forEach((m) => {
      map[m.id] = useGameStore.getState().statusOf(m.id);
    });
    return map;
  }, [completedMissions]);

  // Proximity polling — using rAF outside Canvas is lighter than per-frame in R3F
  useEffect(() => {
    let raf = 0;
    let last = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      frameCounter.current++;
      if (frameCounter.current < PROXIMITY_CHECK_INTERVAL) return;
      frameCounter.current = 0;

      // Only update if controls enabled (no dialog open)
      if (!controlsEnabled.current) return;

      const pos = astronautPos.current;
      let closest: { id: string; dist: number } | null = null;
      for (const m of MISSIONS) {
        const dx = pos.x - m.position[0];
        const dz = pos.z - m.position[1];
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d <= INTERACTION_RANGE) {
          if (!closest || d < closest.dist) {
            closest = { id: m.id, dist: d };
          }
        }
      }
      const newId = closest?.id ?? "";
      if (newId !== last) {
        last = newId;
        setNearbyMission(newId || null);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [setNearbyMission]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 55, near: 0.1, far: 200, position: [0, 11, 13] }}
      style={{ background: "linear-gradient(180deg, #05060f 0%, #0a0f24 60%, #0d1530 100%)" }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.35} color="#9bb8ff" />
      <hemisphereLight args={["#a5b4fc", "#1e293b", 0.45]} />
      <directionalLight
        position={[10, 18, 6]}
        intensity={0.9}
        color="#fff8e6"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <pointLight position={[0, 8, 0]} intensity={0.6} color="#22d3ee" distance={40} />
      <pointLight position={[-20, 6, -20]} intensity={0.5} color="#a855f7" distance={30} />
      <pointLight position={[20, 6, 20]} intensity={0.5} color="#22c55e" distance={30} />

      {/* Environment */}
      <KubeCluster />

      {/* Mission beacons */}
      {MISSIONS.map((m) => (
        <MissionBeacon
          key={m.id}
          mission={m}
          status={statuses[m.id]}
          isNearby={nearbyMissionId === m.id}
        />
      ))}

      {/* Astronaut */}
      <Astronaut
        positionRef={astronautPos}
        controlsEnabledRef={controlsEnabled}
        initialPosition={[0, 0, -10]}
        playerName={playerName}
      />

      {/* Subtle fog for depth */}
      <fog attach="fog" args={["#070a1a", 35, 90]} />
    </Canvas>
  );
}
