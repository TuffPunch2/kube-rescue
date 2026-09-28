"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars, Float } from "@react-three/drei";
import * as THREE from "three";

// Decorative floating "nodes" and "pods" that suggest a Kubernetes
// cluster floating in space. Purely visual - collision is bounded by
// WORLD_BOUNDS in the Astronaut component.

interface FloatNodeProps {
  position: [number, number, number];
  scale?: number;
  color?: string;
  speed?: number;
}

function FloatNode({
  position,
  scale = 1,
  color = "#38bdf8",
  speed = 1,
}: FloatNodeProps) {
  return (
    <Float speed={speed} rotationIntensity={0.4} floatIntensity={0.6}>
      <group position={position} scale={scale}>
        {/* Hex frame */}
        <mesh>
          <cylinderGeometry args={[1, 1, 0.18, 6]} />
          <meshStandardMaterial
            color="#0b1f3a"
            emissive={color}
            emissiveIntensity={0.35}
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
        {/* Inner ring */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.65, 0.65, 0.06, 6]} />
          <meshStandardMaterial
            color="#1e293b"
            emissive={color}
            emissiveIntensity={0.7}
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>
        {/* Center light */}
        <mesh position={[0, 0.18, 0]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.5}
          />
        </mesh>
      </group>
    </Float>
  );
}

interface PodCubeProps {
  position: [number, number, number];
  color: string;
  label: string;
}

function PodCube({ position, color, label }: PodCubeProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.2;
    }
  });
  return (
    <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={ref} position={position}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
          <meshStandardMaterial
            color="#0b1228"
            emissive={color}
            emissiveIntensity={0.4}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
        {/* Wire edges */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(0.81, 0.81, 0.81)]} />
          <lineBasicMaterial color={color} transparent opacity={0.7} />
        </lineSegments>
        {/* Top light */}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.8}
          />
        </mesh>
      </group>
    </Float>
  );
}

export default function KubeCluster() {
  // Generate a hex-tiled floor
  const hexTiles = useMemo(() => {
    const tiles: { x: number; z: number; phase: number }[] = [];
    const R = 1.5;
    const cols = 17;
    const rows = 17;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - cols / 2) * R * 1.5;
        const z = (r - rows / 2) * R * Math.sqrt(3) + (c % 2 ? R * Math.sqrt(3) / 2 : 0);
        const dist = Math.sqrt(x * x + z * z);
        if (dist > 30) continue;
        tiles.push({ x, z, phase: dist * 0.3 });
      }
    }
    return tiles;
  }, []);

  // Precompute decorative element positions
  const decorativeNodes = useMemo(() => {
    const arr: { position: [number, number, number]; color: string; scale: number; speed: number }[] = [
      { position: [-17, 4, -14], color: "#38bdf8", scale: 1.2, speed: 1.0 },
      { position: [18, 5, -12], color: "#a855f7", scale: 1.5, speed: 0.8 },
      { position: [16, 3, 16], color: "#22c55e", scale: 1.0, speed: 1.2 },
      { position: [-16, 6, 18], color: "#f97316", scale: 1.3, speed: 0.9 },
      { position: [0, 8, 22], color: "#fbbf24", scale: 1.8, speed: 0.6 },
      { position: [-22, 7, 4], color: "#06b6d4", scale: 1.4, speed: 1.1 },
      { position: [22, 6, 6], color: "#ec4899", scale: 1.1, speed: 1.0 },
      { position: [0, 10, -22], color: "#8b5cf6", scale: 1.6, speed: 0.7 },
    ];
    return arr;
  }, []);

  const pods = useMemo(() => {
    const colors = ["#38bdf8", "#a855f7", "#22c55e", "#f97316", "#fbbf24", "#ec4899", "#06b6d4"];
    const arr: { position: [number, number, number]; color: string; label: string }[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + 0.3;
      const radius = 26 + (i % 3) * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 3 + ((i * 1.7) % 6);
      arr.push({
        position: [x, y, z],
        color: colors[i % colors.length],
        label: `pod-${i.toString().padStart(2, "0")}`,
      });
    }
    return arr;
  }, []);

  // Animated emissive floor tiles
  const floorRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!floorRef.current) return;
    floorRef.current.children.forEach((child, idx) => {
      const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (!m) return;
      const phase = hexTiles[idx]?.phase ?? 0;
      m.emissiveIntensity = 0.18 + Math.sin(clock.getElapsedTime() * 0.6 + phase) * 0.12;
    });
  });

  return (
    <>
      {/* Distant starfield */}
      <Stars radius={120} depth={60} count={4000} factor={4} saturation={0} fade speed={0.4} />

      {/* Big nebula plane in the distance */}
      <mesh position={[0, 0, -80]}>
        <planeGeometry args={[220, 140]} />
        <meshBasicMaterial
          color="#0c1530"
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Hex floor */}
      <group ref={floorRef}>
        {hexTiles.map((t, i) => (
          <mesh
            key={i}
            position={[t.x, 0, t.z]}
            rotation={[0, Math.PI / 6, 0]}
            receiveShadow
          >
            <cylinderGeometry args={[1.45, 1.45, 0.05, 6]} />
            <meshStandardMaterial
              color="#0b1228"
              emissive="#22d3ee"
              emissiveIntensity={0.18}
              roughness={0.6}
              metalness={0.3}
            />
          </mesh>
        ))}
      </group>

      {/* Border ring (cluster boundary) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[29.5, 30, 64]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={1.4}
          roughness={0.3}
          metalness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[28.2, 28.5, 64]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#a855f7"
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating nodes around the cluster */}
      {decorativeNodes.map((n, i) => (
        <FloatNode
          key={i}
          position={n.position}
          color={n.color}
          scale={n.scale}
          speed={n.speed}
        />
      ))}

      {/* Orbiting pod cubes */}
      {pods.map((p, i) => (
        <PodCube key={i} position={p.position} color={p.color} label={p.label} />
      ))}

      {/* Center control-tower beacon (decorative, the final mission lives here) */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2, 6]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={0.3}
            transparent
            opacity={0.35}
          />
        </mesh>
      </group>
    </>
  );
}
