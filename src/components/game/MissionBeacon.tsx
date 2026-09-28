"use client";

import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import type { Mission, BeaconStatus } from "@/lib/missions";

interface BeaconProps {
  mission: Mission;
  status: BeaconStatus;
  isNearby: boolean;
}

function MissionBeacon({
  mission,
  status,
  isNearby,
}: BeaconProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const color = new THREE.Color(mission.color);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.4;
    }
    if (innerRef.current) {
      const pulse = 1 + Math.sin(t * 2) * 0.08;
      innerRef.current.scale.setScalar(pulse);
    }
    if (beamRef.current) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isNearby ? 0.45 + Math.sin(t * 4) * 0.15 : 0.18 + Math.sin(t * 2) * 0.06;
    }
  });

  const isLocked = status === "locked";
  const isCompleted = status === "completed";

  // Dim locked beacons
  const beaconColor = isLocked ? "#475569" : mission.color;

  return (
    <group position={[mission.position[0], 0, mission.position[1]]}>
      {/* Ground marker disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[1.8, 32]} />
        <meshStandardMaterial
          color={beaconColor}
          emissive={beaconColor}
          emissiveIntensity={isCompleted ? 0.2 : isLocked ? 0.1 : 0.7}
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rotating outer ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[1.5, 1.8, 32]} />
        <meshStandardMaterial
          color={beaconColor}
          emissive={beaconColor}
          emissiveIntensity={isLocked ? 0.3 : 1.0}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Inner rotating orb */}
      <mesh ref={innerRef} position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.4, 24, 24]} />
        <meshStandardMaterial
          color={beaconColor}
          emissive={beaconColor}
          emissiveIntensity={isLocked ? 0.5 : isCompleted ? 1.0 : 1.8}
          roughness={0.2}
          metalness={0.6}
          transparent
          opacity={isCompleted ? 0.6 : 1.0}
        />
      </mesh>

      {/* Light beam going up */}
      <mesh ref={beamRef} position={[0, 4, 0]}>
        <cylinderGeometry args={[0.25, 0.45, 8, 16, 1, true]} />
        <meshBasicMaterial
          color={beaconColor}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Completed checkmark */}
      {isCompleted && (
        <mesh position={[0, 1.0, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.55, 0.08, 8, 24]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={1.5}
          />
        </mesh>
      )}

      {/* Lock indicator for locked beacons */}
      {isLocked && (
        <mesh position={[0, 1.6, 0]}>
          <boxGeometry args={[0.35, 0.35, 0.35]} />
          <meshStandardMaterial
            color="#1e293b"
            emissive="#475569"
            emissiveIntensity={0.4}
            roughness={0.6}
            metalness={0.4}
          />
        </mesh>
      )}

      {/* 3D text label (uses troika-three-text, no React portal — avoids
          the React 19 "synchronously unmount a root" race that drei's
          <Html> triggers when the parent re-renders during a mission open.) */}
      <Billboard position={[0, 2.5, 0]}>
        <Text
          font="/fonts/DejaVuSans.ttf"
          fontSize={0.34}
          letterSpacing={0.08}
          color={isLocked ? "#cbd5e1" : "#ffffff"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#05060f"
          material-toneMapped={false}
        >
          {mission.codename}
        </Text>
        <Text
          position={[0, -0.42, 0]}
          font="/fonts/DejaVuSans.ttf"
          fontSize={0.22}
          letterSpacing={0.05}
          color={
            isLocked
              ? "#94a3b8"
              : isCompleted
              ? "#86efac"
              : isNearby
              ? "#67e8f9"
              : "#bae6fd"
          }
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.018}
          outlineColor="#05060f"
          material-toneMapped={false}
        >
          {isLocked
            ? "LOCKED"
            : isCompleted
            ? "RESOLVED"
            : isNearby
            ? "PRESS SPACE"
            : "AVAILABLE"}
        </Text>
      </Billboard>
    </group>
  );
}

// Memoize so the beacon only re-renders when its own props change
// (status / isNearby). Prevents re-renders cascading from Scene when
// unrelated store state (e.g. dialogOpen) changes.
const MemoizedMissionBeacon = memo(MissionBeacon);
export default MemoizedMissionBeacon;
