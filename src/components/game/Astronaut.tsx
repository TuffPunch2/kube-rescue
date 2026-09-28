"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";
import { useKeyboardControls, type MovementKeys } from "./useKeyboardControls";
import { joystickInput } from "./joystickInput";

interface AstronautProps {
  // Refs that the parent reads to detect proximity to beacons.
  positionRef: React.MutableRefObject<THREE.Vector3>;
  controlsEnabledRef: React.MutableRefObject<boolean>;
  initialPosition?: [number, number, number];
  playerName: string;
}

const WORLD_BOUNDS = {
  // Hexagonal-ish cluster area bounds
  minX: -22,
  maxX: 22,
  minZ: -22,
  maxZ: 22,
};

const SPEED = 7.0; // units per second
const TURN_LERP = 0.18;
const ACCEL = 18.0;
const DAMP = 8.0;
const CAMERA_OFFSET = new THREE.Vector3(0, 11, 13);
const CAMERA_LOOK_OFFSET = new THREE.Vector3(0, 1.5, 0);

export default function Astronaut({
  positionRef,
  controlsEnabledRef,
  initialPosition = [0, 0, 0],
  playerName,
}: AstronautProps) {
  const group = useRef<THREE.Group>(null);
  const visorRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  // Track movement input + current velocity for smooth accel/damping
  const keys = useRef<MovementKeys>({
    forward: false,
    back: false,
    left: false,
    right: false,
  });
  const velocity = useRef(new THREE.Vector3());
  const facing = useRef(0); // radians, 0 = +Z forward
  const walkPhase = useRef(0); // for limb swing animation

  const { camera } = useThree();

  useKeyboardControls(keys, controlsEnabledRef);

  // Initialise position once on mount (effect, not memo — side effect).
  useEffect(() => {
    positionRef.current.set(...initialPosition);
    if (group.current) {
      group.current.position.copy(positionRef.current);
    }
    camera.position.set(
      initialPosition[0] + CAMERA_OFFSET.x,
      initialPosition[1] + CAMERA_OFFSET.y,
      initialPosition[2] + CAMERA_OFFSET.z
    );
    camera.lookAt(initialPosition[0], initialPosition[1] + 1.5, initialPosition[2]);
    // Empty deps array is intentional — one-time setup only.
  }, []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);

    // Build input vector in world space (relative to camera)
    const k = keys.current;
    let inputX = 0;
    let inputZ = 0;
    if (k.forward) inputZ += 1;
    if (k.back) inputZ -= 1;
    if (k.right) inputX += 1;
    if (k.left) inputX -= 1;

    // Analog joystick (mobile): y < 0 is "up" = forward. Combined with keys
    // then clamped so diagonal keyboard + joystick input can't exceed 1.
    inputX += joystickInput.x;
    inputZ += joystickInput.y;
    const inputMag = Math.hypot(inputX, inputZ);
    if (inputMag > 1) {
      inputX /= inputMag;
      inputZ /= inputMag;
    }

    // Project input through camera yaw so up = away from camera
    // Compute camera yaw (rotation around Y)
    const camPos = camera.position;
    const dir = new THREE.Vector3(
      positionRef.current.x - camPos.x,
      0,
      positionRef.current.z - camPos.z
    ).normalize();
    // forward direction (camera → astronaut projected on XZ)
    const forward = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    const right = new THREE.Vector3().crossVectors(
      new THREE.Vector3(0, 1, 0),
      forward
    ).multiplyScalar(-1).normalize();

    const desired = new THREE.Vector3();
    if (inputX !== 0 || inputZ !== 0) {
      desired.addScaledVector(forward, inputZ);
      desired.addScaledVector(right, inputX);
      desired.normalize().multiplyScalar(SPEED);
    }

    // Acceleration / damping
    const vel = velocity.current;
    vel.x = THREE.MathUtils.damp(vel.x, desired.x, desired.lengthSq() > 0.01 ? ACCEL : DAMP, dt);
    vel.z = THREE.MathUtils.damp(vel.z, desired.z, desired.lengthSq() > 0.01 ? ACCEL : DAMP, dt);

    // Apply position
    const newPos = positionRef.current.clone().addScaledVector(vel, dt);
    // Bounds with soft clamp
    newPos.x = THREE.MathUtils.clamp(newPos.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
    newPos.z = THREE.MathUtils.clamp(newPos.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
    positionRef.current.copy(newPos);
    g.position.copy(newPos);

    // Rotate to face movement direction
    if (vel.lengthSq() > 0.01) {
      const targetAngle = Math.atan2(vel.x, vel.z);
      // Shortest angular distance
      let diff = targetAngle - facing.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      facing.current += diff * TURN_LERP;
      g.rotation.y = facing.current;
    }

    // Walk animation: leg/arm swing scaled by speed
    const speedMag = vel.length();
    const moving = speedMag > 0.05;
    if (moving) {
      walkPhase.current += dt * (4 + speedMag * 0.6);
    } else {
      walkPhase.current = 0;
    }
    const swing = Math.sin(walkPhase.current) * (moving ? 0.35 : 0);
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;

    // Subtle body bob + idle breathing
    if (bodyRef.current) {
      const bob = moving ? Math.abs(Math.sin(walkPhase.current * 2)) * 0.06 : Math.sin(performance.now() * 0.002) * 0.04;
      bodyRef.current.position.y = bob;
    }
    // Visor subtle emissive pulse
    if (visorRef.current) {
      const mat = visorRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.45 + Math.sin(performance.now() * 0.003) * 0.15;
    }

    // Camera follow (smoothed)
    const desiredCam = new THREE.Vector3(
      positionRef.current.x + CAMERA_OFFSET.x,
      CAMERA_OFFSET.y,
      positionRef.current.z + CAMERA_OFFSET.z
    );
    camera.position.lerp(desiredCam, 1 - Math.pow(0.001, dt));
    const lookTarget = new THREE.Vector3(
      positionRef.current.x + CAMERA_LOOK_OFFSET.x,
      positionRef.current.y + CAMERA_LOOK_OFFSET.y,
      positionRef.current.z + CAMERA_LOOK_OFFSET.z
    );
    camera.lookAt(lookTarget);
  });

  return (
    <group ref={group} position={initialPosition}>
      {/* Body group bobs for walking */}
      <group ref={bodyRef}>
        {/* Torso (white spacesuit) */}
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.42, 0.7, 8, 16]} />
          <meshStandardMaterial color="#f5f7fb" roughness={0.55} metalness={0.05} />
        </mesh>

        {/* Chest life-support patch */}
        <mesh position={[0, 1.2, 0.43]} castShadow>
          <boxGeometry args={[0.35, 0.32, 0.04]} />
          <meshStandardMaterial
            color="#0b1f3a"
            emissive="#22d3ee"
            emissiveIntensity={0.45}
            roughness={0.4}
            metalness={0.2}
          />
        </mesh>

        {/* Backpack */}
        <mesh position={[0, 1.1, -0.45]} castShadow>
          <boxGeometry args={[0.55, 0.85, 0.32]} />
          <meshStandardMaterial color="#e5e9f0" roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Backpack antennas */}
        <mesh position={[-0.18, 1.62, -0.45]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0.18, 1.62, -0.45]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.35, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Glow indicator */}
        <mesh position={[0, 0.75, -0.62]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial
            color="#22d3ee"
            emissive="#22d3ee"
            emissiveIntensity={1.2}
          />
        </mesh>

        {/* Helmet */}
        <mesh position={[0, 1.92, 0]} castShadow>
          <sphereGeometry args={[0.4, 24, 24]} />
          <meshStandardMaterial color="#fafbff" roughness={0.4} metalness={0.1} />
        </mesh>
        {/* Visor */}
        <mesh ref={visorRef} position={[0, 1.9, 0.18]} rotation={[0, 0, 0]}>
          <sphereGeometry
            args={[0.32, 24, 24, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.25, Math.PI * 0.5]}
          />
          <meshStandardMaterial
            color="#0a0a18"
            emissive="#38bdf8"
            emissiveIntensity={0.5}
            roughness={0.1}
            metalness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Arms */}
        <group ref={leftArmRef} position={[-0.55, 1.42, 0]}>
          <mesh position={[0, -0.35, 0]} castShadow>
            <capsuleGeometry args={[0.13, 0.6, 6, 12]} />
            <meshStandardMaterial color="#f5f7fb" roughness={0.55} metalness={0.05} />
          </mesh>
          {/* Glove */}
          <mesh position={[0, -0.72, 0]} castShadow>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.2} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.55, 1.42, 0]}>
          <mesh position={[0, -0.35, 0]} castShadow>
            <capsuleGeometry args={[0.13, 0.6, 6, 12]} />
            <meshStandardMaterial color="#f5f7fb" roughness={0.55} metalness={0.05} />
          </mesh>
          <mesh position={[0, -0.72, 0]} castShadow>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.2} />
          </mesh>
        </group>
      </group>

      {/* Legs */}
      <group ref={leftLegRef} position={[-0.18, 0.62, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.55, 6, 12]} />
          <meshStandardMaterial color="#f5f7fb" roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.68, 0.06]} castShadow>
          <boxGeometry args={[0.22, 0.16, 0.32]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.3} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.18, 0.62, 0]}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.15, 0.55, 6, 12]} />
          <meshStandardMaterial color="#f5f7fb" roughness={0.6} metalness={0.05} />
        </mesh>
        <mesh position={[0, -0.68, 0.06]} castShadow>
          <boxGeometry args={[0.22, 0.16, 0.32]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.3} />
        </mesh>
      </group>

      {/* 3D name tag — Text/Billboard instead of Html to avoid the
          React 19 "synchronously unmount a root" race condition. */}
      <Billboard position={[0, 2.6, 0]}>
        <Text
          font="/fonts/DejaVuSans.ttf"
          fontSize={0.32}
          letterSpacing={0.06}
          color="#67e8f9"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#05060f"
          material-toneMapped={false}
        >
          {(playerName || "Anonymous Cadet").toUpperCase()}
        </Text>
      </Billboard>
    </group>
  );
}
