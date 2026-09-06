import { Float, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const BRAND = "#34d399";
const NODE_COUNT = 28;

function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    points.push(new THREE.Vector3(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius));
  }
  return points;
}

/** Wireframe globe with trade "nodes" and pulsing links between them. */
function Globe() {
  const group = useRef<THREE.Group>(null);
  const nodes = useMemo(() => fibonacciSphere(NODE_COUNT, 1.6), []);
  const links = useMemo(() => {
    const out: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < nodes.length; i += 3) {
      const a = nodes[i];
      const b = nodes[(i * 7 + 5) % nodes.length];
      if (a.distanceTo(b) < 2.6) out.push([a, b]);
    }
    return out;
  }, [nodes]);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.12;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.6, 2]} />
        <meshBasicMaterial color="#1e293b" wireframe transparent opacity={0.6} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.55, 32, 32]} />
        <meshStandardMaterial color="#020617" roughness={0.9} metalness={0.1} transparent opacity={0.85} />
      </mesh>
      {nodes.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[i % 4 === 0 ? 0.06 : 0.035, 12, 12]} />
          <meshStandardMaterial color={i % 4 === 0 ? BRAND : "#94a3b8"} emissive={i % 4 === 0 ? BRAND : "#000"} emissiveIntensity={0.8} />
        </mesh>
      ))}
      {links.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={BRAND} transparent opacity={0.45} lineWidth={1} />
      ))}
    </group>
  );
}

/** A "coin" ring orbiting the globe. */
function Orbit({ radius, speed, tilt, color }: { radius: number; speed: number; tilt: number; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (ref.current) ref.current.rotation.y += delta * speed;
  });
  return (
    <group ref={ref} rotation={[tilt, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.004, 8, 128]} />
        <meshBasicMaterial color="#334155" transparent opacity={0.8} />
      </mesh>
      <mesh position={[radius, 0, 0]}>
        <torusGeometry args={[0.12, 0.05, 16, 40]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.25} emissive={color} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

export function HeroScene() {
  return (
    <Canvas camera={{ position: [0, 0.6, 5.2], fov: 45 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 5, 3]} intensity={1.4} />
      <pointLight position={[-4, -2, -3]} intensity={0.8} color={BRAND} />
      <Stars radius={40} depth={20} count={1200} factor={3} saturation={0} fade speed={0.6} />
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
        <Globe />
        <Orbit radius={2.35} speed={0.5} tilt={0.5} color="#f7931a" />
        <Orbit radius={2.75} speed={-0.35} tilt={-0.35} color="#627eea" />
        <Orbit radius={3.1} speed={0.25} tilt={0.9} color={BRAND} />
      </Float>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.4} minPolarAngle={Math.PI / 3} maxPolarAngle={(2 * Math.PI) / 3} />
    </Canvas>
  );
}
