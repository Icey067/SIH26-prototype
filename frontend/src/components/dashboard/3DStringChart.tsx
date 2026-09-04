import React, { useState, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  RotateCcw,
  Train as TrainIcon,
  Shield,
  Wrench,
  Navigation,
  Building2,
  Building,
  Radio,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Train GLTF Models ───────────────────────────────────────────────────────

function BulletTrainModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.6 }: any) {
  const { scene } = useGLTF("/models/train-electric-bullet-a.glb");
  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}

function BulletCarriageModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.6 }: any) {
  const { scene } = useGLTF("/models/train-electric-bullet-b.glb");
  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}

function PassengerLocoModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.6 }: any) {
  const { scene } = useGLTF("/models/train-locomotive-passenger-a.glb");
  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}

function PassengerCarriageModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.6 }: any) {
  const { scene } = useGLTF("/models/train-electric-city-b.glb");
  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}

function DieselLocoModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.6 }: any) {
  const { scene } = useGLTF("/models/train-diesel-a.glb");
  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}

function ContainerCarriageModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.6 }: any) {
  const { scene } = useGLTF("/models/train-carriage-container-blue.glb");
  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}

function CoalCarriageModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.6 }: any) {
  const { scene } = useGLTF("/models/train-carriage-coal.glb");
  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}

// Track Rail Segment
function TrackModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.9 }: any) {
  const { scene } = useGLTF("/models/railroad-straight.glb");
  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}

// Damaged Track (Under Maintenance)
function DamagedTrackModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.9 }: any) {
  const { scene } = useGLTF("/models/railroad-damaged-straight.glb");
  return <primitive object={scene.clone()} position={position} rotation={rotation} scale={scale} />;
}

// ─── Building with Dark Matte Metallic Material Tint ─────────────────────────
function TintedBuildingModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
}: {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = child.material.clone();
        // Dark matte navy/slate tint so glowing tracks and trains pop
        child.material.color.multiplyScalar(0.42);
        child.material.roughness = 0.72;
        child.material.metalness = 0.28;
      }
    });
    return clone;
  }, [scene]);

  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}

// ─── Station Hub & Platform Terminals ─────────────────────────────────────────
function StationHub({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.015 }: any) {
  const { scene } = useGLTF("/models/station.glb");
  const cloned = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = child.material.clone();
        child.material.color.multiplyScalar(0.55);
        child.material.roughness = 0.6;
        child.material.metalness = 0.3;
      }
    });
    return clone;
  }, [scene]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={cloned} scale={scale} />

      {/* Subtle Cyan Floodlighting along station facade */}
      <pointLight color="#06b6d4" intensity={4.5} distance={18} position={[0, 4, 3]} />
      <pointLight color="#38bdf8" intensity={3.5} distance={15} position={[0, 3, -3]} />

      {/* Floating 3D Station Callout */}
      <Html position={[0, 7.5, 0]} center distanceFactor={14} zIndexRange={[60, 0]}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/90 border border-cyan-500/80 rounded shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-black text-white tracking-wider uppercase">PRAYAGRAJ JUNCTION (PRYJ)</span>
          <span className="text-cyan-400 font-bold">• CENTRAL TERMINAL</span>
        </div>
      </Html>
    </group>
  );
}

// ─── Isometric Cityscape Backdrop (GLTF Skyscrapers & Buildings) ─────────────
function IsometricCityscape() {
  return (
    <group>
      {/* Ground Substrate Base */}
      <mesh position={[0, -0.28, 0]} receiveShadow>
        <boxGeometry args={[70, 0.4, 60]} />
        <meshStandardMaterial color="#07090e" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Cyberpunk Glowing Street Grid Network */}
      <gridHelper args={[64, 42, "#06b6d4", "#131b28"]} position={[0, -0.06, 0]} />

      {/* Glowing Highway & Transit Arteries */}
      {[-9, 9].map((offsetZ) => (
        <mesh key={offsetZ} position={[0, -0.04, offsetZ]}>
          <planeGeometry args={[60, 0.3]} />
          <meshBasicMaterial color="#0284c7" transparent opacity={0.65} />
        </mesh>
      ))}

      {/* ─── Backside City Flank (Z < -7) ─────────────────────────────────── */}
      {/* Skyscraper Cluster 1 */}
      <TintedBuildingModel
        url="/models/building-skyscraper-a.glb"
        position={[-18, 0, -14]}
        rotation={[0, Math.PI / 4, 0]}
        scale={0.9}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-b.glb"
        position={[-13, 0, -16]}
        rotation={[0, 0, 0]}
        scale={0.85}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-c.glb"
        position={[-8, 0, -15]}
        rotation={[0, -Math.PI / 6, 0]}
        scale={0.9}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-d.glb"
        position={[8, 0, -15]}
        rotation={[0, Math.PI / 3, 0]}
        scale={0.95}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-e.glb"
        position={[14, 0, -16]}
        rotation={[0, 0, 0]}
        scale={0.85}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-a.glb"
        position={[19, 0, -14]}
        rotation={[0, -Math.PI / 4, 0]}
        scale={0.9}
      />

      {/* Mid-rise & Commercial Blocks (Back Row) */}
      <TintedBuildingModel
        url="/models/building-a.glb"
        position={[-22, 0, -11]}
        scale={0.85}
      />
      <TintedBuildingModel
        url="/models/building-d.glb"
        position={[-16, 0, -9.5]}
        scale={0.8}
      />
      <TintedBuildingModel
        url="/models/building-f.glb"
        position={[-11, 0, -10]}
        scale={0.8}
      />
      <TintedBuildingModel
        url="/models/building-e.glb"
        position={[11, 0, -10]}
        scale={0.8}
      />
      <TintedBuildingModel
        url="/models/building-h.glb"
        position={[16, 0, -9.5]}
        scale={0.8}
      />
      <TintedBuildingModel
        url="/models/building-j.glb"
        position={[22, 0, -11]}
        scale={0.85}
      />

      {/* ─── Frontside City Flank (Z > +7) ────────────────────────────────── */}
      {/* Industrial & Commercial Waterfront / Freight Logistics */}
      <TintedBuildingModel
        url="/models/building-skyscraper-b.glb"
        position={[-19, 0, 15]}
        rotation={[0, Math.PI, 0]}
        scale={0.85}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-c.glb"
        position={[-14, 0, 16]}
        scale={0.9}
      />
      <TintedBuildingModel
        url="/models/building-f.glb"
        position={[-8, 0, 12]}
        scale={0.85}
      />
      <TintedBuildingModel
        url="/models/building-m.glb"
        position={[0, 0, 13]}
        scale={0.85}
      />
      <TintedBuildingModel
        url="/models/building-k.glb"
        position={[8, 0, 12]}
        scale={0.85}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-d.glb"
        position={[15, 0, 16]}
        rotation={[0, Math.PI / 2, 0]}
        scale={0.9}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-a.glb"
        position={[20, 0, 14]}
        rotation={[0, -Math.PI / 3, 0]}
        scale={0.85}
      />

      {/* Low-Lying Atmospheric Miniature Clouds on City Edges */}
      {[-22, 22].map((cloudX) => (
        <group key={cloudX} position={[cloudX, 9, -16]}>
          <mesh>
            <sphereGeometry args={[5, 16, 16]} />
            <meshStandardMaterial color="#64748b" transparent opacity={0.15} roughness={1} />
          </mesh>
          <mesh position={[2, 1, 3]}>
            <sphereGeometry args={[4, 16, 16]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.1} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Parallel Railway Corridor Viaduct & Tracks ──────────────────────────────
function RailwayCorridorTracks() {
  const trackCount = 28;
  const spacing = 1.9;

  return (
    <group position={[0, 0, 0]}>
      {/* Ballasted Concrete Viaduct Bed */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[56, 0.22, 11]} />
        <meshStandardMaterial color="#0d111a" roughness={0.85} metalness={0.2} />
      </mesh>

      {/* Viaduct Side Curbs */}
      <mesh position={[0, 0.22, -5.4]}>
        <boxGeometry args={[56, 0.35, 0.3]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.22, 5.4]}>
        <boxGeometry args={[56, 0.35, 0.3]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      {/* Station Platforms along central stop */}
      <mesh position={[-2, 0.32, -4.8]} receiveShadow>
        <boxGeometry args={[14, 0.38, 1.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh position={[-2, 0.32, -1.6]} receiveShadow>
        <boxGeometry args={[14, 0.38, 1.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>

      {/* Station Platform Canopy Overhangs */}
      <mesh position={[-2, 1.8, -4.8]}>
        <boxGeometry args={[13.5, 0.08, 1.4]} />
        <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[-2, 1.8, -1.6]}>
        <boxGeometry args={[13.5, 0.08, 1.4]} />
        <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 3 Parallel Track Lines Assembled with GLB Models */}
      {/* Line 1: UP FAST LINE (Z = -3.2) */}
      <group position={[0, 0.16, -3.2]}>
        {Array.from({ length: trackCount }).map((_, i) => {
          const x = -26 + i * spacing;
          const isUnderMaintenance = x >= 3 && x <= 11;
          return isUnderMaintenance ? (
            <DamagedTrackModel key={`up-${i}`} position={[x, 0, 0]} />
          ) : (
            <TrackModel key={`up-${i}`} position={[x, 0, 0]} />
          );
        })}
      </group>

      {/* Line 2: DOWN FAST LINE (Z = 0.0) */}
      <group position={[0, 0.16, 0]}>
        {Array.from({ length: trackCount }).map((_, i) => {
          const x = -26 + i * spacing;
          return <TrackModel key={`dn-${i}`} position={[x, 0, 0]} />;
        })}
      </group>

      {/* Line 3: 3RD / LOOP OVERTAKE LINE (Z = 3.2) */}
      <group position={[0, 0.16, 3.2]}>
        {Array.from({ length: trackCount }).map((_, i) => {
          const x = -26 + i * spacing;
          const isUnderMaintenance = x >= 14 && x <= 22;
          return isUnderMaintenance ? (
            <DamagedTrackModel key={`loop-${i}`} position={[x, 0, 0]} />
          ) : (
            <TrackModel key={`loop-${i}`} position={[x, 0, 0]} />
          );
        })}
      </group>

      {/* Track Sector Line Labels along the edge */}
      <Text
        position={[-25, 0.45, -4.2]}
        fontSize={0.45}
        color="#06b6d4"
        anchorX="left"
        anchorY="bottom"
      >
        [TRACK 01 // UP FAST EXPRESS LINE]
      </Text>
      <Text
        position={[-25, 0.45, -0.9]}
        fontSize={0.45}
        color="#10b981"
        anchorX="left"
        anchorY="bottom"
      >
        [TRACK 02 // DOWN TRUNK MAINLINE]
      </Text>
      <Text
        position={[-25, 0.45, 2.3]}
        fontSize={0.45}
        color="#f59e0b"
        anchorX="left"
        anchorY="bottom"
      >
        [TRACK 03 // LOOP OVERTAKE & FREIGHT SIDING]
      </Text>
    </group>
  );
}

// ─── Train Fleets on Dedicated Tracks ────────────────────────────────────────
function LiveTrainFleet() {
  const vandeBharatRef = useRef<THREE.Group>(null);
  const rajdhaniRef = useRef<THREE.Group>(null);
  const freightRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    // 1. Vande Bharat moving on UP Line (Z = -3.2)
    if (vandeBharatRef.current) {
      vandeBharatRef.current.position.x += delta * 4.2;
      if (vandeBharatRef.current.position.x > 26) {
        vandeBharatRef.current.position.x = -26;
      }
    }

    // 2. Rajdhani trailing behind on UP Line (safe headway buffer)
    if (rajdhaniRef.current) {
      rajdhaniRef.current.position.x += delta * 3.6;
      if (rajdhaniRef.current.position.x > 26) {
        rajdhaniRef.current.position.x = -26;
      }
    }

    // 3. Freight Train moving in opposite direction on DOWN Line (Z = 0.0)
    if (freightRef.current) {
      freightRef.current.position.x -= delta * 2.8;
      if (freightRef.current.position.x < -26) {
        freightRef.current.position.x = 26;
      }
    }
  });

  return (
    <group>
      {/* ─── 1. VANDE BHARAT EXPRESS 22436 (UP Line, Lead Sector) ─────────── */}
      <group ref={vandeBharatRef} position={[14, 0.28, -3.2]}>
        <BulletTrainModel position={[1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <BulletCarriageModel position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <BulletCarriageModel position={[-1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

        <pointLight color="#38bdf8" intensity={4} distance={6} position={[3.2, 0.5, 0]} />

        <Html position={[0, 2.2, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-cyan-950/90 border border-cyan-400/80 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px]">
            <TrainIcon className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-wide">22436 VANDE BHARAT EXP</span>
              <span className="text-cyan-400 font-semibold">130 KM/H • ON-TIME • UP LINE</span>
            </div>
          </div>
        </Html>
      </group>

      {/* ─── 2. RAJDHANI EXPRESS 12424 (UP Line, Trailing Behind) ──────────── */}
      <group ref={rajdhaniRef} position={[-14, 0.28, -3.2]}>
        <PassengerLocoModel position={[1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <PassengerCarriageModel position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <PassengerCarriageModel position={[-1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

        <pointLight color="#06b6d4" intensity={3} distance={5} position={[3.2, 0.5, 0]} />

        <Html position={[0, 2.2, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-950/90 border border-blue-400/80 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px]">
            <TrainIcon className="w-3.5 h-3.5 text-blue-400" />
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-wide">12424 RAJDHANI EXP</span>
              <span className="text-blue-300 font-semibold">120 KM/H • HEADWAY BUFFER: 14M</span>
            </div>
          </div>
        </Html>
      </group>

      {/* ─── 3. BCNHL HEAVY FREIGHT (DOWN Line, Reverse Direction) ─────────── */}
      <group ref={freightRef} position={[2, 0.28, 0]}>
        <DieselLocoModel position={[-3.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <ContainerCarriageModel position={[-1.6, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <CoalCarriageModel position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <ContainerCarriageModel position={[1.6, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <CoalCarriageModel position={[3.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

        <pointLight color="#fbbf24" intensity={3} distance={5} position={[-4.5, 0.5, 0]} />

        <Html position={[0, 2.2, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900/90 border border-zinc-600 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px]">
            <TrainIcon className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-wide">BCNHL COAL 41108</span>
              <span className="text-zinc-400 font-semibold">65 KM/H • DN LINE NOMINAL</span>
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// ─── Physical Maintenance Blocks with Holographic Safety Cages ──────────────
function InSituMaintenanceBlocks() {
  const beaconRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beaconRef.current) {
      beaconRef.current.intensity = 2.5 + Math.sin(t * 6) * 1.5;
    }
  });

  return (
    <group>
      {/* ─── Block A-14: Track Renewal & Deep Screening (UP Line, KM 140) ──── */}
      <group position={[7.0, 0.4, -3.2]}>
        <mesh>
          <boxGeometry args={[8, 1.4, 1.6]} />
          <meshPhysicalMaterial
            color="#f59e0b"
            transmission={0.8}
            roughness={0.2}
            transparent
            opacity={0.35}
            emissive="#f59e0b"
            emissiveIntensity={0.3}
          />
        </mesh>

        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(8, 1.4, 1.6)]} />
          <lineBasicMaterial color="#fbbf24" linewidth={2} />
        </lineSegments>

        <pointLight ref={beaconRef} color="#f59e0b" intensity={3} distance={8} position={[0, 1.2, 0]} />

        <Html position={[0, 2.2, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/90 border border-amber-500/80 rounded shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px] animate-pulse">
            <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-amber-200 uppercase tracking-wide">
                BLOCK A-14 [TMS BCM DEEP SCREENING]
              </span>
              <span className="text-amber-400 font-semibold">
                KM 126 TO 204 • TSR 30 KM/H • SHADOW TDMS ACTIVE
              </span>
            </div>
          </div>
        </Html>
      </group>

      {/* ─── Block B-09: Signal Point Machine Renewal (Loop Line, KM 210) ──── */}
      <group position={[18.0, 0.4, 3.2]}>
        <mesh>
          <boxGeometry args={[8, 1.4, 1.6]} />
          <meshPhysicalMaterial
            color="#10b981"
            transmission={0.8}
            roughness={0.2}
            transparent
            opacity={0.35}
            emissive="#10b981"
            emissiveIntensity={0.3}
          />
        </mesh>

        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(8, 1.4, 1.6)]} />
          <lineBasicMaterial color="#34d399" linewidth={2} />
        </lineSegments>

        <pointLight color="#10b981" intensity={2} distance={6} position={[0, 1.2, 0]} />

        <Html position={[0, 2.2, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/90 border border-emerald-500/80 rounded shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px]">
            <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-emerald-200 uppercase tracking-wide">
                BLOCK B-09 [SMMS POINT MACHINE]
              </span>
              <span className="text-emerald-400 font-semibold">
                INTERLOCKED TURNOUT #44 • OVERTAKE CLEAR
              </span>
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// ─── Camera Tilt-Shift & Orbit Controller ────────────────────────────────────
function CorridorCameraController({ resetTrigger }: { resetTrigger: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  React.useEffect(() => {
    // Zoomed-in, high-contrast isometric perspective
    camera.position.set(12, 14, 16);
    camera.lookAt(0, 0, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [resetTrigger]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      maxPolarAngle={Math.PI / 2.15}
      minPolarAngle={0.1}
      maxDistance={38}
      minDistance={7}
    />
  );
}

// ─── Fallback Loader for 3D Assets ───────────────────────────────────────────
function ModelLoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-3 px-4 py-2 bg-black/80 border border-cyan-500/40 rounded-full font-mono text-xs text-cyan-400 shadow-2xl backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>LOADING DIGITAL TWIN 3D CORRIDOR &amp; STATION ASSETS...</span>
      </div>
    </Html>
  );
}

// ─── Main 3D Digital Twin Component ──────────────────────────────────────────
export const ThreeDStringChart: React.FC = () => {
  const [resetKey, setResetKey] = useState(0);

  return (
    <Card className="w-full bg-[#050505] border-zinc-800 shadow-2xl overflow-hidden text-white font-sans">
      {/* Tactical Header Bar */}
      <CardHeader className="p-4 sm:p-5 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/80">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45 animate-pulse" />
            <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <span>ISOMETRIC 3D DIGITAL TWIN CORRIDOR</span>
              <span className="text-zinc-600 font-normal">//</span>
              <span className="text-cyan-400 font-mono text-xs font-bold">
                PRAYAGRAJ STATION &amp; CITYSCAPE
              </span>
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
            <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-cyan-400 font-mono text-[10px]">
              GZB-CNB 440 KM CORRIDOR
            </Badge>
            <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-emerald-400 font-mono text-[10px]">
              STATION.GLB ANCHORED
            </Badge>
            <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-amber-400 font-mono text-[10px]">
              IN-SITU SHADOW BUNDLE
            </Badge>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetKey((k) => k + 1)}
            className="bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>RESET ISOMETRIC VIEW</span>
          </Button>
        </div>
      </CardHeader>

      {/* 3D WebGL Canvas Viewport */}
      <CardContent className="p-0 relative w-full h-[620px] bg-[#050505]">
        <Canvas
          camera={{ position: [12, 14, 16], fov: 42 }}
          gl={{ antialias: true, alpha: false }}
          shadows
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          <color attach="background" args={["#050505"]} />

          {/* Lighting Rig tailored for dark architectural isometric miniatures */}
          <ambientLight color="#0ea5e9" intensity={0.7} />
          <directionalLight
            position={[20, 30, 18]}
            intensity={2.4}
            color="#ffffff"
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-18, 12, -14]} intensity={0.8} color="#06b6d4" />

          {/* Tilt-Shift Camera Controller */}
          <CorridorCameraController resetTrigger={resetKey} />

          <Suspense fallback={<ModelLoadingFallback />}>
            {/* 1. Procedural Dark City Blocks & GLTF Skyscraper Cityscape */}
            <IsometricCityscape />

            {/* 2. Central Station Hub with Floodlighting */}
            <StationHub position={[-2, 0.22, -6.8]} rotation={[0, 0, 0]} />

            {/* 3. Concrete Viaduct with 3 Parallel GLB Tracks & Platforms */}
            <RailwayCorridorTracks />

            {/* 4. Live 3D Train Models moving along physical tracks */}
            <LiveTrainFleet />

            {/* 5. Physical Track Possession Blocks with Holographic Safety Cages */}
            <InSituMaintenanceBlocks />
          </Suspense>
        </Canvas>

        {/* On-Screen HUD Interactive Legend & Control Advice */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono bg-black/80 backdrop-blur-md border border-zinc-800/90 p-3 rounded">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-zinc-500 font-bold uppercase tracking-wider">CORRIDOR FLEET:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#38bdf8]" />
              <span className="text-zinc-300">Vande Bharat 22436 (UP Fast)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#06b6d4]" />
              <span className="text-zinc-300">Rajdhani 12424 (WAP-7 Lead)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#fbbf24]" />
              <span className="text-zinc-300">BCNHL Freight (DN Mainline)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/70 border border-amber-400" />
              <span className="text-amber-300">Block A-14 (UP Damaged Rail)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/70 border border-emerald-400" />
              <span className="text-emerald-300">Block B-09 (Turnout #44)</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-zinc-400 font-semibold">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>DRAG TO ROTATE TILT-SHIFT • SCROLL TO ZOOM INTO STATION &amp; TRACKS</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThreeDStringChart;
