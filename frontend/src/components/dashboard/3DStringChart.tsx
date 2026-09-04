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
  Zap,
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
        // Architectural matte slate/navy tint with crisp specular reflection
        child.material.color.multiplyScalar(0.58);
        child.material.roughness = 0.65;
        child.material.metalness = 0.35;
      }
    });
    return clone;
  }, [scene]);

  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}

// ─── Central Station Hub & Platform Terminal ─────────────────────────────────
function StationHub({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.015 }: any) {
  const { scene } = useGLTF("/models/station.glb");
  const cloned = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = child.material.clone();
        child.material.color.multiplyScalar(0.72);
        child.material.roughness = 0.55;
        child.material.metalness = 0.45;
      }
    });
    return clone;
  }, [scene]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={cloned} scale={scale} />

      {/* Cyan High-Intensity Floodlighting along station concourse */}
      <pointLight color="#00f0ff" intensity={6.0} distance={22} position={[0, 4.5, 3]} />
      <pointLight color="#38bdf8" intensity={4.5} distance={18} position={[0, 3.5, -3]} />

      {/* Floating 3D Station Callout */}
      <Html position={[0, 7.5, 0]} center distanceFactor={14} zIndexRange={[60, 0]}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/90 border border-cyan-400 rounded shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-black text-white tracking-wider uppercase">PRAYAGRAJ JUNCTION (PRYJ)</span>
          <span className="text-cyan-400 font-bold">• CENTRAL TERMINAL HUB</span>
        </div>
      </Html>
    </group>
  );
}

// ─── Realistic Continuous Railway Track Component ─────────────────────────────
interface SingleTrackProps {
  z: number;
  label: string;
  badgeColor: string;
  hasMaintenance?: boolean;
  maintenanceStart?: number;
  maintenanceEnd?: number;
}

function ContinuousTrackLine({
  z,
  label,
  badgeColor,
  hasMaintenance = false,
  maintenanceStart = 4,
  maintenanceEnd = 12,
}: SingleTrackProps) {
  const trackLength = 58;
  const sleeperSpacing = 0.72;
  const sleeperCount = Math.floor(trackLength / sleeperSpacing);
  const pulseRef = useRef<THREE.Mesh>(null);

  // Animated electrical signal packet traveling down the third-rail circuit
  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const speed = z < 0 ? 9.0 : 6.5;
      const t = clock.getElapsedTime() * speed;
      pulseRef.current.position.x = ((t % trackLength) - trackLength / 2);
    }
  });

  return (
    <group position={[0, 0, z]}>
      {/* 1. Elevated Ballast Bed (Dark Gravel Stone Embankment) */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[trackLength, 0.16, 2.0]} />
        <meshStandardMaterial color="#141923" roughness={0.92} metalness={0.15} />
      </mesh>

      {/* Ballast Chamfered Edges */}
      <mesh position={[0, 0.04, -1.05]}>
        <boxGeometry args={[trackLength, 0.08, 0.15]} />
        <meshStandardMaterial color="#0f131a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.04, 1.05]}>
        <boxGeometry args={[trackLength, 0.08, 0.15]} />
        <meshStandardMaterial color="#0f131a" roughness={0.95} />
      </mesh>

      {/* 2. Concrete Railway Sleepers (Cross Ties) */}
      {Array.from({ length: sleeperCount }).map((_, i) => {
        const x = -trackLength / 2 + i * sleeperSpacing;
        const isDamaged = hasMaintenance && x >= maintenanceStart && x <= maintenanceEnd;

        return (
          <group key={i} position={[x, 0.18, 0]}>
            {/* Sleeper Body */}
            <mesh receiveShadow castShadow>
              <boxGeometry args={[0.28, 0.07, 1.5]} />
              <meshStandardMaterial
                color={isDamaged ? "#78350f" : "#475569"}
                roughness={0.78}
                metalness={0.2}
              />
            </mesh>

            {/* Metal Rail Anchor Fastener Plates */}
            <mesh position={[0, 0.045, -0.45]}>
              <boxGeometry args={[0.18, 0.03, 0.14]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.045, 0.45]}>
              <boxGeometry args={[0.18, 0.03, 0.14]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
            </mesh>
          </group>
        );
      })}

      {/* 3. Left Steel Rail (Polished Specular Steel) */}
      <mesh position={[0, 0.28, -0.45]} castShadow receiveShadow>
        <boxGeometry args={[trackLength, 0.12, 0.07]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.95}
          roughness={0.12}
        />
      </mesh>
      {/* Left Rail Shiny Crown Highlight */}
      <mesh position={[0, 0.345, -0.45]}>
        <boxGeometry args={[trackLength, 0.02, 0.04]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* 4. Right Steel Rail (Polished Specular Steel) */}
      <mesh position={[0, 0.28, 0.45]} castShadow receiveShadow>
        <boxGeometry args={[trackLength, 0.12, 0.07]} />
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.95}
          roughness={0.12}
        />
      </mesh>
      {/* Right Rail Shiny Crown Highlight */}
      <mesh position={[0, 0.345, 0.45]}>
        <boxGeometry args={[trackLength, 0.02, 0.04]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* 5. Glowing Electric Track Circuit Signaling Line (High-Tech Center Guide) */}
      <mesh position={[0, 0.19, 0]}>
        <boxGeometry args={[trackLength, 0.02, 0.08]} />
        <meshStandardMaterial
          color={hasMaintenance ? "#f59e0b" : "#00f0ff"}
          emissive={hasMaintenance ? "#d97706" : "#00f0ff"}
          emissiveIntensity={2.5}
        />
      </mesh>

      {/* Animated Traveling Photon Pulse on Center Track Guide */}
      <mesh ref={pulseRef} position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
        <pointLight color="#00f0ff" intensity={3.5} distance={3.5} />
      </mesh>

      {/* 6. Track Sector Identification Label */}
      <Text
        position={[-27, 0.55, -0.85]}
        fontSize={0.42}
        color={badgeColor}
        anchorX="left"
        anchorY="bottom"
      >
        {label}
      </Text>
    </group>
  );
}

// ─── Overhead Railway Electrification Gantries (OHE Portals) ──────────────────
function OverheadCatenaryGantries() {
  const gantryX = [-22, -14, -6, 2, 10, 18, 26];

  return (
    <group>
      {/* Continuous Overhead Electric Catenary Wires above each of the 3 tracks */}
      {[-3.2, 0, 3.2].map((wireZ) => (
        <group key={`wire-${wireZ}`}>
          {/* Main Contact Wire (carrying 25kV traction power) */}
          <mesh position={[0, 2.75, wireZ]}>
            <boxGeometry args={[58, 0.03, 0.03]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.8} />
          </mesh>
          {/* Upper Messenger Wire */}
          <mesh position={[0, 3.15, wireZ]}>
            <boxGeometry args={[58, 0.02, 0.02]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Lattice Portal Gantries Spanning the 3 Tracks */}
      {gantryX.map((x, idx) => (
        <group key={`gantry-${x}`} position={[x, 0, 0]}>
          {/* Left Vertical Steel Mast */}
          <mesh position={[0, 1.7, -4.9]} castShadow>
            <boxGeometry args={[0.22, 3.4, 0.22]} />
            <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Right Vertical Steel Mast */}
          <mesh position={[0, 1.7, 4.9]} castShadow>
            <boxGeometry args={[0.22, 3.4, 0.22]} />
            <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
          </mesh>
          {/* Horizontal Cross-Beam Truss */}
          <mesh position={[0, 3.3, 0]} castShadow>
            <boxGeometry args={[0.28, 0.25, 10.1]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
          </mesh>

          {/* Insulator Drop Arms with Track Signal Indicators */}
          {[-3.2, 0, 3.2].map((z, sIdx) => {
            const isGreen = idx % 2 === 0 || sIdx === 0;
            const signalColor = isGreen ? "#10b981" : "#f59e0b";

            return (
              <group key={`sig-${z}`} position={[0, 3.0, z]}>
                {/* Insulator drop */}
                <mesh position={[0, 0.1, 0]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
                  <meshStandardMaterial color="#94a3b8" />
                </mesh>

                {/* Overhead LED Signal Head */}
                <mesh position={[0, -0.2, 0.2]}>
                  <boxGeometry args={[0.15, 0.22, 0.12]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
                <mesh position={[0, -0.2, 0.27]}>
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshBasicMaterial color={signalColor} />
                </mesh>
                <pointLight color={signalColor} intensity={1.2} distance={3} position={[0, -0.2, 0.35]} />
              </group>
            );
          })}
        </group>
      ))}
    </group>
  );
}

// ─── Parallel Railway Corridor Viaduct & Passenger Platforms ──────────────────
function RailwayCorridorTracks() {
  return (
    <group position={[0, 0, 0]}>
      {/* Main Elevated Concrete Viaduct Deck Bed */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[58, 0.16, 11.4]} />
        <meshStandardMaterial color="#0f141f" roughness={0.85} metalness={0.25} />
      </mesh>

      {/* Viaduct Reinforced Concrete Side Parapet Curbs */}
      <mesh position={[0, 0.22, -5.6]} castShadow receiveShadow>
        <boxGeometry args={[58, 0.38, 0.35]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 5.6]} castShadow receiveShadow>
        <boxGeometry args={[58, 0.38, 0.35]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>

      {/* Track Line 1: UP FAST EXPRESS LINE (Z = -3.2) */}
      <ContinuousTrackLine
        z={-3.2}
        label="[TRACK 01 // UP FAST EXPRESS LINE]"
        badgeColor="#00f0ff"
        hasMaintenance={true}
        maintenanceStart={3}
        maintenanceEnd={11}
      />

      {/* Track Line 2: DOWN TRUNK MAINLINE (Z = 0.0) */}
      <ContinuousTrackLine
        z={0.0}
        label="[TRACK 02 // DOWN TRUNK MAINLINE]"
        badgeColor="#10b981"
      />

      {/* Track Line 3: LOOP OVERTAKE & SIDING (Z = +3.2) */}
      <ContinuousTrackLine
        z={3.2}
        label="[TRACK 03 // LOOP OVERTAKE & FREIGHT SIDING]"
        badgeColor="#f59e0b"
        hasMaintenance={true}
        maintenanceStart={14}
        maintenanceEnd={22}
      />

      {/* Diagonal Track Crossover / Interlocked Turnout (Switch) */}
      <group position={[14, 0.18, 1.6]} rotation={[0, -Math.PI / 8.5, 0]}>
        <mesh position={[0, 0.08, -0.45]}>
          <boxGeometry args={[7.2, 0.1, 0.06]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.08, 0.45]}>
          <boxGeometry args={[7.2, 0.1, 0.06]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.15} />
        </mesh>
        <pointLight color="#10b981" intensity={2} distance={4} position={[0, 0.3, 0]} />
      </group>

      {/* Passenger Station Platforms */}
      {/* Platform 1 (between Track 1 and Station Hub at Z = -4.7) */}
      <group position={[-2, 0.28, -4.7]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[16, 0.36, 1.4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.3} />
        </mesh>
        {/* Yellow Textured Tactile Safety Edge Strip */}
        <mesh position={[0, 0.19, 0.65]}>
          <boxGeometry args={[16, 0.02, 0.12]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        {/* Modern Canopy Overhang */}
        <mesh position={[0, 2.0, 0]} castShadow>
          <boxGeometry args={[15.6, 0.08, 1.6]} />
          <meshStandardMaterial color="#0284c7" metalness={0.85} roughness={0.25} />
        </mesh>
        {[-6, 0, 6].map((px) => (
          <mesh key={`p1-col-${px}`} position={[px, 1.0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 2.0, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>
        ))}
        <Html position={[0, 1.5, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className="px-2 py-0.5 bg-cyan-950/90 border border-cyan-400/80 rounded text-[9px] font-mono text-cyan-300 font-bold uppercase whitespace-nowrap shadow-lg">
            PLATFORM 1 // UP MAIN
          </div>
        </Html>
      </group>

      {/* Platform 2 (Island Platform between Track 1 & Track 2 at Z = -1.6) */}
      <group position={[-2, 0.28, -1.6]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[16, 0.36, 1.4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.19, -0.65]}>
          <boxGeometry args={[16, 0.02, 0.12]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <mesh position={[0, 0.19, 0.65]}>
          <boxGeometry args={[16, 0.02, 0.12]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
        <mesh position={[0, 2.0, 0]} castShadow>
          <boxGeometry args={[15.6, 0.08, 1.6]} />
          <meshStandardMaterial color="#0284c7" metalness={0.85} roughness={0.25} />
        </mesh>
        {[-6, 0, 6].map((px) => (
          <mesh key={`p2-col-${px}`} position={[px, 1.0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 2.0, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>
        ))}
        <Html position={[0, 1.5, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className="px-2 py-0.5 bg-blue-950/90 border border-blue-400/80 rounded text-[9px] font-mono text-blue-300 font-bold uppercase whitespace-nowrap shadow-lg">
            PLATFORM 2 // DOWN MAIN
          </div>
        </Html>
      </group>

      {/* Overhead Catenary Gantries across the Viaduct */}
      <OverheadCatenaryGantries />
    </group>
  );
}

// ─── Active Cityscape Backdrop with Glowing Urban Circuit Arteries ───────────
function IsometricCityscape() {
  const pulseRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const t = clock.getElapsedTime();
      pulseRef.current.position.x = ((t * 4) % 60) - 30;
    }
  });

  return (
    <group>
      {/* Terrain Substrate */}
      <mesh position={[0, -0.3, 0]} receiveShadow>
        <boxGeometry args={[75, 0.4, 65]} />
        <meshStandardMaterial color="#0a0e1a" roughness={0.95} metalness={0.1} />
      </mesh>

      {/* Vibrant Cyan Cyberpunk Street Grid (matching user reference image) */}
      <gridHelper args={[70, 48, "#00f0ff", "#162238"]} position={[0, -0.06, 0]} />

      {/* Glowing Neon Highway Arteries with Curved Transit Ribbons */}
      {[-10, 10, -18, 18].map((offsetZ) => (
        <group key={`hwy-${offsetZ}`}>
          {/* Road Asphalt Bed */}
          <mesh position={[0, -0.04, offsetZ]}>
            <planeGeometry args={[65, 1.4]} />
            <meshStandardMaterial color="#111827" roughness={0.9} />
          </mesh>
          {/* Dual Cyan Glowing Center Stripes */}
          <mesh position={[0, -0.02, offsetZ - 0.2]}>
            <planeGeometry args={[65, 0.08]} />
            <meshBasicMaterial color="#00f0ff" />
          </mesh>
          <mesh position={[0, -0.02, offsetZ + 0.2]}>
            <planeGeometry args={[65, 0.08]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>
      ))}

      {/* Cross Arteries (North-South Avenues) */}
      {[-24, -12, 0, 12, 24].map((offsetX) => (
        <mesh key={`cross-${offsetX}`} position={[offsetX, -0.03, 0]}>
          <planeGeometry args={[1.2, 60]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
      ))}

      {/* Moving Traffic Light Photons on the Avenue Grid */}
      <group ref={pulseRef}>
        <pointLight color="#00f0ff" intensity={3.5} distance={10} position={[0, 0.5, -10]} />
        <pointLight color="#38bdf8" intensity={3.5} distance={10} position={[0, 0.5, 10]} />
      </group>

      {/* ─── Backside Skyscraper Horizon (Z < -7) ─────────────────────────── */}
      <TintedBuildingModel
        url="/models/building-skyscraper-a.glb"
        position={[-18, 0, -14]}
        rotation={[0, Math.PI / 4, 0]}
        scale={0.95}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-b.glb"
        position={[-13, 0, -16]}
        scale={0.9}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-c.glb"
        position={[-7, 0, -15]}
        rotation={[0, -Math.PI / 6, 0]}
        scale={0.95}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-d.glb"
        position={[8, 0, -15]}
        rotation={[0, Math.PI / 3, 0]}
        scale={1.0}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-e.glb"
        position={[14, 0, -16]}
        scale={0.9}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-a.glb"
        position={[20, 0, -14]}
        rotation={[0, -Math.PI / 4, 0]}
        scale={0.95}
      />

      {/* Backside Mid-Rise & Logistics Warehouses */}
      <TintedBuildingModel url="/models/building-a.glb" position={[-23, 0, -11]} scale={0.9} />
      <TintedBuildingModel url="/models/building-d.glb" position={[-16, 0, -9.5]} scale={0.85} />
      <TintedBuildingModel url="/models/building-f.glb" position={[-10, 0, -10]} scale={0.85} />
      <TintedBuildingModel url="/models/building-e.glb" position={[11, 0, -10]} scale={0.85} />
      <TintedBuildingModel url="/models/building-h.glb" position={[16, 0, -9.5]} scale={0.85} />
      <TintedBuildingModel url="/models/building-j.glb" position={[23, 0, -11]} scale={0.9} />

      {/* ─── Frontside Skyscraper Flank (Z > +7) ──────────────────────────── */}
      <TintedBuildingModel
        url="/models/building-skyscraper-b.glb"
        position={[-20, 0, 15]}
        rotation={[0, Math.PI, 0]}
        scale={0.9}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-c.glb"
        position={[-14, 0, 16]}
        scale={0.95}
      />
      <TintedBuildingModel
        url="/models/building-f.glb"
        position={[-8, 0, 12]}
        scale={0.9}
      />
      <TintedBuildingModel
        url="/models/building-m.glb"
        position={[0, 0, 13]}
        scale={0.9}
      />
      <TintedBuildingModel
        url="/models/building-k.glb"
        position={[8, 0, 12]}
        scale={0.9}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-d.glb"
        position={[16, 0, 16]}
        rotation={[0, Math.PI / 2, 0]}
        scale={0.95}
      />
      <TintedBuildingModel
        url="/models/building-skyscraper-a.glb"
        position={[22, 0, 14]}
        rotation={[0, -Math.PI / 3, 0]}
        scale={0.9}
      />

      {/* Rooftop Hazard Aviation Beacon Lights on Skyscraper Spires */}
      <pointLight color="#ef4444" intensity={3.5} distance={7} position={[-18, 9.5, -14]} />
      <pointLight color="#38bdf8" intensity={3.5} distance={7} position={[8, 10.5, -15]} />
      <pointLight color="#ef4444" intensity={3.5} distance={7} position={[16, 10.0, 16]} />

      {/* Atmospheric Miniature Clouds (Modeled after user reference image) */}
      {[-24, 24].map((cloudX) => (
        <group key={`cloud-${cloudX}`} position={[cloudX, 9, -16]}>
          <mesh>
            <sphereGeometry args={[5.5, 16, 16]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.22} roughness={1} />
          </mesh>
          <mesh position={[2, 1, 3]}>
            <sphereGeometry args={[4.2, 16, 16]} />
            <meshStandardMaterial color="#cbd5e1" transparent opacity={0.16} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Active Train Fleets Traveling on Physical Rails ─────────────────────────
function LiveTrainFleet() {
  const vandeBharatRef = useRef<THREE.Group>(null);
  const rajdhaniRef = useRef<THREE.Group>(null);
  const freightRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    // 1. Vande Bharat moving on UP Line (Z = -3.2)
    if (vandeBharatRef.current) {
      vandeBharatRef.current.position.x += delta * 4.4;
      if (vandeBharatRef.current.position.x > 26) {
        vandeBharatRef.current.position.x = -26;
      }
    }

    // 2. Rajdhani trailing behind on UP Line (safe headway buffer)
    if (rajdhaniRef.current) {
      rajdhaniRef.current.position.x += delta * 3.8;
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
      {/* 1. VANDE BHARAT EXPRESS 22436 (UP Line, Lead Sector) */}
      <group ref={vandeBharatRef} position={[14, 0.32, -3.2]}>
        <BulletTrainModel position={[1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <BulletCarriageModel position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <BulletCarriageModel position={[-1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

        {/* High-Beam Forward Illuminators */}
        <pointLight color="#38bdf8" intensity={4.5} distance={8} position={[3.5, 0.6, 0]} />

        <Html position={[0, 2.4, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-cyan-950/90 border border-cyan-400/80 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px]">
            <TrainIcon className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-wide">22436 VANDE BHARAT EXP</span>
              <span className="text-cyan-400 font-semibold">130 KM/H • ON-TIME • UP FAST LINE</span>
            </div>
          </div>
        </Html>
      </group>

      {/* 2. RAJDHANI EXPRESS 12424 (UP Line, Trailing Headway) */}
      <group ref={rajdhaniRef} position={[-14, 0.32, -3.2]}>
        <PassengerLocoModel position={[1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <PassengerCarriageModel position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <PassengerCarriageModel position={[-1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

        <pointLight color="#06b6d4" intensity={3.5} distance={6} position={[3.2, 0.6, 0]} />

        <Html position={[0, 2.4, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-950/90 border border-blue-400/80 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px]">
            <TrainIcon className="w-3.5 h-3.5 text-blue-400" />
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-wide">12424 RAJDHANI EXP</span>
              <span className="text-blue-300 font-semibold">120 KM/H • HEADWAY BUFFER: 14M</span>
            </div>
          </div>
        </Html>
      </group>

      {/* 3. BCNHL HEAVY FREIGHT (DOWN Line, Reverse Direction) */}
      <group ref={freightRef} position={[2, 0.32, 0]}>
        <DieselLocoModel position={[-3.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <ContainerCarriageModel position={[-1.6, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <CoalCarriageModel position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <ContainerCarriageModel position={[1.6, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <CoalCarriageModel position={[3.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

        <pointLight color="#fbbf24" intensity={3.5} distance={6} position={[-4.8, 0.6, 0]} />

        <Html position={[0, 2.4, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900/90 border border-zinc-600 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px]">
            <TrainIcon className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-wide">BCNHL COAL 41108</span>
              <span className="text-zinc-400 font-semibold">65 KM/H • DN TRUNK NOMINAL</span>
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
      beaconRef.current.intensity = 3.0 + Math.sin(t * 6) * 1.8;
    }
  });

  return (
    <group>
      {/* Block A-14: Track Renewal & Deep Screening (UP Line, KM 140) */}
      <group position={[7.0, 0.45, -3.2]}>
        <mesh>
          <boxGeometry args={[8, 1.4, 1.6]} />
          <meshPhysicalMaterial
            color="#f59e0b"
            transmission={0.8}
            roughness={0.2}
            transparent
            opacity={0.35}
            emissive="#f59e0b"
            emissiveIntensity={0.4}
          />
        </mesh>

        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(8, 1.4, 1.6)]} />
          <lineBasicMaterial color="#fbbf24" linewidth={2} />
        </lineSegments>

        <pointLight ref={beaconRef} color="#f59e0b" intensity={3.5} distance={8} position={[0, 1.4, 0]} />

        <Html position={[0, 2.4, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
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

      {/* Block B-09: Signal Point Machine Renewal (Loop Line, KM 210) */}
      <group position={[18.0, 0.45, 3.2]}>
        <mesh>
          <boxGeometry args={[8, 1.4, 1.6]} />
          <meshPhysicalMaterial
            color="#10b981"
            transmission={0.8}
            roughness={0.2}
            transparent
            opacity={0.35}
            emissive="#10b981"
            emissiveIntensity={0.4}
          />
        </mesh>

        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(8, 1.4, 1.6)]} />
          <lineBasicMaterial color="#34d399" linewidth={2} />
        </lineSegments>

        <pointLight color="#10b981" intensity={2.5} distance={6} position={[0, 1.4, 0]} />

        <Html position={[0, 2.4, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
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
    camera.position.set(13, 14, 17);
    camera.lookAt(0, 0.5, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0.5, 0);
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
      maxDistance={40}
      minDistance={6}
    />
  );
}

// ─── Fallback Loader for 3D Assets ───────────────────────────────────────────
function ModelLoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-3 px-4 py-2 bg-black/80 border border-cyan-500/40 rounded-full font-mono text-xs text-cyan-400 shadow-2xl backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span>LOADING DIGITAL TWIN 3D CORRIDOR, TRACKS &amp; STATION...</span>
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
                PHYSICAL TRACKS &amp; ELECTRIFIED NETWORK
              </span>
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
            <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-cyan-400 font-mono text-[10px]">
              GZB-CNB 440 KM TRIPLE-TRACK CORRIDOR
            </Badge>
            <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-emerald-400 font-mono text-[10px]">
              OHE 25KV ELECTRIFIED
            </Badge>
            <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-amber-400 font-mono text-[10px]">
              IN-SITU SHADOW BUNDLE ACTIVE
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
      <CardContent className="p-0 relative w-full h-[620px] bg-[#070b14]">
        <Canvas
          camera={{ position: [13, 14, 17], fov: 40 }}
          gl={{ antialias: true, alpha: false }}
          shadows
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          {/* Deep Twilight Slate Background & Fog */}
          <color attach="background" args={["#070b14"]} />
          <fog attach="fog" args={["#070b14", 26, 64]} />

          {/* Balanced High-Visibility Lighting Rig */}
          <ambientLight color="#60a5fa" intensity={1.5} />
          <directionalLight
            position={[25, 35, 20]}
            intensity={3.4}
            color="#ffffff"
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          {/* Cyan Backlight Rim */}
          <directionalLight position={[-22, 18, -18]} intensity={2.4} color="#00f0ff" />
          {/* Ground Bounce Light */}
          <hemisphereLight args={["#38bdf8", "#0f172a", 1.2]} />

          {/* Tilt-Shift Camera Controller */}
          <CorridorCameraController resetTrigger={resetKey} />

          <Suspense fallback={<ModelLoadingFallback />}>
            {/* 1. Active Cityscape with Glowing Urban Grid & Skyscraper Horizon */}
            <IsometricCityscape />

            {/* 2. Central Station Hub with Cyan Floodlighting */}
            <StationHub position={[-2, 0.22, -6.8]} rotation={[0, 0, 0]} />

            {/* 3. Physical Steel Tracks, Sleepers, Ballast, Platforms & OHE Gantries */}
            <RailwayCorridorTracks />

            {/* 4. Live 3D Train Models running on top of the rails */}
            <LiveTrainFleet />

            {/* 5. Physical Track Possession Blocks with Holographic Safety Cages */}
            <InSituMaintenanceBlocks />
          </Suspense>
        </Canvas>

        {/* On-Screen HUD Interactive Legend & Control Advice */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono bg-black/85 backdrop-blur-md border border-zinc-800/90 p-3 rounded">
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
              <span className="text-amber-300">Block A-14 (UP Deep Screening)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/70 border border-emerald-400" />
              <span className="text-emerald-300">Block B-09 (Turnout #44)</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-zinc-400 font-semibold">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>DRAG TO ROTATE TILT-SHIFT • SCROLL TO ZOOM INTO CORRIDOR RAILS</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThreeDStringChart;
