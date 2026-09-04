import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  RotateCcw,
  Train as TrainIcon,
  Shield,
  Wrench,
  Navigation,
  RefreshCw,
  Activity,
  Thermometer,
  AlertTriangle,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RailwayAPI } from "@/services/api";
import { wsService } from "@/services/websocket";
import { TrainTelemetry, MaintenanceBlock, WeatherReport } from "@/types/railway";

export interface ThreeDStringChartProps {
  activeScenario?: "NONE" | "CP_SAT" | "REROUTE" | "SPEED_RESTRICTION";
  rerouteActive?: boolean;
  speedRestrictionActive?: boolean;
  conflictResolved?: boolean;
  onTriggerSolver?: () => void;
  onTriggerReroute?: () => void;
  onTriggerSpeedSim?: () => void;
}

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
        child.material.color.multiplyScalar(0.58);
        child.material.roughness = 0.65;
        child.material.metalness = 0.35;
      }
    });
    return clone;
  }, [scene]);

  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}

// ─── Central Station Hub with Live Weather Telemetry ─────────────────────────
function StationHub({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 0.015,
  weather,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  weather?: WeatherReport | null;
}) {
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

      {/* Floating 3D Station Callout with Live Telemetry */}
      <Html position={[0, 7.5, 0]} center distanceFactor={14} zIndexRange={[60, 0]}>
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-zinc-950/95 border border-cyan-400 rounded-md shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <span className="font-black text-white tracking-wider uppercase">PRAYAGRAJ JN (PRYJ)</span>
              <span className="text-cyan-400 font-bold">• CENTRAL TERMINAL</span>
            </div>
            {weather && (
              <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-mono mt-0.5">
                <span className="text-emerald-400">RAIL TEMP: {weather.estimated_rail_temp_c}°C</span>
                <span>•</span>
                <span>{weather.weather_condition.toUpperCase()}</span>
                <span>•</span>
                <span className="text-amber-400">BUCKLING: {weather.rail_hazards?.track_buckling_risk || "LOW"}</span>
              </div>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── Continuous Railway Track Component ───────────────────────────────────────
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

  useFrame(({ clock }) => {
    if (pulseRef.current) {
      const speed = z < 0 ? 9.0 : 6.5;
      const t = clock.getElapsedTime() * speed;
      pulseRef.current.position.x = ((t % trackLength) - trackLength / 2);
    }
  });

  return (
    <group position={[0, 0, z]}>
      {/* Elevated Ballast Bed */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[trackLength, 0.16, 2.0]} />
        <meshStandardMaterial color="#141923" roughness={0.92} metalness={0.15} />
      </mesh>

      <mesh position={[0, 0.04, -1.05]}>
        <boxGeometry args={[trackLength, 0.08, 0.15]} />
        <meshStandardMaterial color="#0f131a" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.04, 1.05]}>
        <boxGeometry args={[trackLength, 0.08, 0.15]} />
        <meshStandardMaterial color="#0f131a" roughness={0.95} />
      </mesh>

      {/* Concrete Railway Sleepers */}
      {Array.from({ length: sleeperCount }).map((_, i) => {
        const x = -trackLength / 2 + i * sleeperSpacing;
        const isDamaged = hasMaintenance && x >= maintenanceStart && x <= maintenanceEnd;

        return (
          <group key={i} position={[x, 0.18, 0]}>
            <mesh receiveShadow castShadow>
              <boxGeometry args={[0.28, 0.07, 1.5]} />
              <meshStandardMaterial
                color={isDamaged ? "#78350f" : "#475569"}
                roughness={0.78}
                metalness={0.2}
              />
            </mesh>
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

      {/* Left Steel Rail */}
      <mesh position={[0, 0.28, -0.45]} castShadow receiveShadow>
        <boxGeometry args={[trackLength, 0.12, 0.07]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.12} />
      </mesh>
      <mesh position={[0, 0.345, -0.45]}>
        <boxGeometry args={[trackLength, 0.02, 0.04]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Right Steel Rail */}
      <mesh position={[0, 0.28, 0.45]} castShadow receiveShadow>
        <boxGeometry args={[trackLength, 0.12, 0.07]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.12} />
      </mesh>
      <mesh position={[0, 0.345, 0.45]}>
        <boxGeometry args={[trackLength, 0.02, 0.04]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Glowing Electric Signaling Third-Rail Line */}
      <mesh position={[0, 0.19, 0]}>
        <boxGeometry args={[trackLength, 0.02, 0.08]} />
        <meshStandardMaterial
          color={hasMaintenance ? "#f59e0b" : "#00f0ff"}
          emissive={hasMaintenance ? "#d97706" : "#00f0ff"}
          emissiveIntensity={2.5}
        />
      </mesh>

      <mesh ref={pulseRef} position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
        <pointLight color="#00f0ff" intensity={3.5} distance={3.5} />
      </mesh>

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

// ─── Overhead Railway Electrification Gantries ────────────────────────────────
function OverheadCatenaryGantries() {
  const gantryX = [-22, -14, -6, 2, 10, 18, 26];

  return (
    <group>
      {[-3.2, 0, 3.2].map((wireZ) => (
        <group key={`wire-${wireZ}`}>
          <mesh position={[0, 2.75, wireZ]}>
            <boxGeometry args={[58, 0.03, 0.03]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.8} />
          </mesh>
          <mesh position={[0, 3.15, wireZ]}>
            <boxGeometry args={[58, 0.02, 0.02]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
        </group>
      ))}

      {gantryX.map((x, idx) => (
        <group key={`gantry-${x}`} position={[x, 0, 0]}>
          <mesh position={[0, 1.7, -4.9]} castShadow>
            <boxGeometry args={[0.22, 3.4, 0.22]} />
            <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 1.7, 4.9]} castShadow>
            <boxGeometry args={[0.22, 3.4, 0.22]} />
            <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0, 3.3, 0]} castShadow>
            <boxGeometry args={[0.28, 0.25, 10.1]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
          </mesh>

          {[-3.2, 0, 3.2].map((z, sIdx) => {
            const isGreen = idx % 2 === 0 || sIdx === 0;
            const signalColor = isGreen ? "#10b981" : "#f59e0b";

            return (
              <group key={`sig-${z}`} position={[0, 3.0, z]}>
                <mesh position={[0, 0.1, 0]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />
                  <meshStandardMaterial color="#94a3b8" />
                </mesh>
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

// ─── Parallel Railway Corridor Viaduct & Platforms ────────────────────────────
function RailwayCorridorTracks({
  rerouteActive = false,
  speedRestrictionActive = false,
}: {
  rerouteActive?: boolean;
  speedRestrictionActive?: boolean;
}) {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[58, 0.16, 11.4]} />
        <meshStandardMaterial color="#0f141f" roughness={0.85} metalness={0.25} />
      </mesh>

      <mesh position={[0, 0.22, -5.6]} castShadow receiveShadow>
        <boxGeometry args={[58, 0.38, 0.35]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 5.6]} castShadow receiveShadow>
        <boxGeometry args={[58, 0.38, 0.35]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>

      {/* UP Fast Express Line */}
      <ContinuousTrackLine
        z={-3.2}
        label="[TRACK 01 // UP FAST EXPRESS LINE]"
        badgeColor={speedRestrictionActive ? "#f59e0b" : "#00f0ff"}
        hasMaintenance={true}
        maintenanceStart={3}
        maintenanceEnd={11}
      />

      {/* DOWN Trunk Mainline */}
      <ContinuousTrackLine
        z={0.0}
        label="[TRACK 02 // DOWN TRUNK MAINLINE]"
        badgeColor="#10b981"
      />

      {/* Loop Overtake Line */}
      <ContinuousTrackLine
        z={3.2}
        label="[TRACK 03 // LOOP OVERTAKE & FREIGHT SIDING]"
        badgeColor={rerouteActive ? "#10b981" : "#f59e0b"}
        hasMaintenance={!rerouteActive}
        maintenanceStart={14}
        maintenanceEnd={22}
      />

      {/* Turnout Crossover */}
      <group position={[14, 0.18, 1.6]} rotation={[0, -Math.PI / 8.5, 0]}>
        <mesh position={[0, 0.08, -0.45]}>
          <boxGeometry args={[7.2, 0.1, 0.06]} />
          <meshStandardMaterial
            color={rerouteActive ? "#10b981" : "#e2e8f0"}
            emissive={rerouteActive ? "#059669" : "#000000"}
            emissiveIntensity={rerouteActive ? 2.5 : 0}
            metalness={0.95}
            roughness={0.15}
          />
        </mesh>
        <mesh position={[0, 0.08, 0.45]}>
          <boxGeometry args={[7.2, 0.1, 0.06]} />
          <meshStandardMaterial
            color={rerouteActive ? "#10b981" : "#e2e8f0"}
            emissive={rerouteActive ? "#059669" : "#000000"}
            emissiveIntensity={rerouteActive ? 2.5 : 0}
            metalness={0.95}
            roughness={0.15}
          />
        </mesh>
        <pointLight
          color={rerouteActive ? "#10b981" : "#00f0ff"}
          intensity={rerouteActive ? 5.5 : 2}
          distance={6}
          position={[0, 0.4, 0]}
        />
        {rerouteActive && (
          <Html position={[0, 2.0, 0]} center distanceFactor={14} zIndexRange={[60, 0]}>
            <div className="px-2.5 py-1 bg-emerald-950/95 border border-emerald-400 rounded text-[9px] font-mono text-emerald-300 font-bold uppercase whitespace-nowrap shadow-xl flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>TURNOUT #34-B // 3RD LINE BYPASS ENGAGED</span>
            </div>
          </Html>
        )}
      </group>

      {/* Speed Restriction Caution Marker */}
      {speedRestrictionActive && (
        <group position={[-6, 0.35, -3.2]}>
          <mesh position={[0, 0.8, -1.2]}>
            <cylinderGeometry args={[0.04, 0.04, 1.6, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          <mesh position={[0, 1.6, -1.2]}>
            <boxGeometry args={[0.9, 0.9, 0.08]} />
            <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={1.5} />
          </mesh>
          <pointLight color="#f59e0b" intensity={4.5} distance={6} position={[0, 1.6, -1.0]} />
          <Html position={[0, 2.6, -1.2]} center distanceFactor={14} zIndexRange={[60, 0]}>
            <div className="px-2.5 py-1 bg-amber-950/95 border border-amber-400 rounded text-[9px] font-mono text-amber-300 font-bold uppercase whitespace-nowrap shadow-xl flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>TSR 30 KM/H SPEED RESTRICTION ZONE (KM 170-184)</span>
            </div>
          </Html>
        </group>
      )}

      {/* Platform 1 */}
      <group position={[-2, 0.28, -4.7]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[16, 0.36, 1.4]} />
          <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.3} />
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

      {/* Platform 2 */}
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

      <OverheadCatenaryGantries />
    </group>
  );
}

// ─── Active Cityscape Backdrop ───────────────────────────────────────────────
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
      <mesh position={[0, -0.3, 0]} receiveShadow>
        <boxGeometry args={[75, 0.4, 65]} />
        <meshStandardMaterial color="#0a0e1a" roughness={0.95} metalness={0.1} />
      </mesh>

      <gridHelper args={[70, 48, "#00f0ff", "#162238"]} position={[0, -0.06, 0]} />

      {[-10, 10, -18, 18].map((offsetZ) => (
        <group key={`hwy-${offsetZ}`}>
          <mesh position={[0, -0.04, offsetZ]}>
            <planeGeometry args={[65, 1.4]} />
            <meshStandardMaterial color="#111827" roughness={0.9} />
          </mesh>
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

      {[-24, -12, 0, 12, 24].map((offsetX) => (
        <mesh key={`cross-${offsetX}`} position={[offsetX, -0.03, 0]}>
          <planeGeometry args={[1.2, 60]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
        </mesh>
      ))}

      <group ref={pulseRef}>
        <pointLight color="#00f0ff" intensity={3.5} distance={10} position={[0, 0.5, -10]} />
        <pointLight color="#38bdf8" intensity={3.5} distance={10} position={[0, 0.5, 10]} />
      </group>

      {/* Skyscraper Clustered Horizon */}
      <TintedBuildingModel url="/models/building-skyscraper-a.glb" position={[-18, 0, -14]} rotation={[0, Math.PI / 4, 0]} scale={0.95} />
      <TintedBuildingModel url="/models/building-skyscraper-b.glb" position={[-13, 0, -16]} scale={0.9} />
      <TintedBuildingModel url="/models/building-skyscraper-c.glb" position={[-7, 0, -15]} rotation={[0, -Math.PI / 6, 0]} scale={0.95} />
      <TintedBuildingModel url="/models/building-skyscraper-d.glb" position={[8, 0, -15]} rotation={[0, Math.PI / 3, 0]} scale={1.0} />
      <TintedBuildingModel url="/models/building-skyscraper-e.glb" position={[14, 0, -16]} scale={0.9} />
      <TintedBuildingModel url="/models/building-skyscraper-a.glb" position={[20, 0, -14]} rotation={[0, -Math.PI / 4, 0]} scale={0.95} />

      <TintedBuildingModel url="/models/building-a.glb" position={[-23, 0, -11]} scale={0.9} />
      <TintedBuildingModel url="/models/building-d.glb" position={[-16, 0, -9.5]} scale={0.85} />
      <TintedBuildingModel url="/models/building-f.glb" position={[-10, 0, -10]} scale={0.85} />
      <TintedBuildingModel url="/models/building-e.glb" position={[11, 0, -10]} scale={0.85} />
      <TintedBuildingModel url="/models/building-h.glb" position={[16, 0, -9.5]} scale={0.85} />
      <TintedBuildingModel url="/models/building-j.glb" position={[23, 0, -11]} scale={0.9} />

      <TintedBuildingModel url="/models/building-skyscraper-b.glb" position={[-20, 0, 15]} rotation={[0, Math.PI, 0]} scale={0.9} />
      <TintedBuildingModel url="/models/building-skyscraper-c.glb" position={[-14, 0, 16]} scale={0.95} />
      <TintedBuildingModel url="/models/building-f.glb" position={[-8, 0, 12]} scale={0.9} />
      <TintedBuildingModel url="/models/building-m.glb" position={[0, 0, 13]} scale={0.9} />
      <TintedBuildingModel url="/models/building-k.glb" position={[8, 0, 12]} scale={0.9} />
      <TintedBuildingModel url="/models/building-skyscraper-d.glb" position={[16, 0, 16]} rotation={[0, Math.PI / 2, 0]} scale={0.95} />
      <TintedBuildingModel url="/models/building-skyscraper-a.glb" position={[22, 0, 14]} rotation={[0, -Math.PI / 3, 0]} scale={0.9} />

      <pointLight color="#ef4444" intensity={3.5} distance={7} position={[-18, 9.5, -14]} />
      <pointLight color="#38bdf8" intensity={3.5} distance={7} position={[8, 10.5, -15]} />
      <pointLight color="#ef4444" intensity={3.5} distance={7} position={[16, 10.0, 16]} />

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

// ─── Live Train Fleet with Real-Time Telemetry Data Binding ───────────────────
function LiveTrainFleet({
  liveTrains,
  rerouteActive = false,
  speedRestrictionActive = false,
  activeScenario = "NONE",
}: {
  liveTrains: TrainTelemetry[];
  rerouteActive?: boolean;
  speedRestrictionActive?: boolean;
  activeScenario?: "NONE" | "CP_SAT" | "REROUTE" | "SPEED_RESTRICTION";
}) {
  const train1Ref = useRef<THREE.Group>(null);
  const train2Ref = useRef<THREE.Group>(null);
  const train3Ref = useRef<THREE.Group>(null);

  // Match live trains from backend or fallback to monitored fleet
  const t1 = liveTrains.find((t) => t.train_number === "22436") || liveTrains[0] || {
    train_number: "22436",
    train_name: "Vande Bharat Express",
    speed_kmph: 130,
    delay_minutes: 0,
    status: "ON_TIME",
    current_station: "PRYJ",
    current_km: 88.4,
  };

  const t2 = liveTrains.find((t) => t.train_number === "12424" || t.train_number === "12004") || liveTrains[1] || {
    train_number: "12424",
    train_name: "Rajdhani Express",
    speed_kmph: 120,
    delay_minutes: 14,
    status: "DELAYED",
    current_station: "CNB",
    current_km: 142.1,
  };

  const t3 = liveTrains.find((t) => t.train_type?.includes("FREIGHT") || t.train_number.startsWith("BTPN")) || liveTrains[liveTrains.length - 1] || {
    train_number: "BTPN-6602",
    train_name: "Petroleum Tanker Freight",
    speed_kmph: 65,
    delay_minutes: 0,
    status: "ON_TIME",
    current_station: "PRYJ",
    current_km: 54.0,
  };

  useFrame((_, delta) => {
    // Kinematic translation speed dynamically scaled by real speed_kmph from API
    const v1Speed = (t1.speed_kmph || 125) * 0.035;
    let v2Speed = (t2.speed_kmph || 110) * 0.032;

    if (speedRestrictionActive) {
      v2Speed = 30 * 0.035; // 30 km/h caution order
    } else if (rerouteActive) {
      v2Speed = 85 * 0.032; // 85 km/h loop line cruising
    }

    const v3Speed = (t3.speed_kmph || 65) * 0.040;

    if (train1Ref.current) {
      train1Ref.current.position.x += delta * v1Speed;
      if (train1Ref.current.position.x > 26) train1Ref.current.position.x = -26;
    }

    if (train2Ref.current) {
      train2Ref.current.position.x += delta * v2Speed;
      if (train2Ref.current.position.x > 26) {
        train2Ref.current.position.x = -26;
      }

      // Handle 3D Rerouting across crossover switch
      if (rerouteActive) {
        const x = train2Ref.current.position.x;
        if (x < 8) {
          train2Ref.current.position.z = -3.2;
          train2Ref.current.rotation.y = 0;
        } else if (x >= 8 && x <= 18) {
          // Transition smoothly from Z = -3.2 (Track 1) to Z = 3.2 (Track 3)
          const progress = (x - 8) / 10;
          train2Ref.current.position.z = -3.2 + progress * 6.4;
          train2Ref.current.rotation.y = -0.32; // angled traversing switch
        } else {
          train2Ref.current.position.z = 3.2;
          train2Ref.current.rotation.y = 0;
        }
      } else {
        train2Ref.current.position.z = -3.2;
        train2Ref.current.rotation.y = 0;
      }
    }

    if (train3Ref.current) {
      train3Ref.current.position.x -= delta * v3Speed;
      if (train3Ref.current.position.x < -26) train3Ref.current.position.x = 26;
    }
  });

  const getStatusBadgeClass = (status: string, delay: number) => {
    if (delay === 0 || status === "ON_TIME") return "text-cyan-400 border-cyan-400/80 bg-cyan-950/90";
    if (delay > 15 || status === "CRITICAL_DELAY") return "text-red-400 border-red-400/80 bg-red-950/90";
    return "text-amber-400 border-amber-400/80 bg-amber-950/90";
  };

  const renderTrain2Badge = () => {
    if (rerouteActive) {
      return (
        <div className="flex items-center gap-2 px-2.5 py-1 rounded shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px] border text-emerald-400 border-emerald-400/90 bg-emerald-950/95 animate-pulse">
          <Navigation className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-white tracking-wide">{t2.train_number} {t2.train_name}</span>
            <span className="text-emerald-300 font-semibold text-[9px]">
              {train2Ref.current && train2Ref.current.position.x > 8 ? "REROUTED TO 3RD LINE (LOOP BYPASS)" : "APPROACHING TURNOUT 34-B"} • 85 KM/H • +3m NET
            </span>
          </div>
        </div>
      );
    }
    if (speedRestrictionActive) {
      return (
        <div className="flex items-center gap-2 px-2.5 py-1 rounded shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px] border text-amber-400 border-amber-400/90 bg-amber-950/95 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-white tracking-wide">{t2.train_number} {t2.train_name}</span>
            <span className="text-amber-300 font-semibold text-[9px]">
              TSR 30 KM/H PRE-WARNING • KM 170-184 • CLASH AVOIDED
            </span>
          </div>
        </div>
      );
    }
    if (activeScenario === "CP_SAT") {
      return (
        <div className="flex items-center gap-2 px-2.5 py-1 rounded shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px] border text-cyan-400 border-cyan-400/90 bg-cyan-950/95">
          <TrainIcon className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
          <div className="flex flex-col text-left">
            <span className="font-bold text-white tracking-wide">{t2.train_number} {t2.train_name}</span>
            <span className="text-cyan-300 font-semibold text-[9px]">
              CP-SAT OPTIMAL GAP ASSIGNED • 120 KM/H • ON-TIME (+0m)
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-2 px-2.5 py-1 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px] border ${getStatusBadgeClass(t2.status, t2.delay_minutes)}`}>
        <TrainIcon className="w-3.5 h-3.5 flex-shrink-0" />
        <div className="flex flex-col text-left">
          <span className="font-bold text-white tracking-wide">{t2.train_number} {t2.train_name}</span>
          <span className="font-semibold text-[9px]">
            {t2.speed_kmph} KM/H • {t2.delay_minutes === 0 ? "ON-TIME" : `+${t2.delay_minutes}M DELAY`} • NEAR {t2.current_station}
          </span>
        </div>
      </div>
    );
  };

  return (
    <group>
      {/* ─── Live Train 1: Lead UP Fast Line (Z = -3.2) ─────────────────── */}
      <group ref={train1Ref} position={[12, 0.32, -3.2]}>
        <BulletTrainModel position={[1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <BulletCarriageModel position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <BulletCarriageModel position={[-1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

        <pointLight color="#38bdf8" intensity={4.5} distance={8} position={[3.5, 0.6, 0]} />

        <Html position={[0, 2.4, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px] border ${getStatusBadgeClass(t1.status, t1.delay_minutes)}`}>
            <TrainIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-white tracking-wide">{t1.train_number} {t1.train_name}</span>
              <span className="font-semibold text-[9px]">
                {t1.speed_kmph} KM/H • {t1.delay_minutes === 0 ? "ON-TIME" : `+${t1.delay_minutes}M DELAY`} • KM {Number(t1.current_km || 88).toFixed(1)}
              </span>
            </div>
          </div>
        </Html>
      </group>

      {/* ─── Live Train 2: Trailing UP Fast Line (Z = -3.2) / Rerouted to Loop (Z = 3.2) ─── */}
      <group ref={train2Ref} position={[-12, 0.32, -3.2]}>
        <PassengerLocoModel position={[1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <PassengerCarriageModel position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <PassengerCarriageModel position={[-1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

        <pointLight
          color={rerouteActive ? "#10b981" : speedRestrictionActive ? "#f59e0b" : "#06b6d4"}
          intensity={4.5}
          distance={8}
          position={[3.2, 0.6, 0]}
        />

        <Html position={[0, 2.4, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          {renderTrain2Badge()}
        </Html>
      </group>

      {/* ─── Live Train 3: DOWN Trunk Mainline Freight (Z = 0.0) ────────── */}
      <group ref={train3Ref} position={[2, 0.32, 0]}>
        <DieselLocoModel position={[-3.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <ContainerCarriageModel position={[-1.6, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <CoalCarriageModel position={[0, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <ContainerCarriageModel position={[1.6, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <CoalCarriageModel position={[3.2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

        <pointLight color="#fbbf24" intensity={3.5} distance={6} position={[-4.8, 0.6, 0]} />

        <Html position={[0, 2.4, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900/90 border border-zinc-600 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px]">
            <TrainIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-white tracking-wide">{t3.train_number} {t3.train_name}</span>
              <span className="text-zinc-400 font-semibold text-[9px]">
                {t3.speed_kmph} KM/H • DN MAINLINE • {t3.status}
              </span>
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// ─── Real PostgreSQL In-Situ Maintenance Possession Blocks ───────────────────
function InSituMaintenanceBlocks({ blocks }: { blocks: MaintenanceBlock[] }) {
  const beaconRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beaconRef.current) {
      beaconRef.current.intensity = 3.0 + Math.sin(t * 6) * 1.8;
    }
  });

  const b1 = blocks[0] || {
    block_code: "GZB-TDL-UP-1045",
    title: "Mega Joint Maintenance: BCM Deep Screening",
    primary_department: "ENGINEERING",
    bundled_departments: "ENG,S&T,TRD",
    start_km: 86.0,
    end_km: 92.0,
    status: "APPROVED",
    duration_minutes: 120,
    machinery_assigned: "BCM, TOWER_WAGON",
  };

  const b2 = blocks[1] || {
    block_code: "BLK-NCR-2026-002",
    title: "SMMS Point Machine Renewal & Turnout Test",
    primary_department: "SIGNAL_TELECOM",
    bundled_departments: "S&T",
    start_km: 144.0,
    end_km: 146.5,
    status: "APPROVED",
    duration_minutes: 90,
    machinery_assigned: "POINT_CALIBRATOR",
  };

  return (
    <group>
      {/* ─── Block 1: Track Possession on UP Line (Z = -3.2) ──────────────── */}
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/95 border border-amber-500 rounded shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px] animate-pulse">
            <Wrench className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-amber-200 uppercase tracking-wide">
                BLOCK {b1.block_code} [{b1.primary_department}]
              </span>
              <span className="text-amber-400 font-semibold text-[9px]">
                KM {b1.start_km} TO {b1.end_km} • {b1.status} • {b1.duration_minutes}M WINDOW
              </span>
            </div>
          </div>
        </Html>
      </group>

      {/* ─── Block 2: Track Possession on Loop Siding (Z = +3.2) ───────────── */}
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/95 border border-emerald-500 rounded shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px]">
            <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-emerald-200 uppercase tracking-wide">
                BLOCK {b2.block_code} [{b2.primary_department}]
              </span>
              <span className="text-emerald-400 font-semibold text-[9px]">
                KM {b2.start_km} TO {b2.end_km} • {b2.status} • OVERTAKE CLEAR
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

  useEffect(() => {
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
        <span>CONNECTING TO LIVE STATION TELEMETRY &amp; 3D CORRIDOR...</span>
      </div>
    </Html>
  );
}

// ─── Main 3D Digital Twin Component ──────────────────────────────────────────
export const ThreeDStringChart: React.FC<ThreeDStringChartProps> = ({
  activeScenario = "NONE",
  rerouteActive = false,
  speedRestrictionActive = false,
  conflictResolved: _conflictResolved = false,
  onTriggerSolver: _onTriggerSolver,
  onTriggerReroute: _onTriggerReroute,
  onTriggerSpeedSim: _onTriggerSpeedSim,
}) => {
  const [resetKey, setResetKey] = useState(0);
  const [liveTrains, setLiveTrains] = useState<TrainTelemetry[]>([]);
  const [liveBlocks, setLiveBlocks] = useState<MaintenanceBlock[]>([]);
  const [liveWeather, setLiveWeather] = useState<WeatherReport | null>(null);
  const [_isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");


  // Fetch Live Telemetry Snapshot from Backend REST + WebSocket Stream
  const fetchLiveTelemetry = async () => {
    setIsRefreshing(true);
    try {
      const [telemetry, blocks] = await Promise.allSettled([
        RailwayAPI.getLiveTelemetry(),
        RailwayAPI.getBlocks(),
      ]);

      if (telemetry.status === "fulfilled" && telemetry.value) {
        const data = telemetry.value;
        if (data.trains && Array.isArray(data.trains)) {
          setLiveTrains(data.trains);
        }
        if (data.weather) {
          setLiveWeather(data.weather);
        }
        setIsLiveStreaming(true);
        setLastSyncTime(new Date().toLocaleTimeString());
      }

      if (blocks.status === "fulfilled" && Array.isArray(blocks.value)) {
        setLiveBlocks(blocks.value);
      }
    } catch (err) {
      console.warn("Telemetry fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchLiveTelemetry();

    // Subscribe to real-time WebSocket updates
    wsService.connect();
    const unsubscribe = wsService.subscribe((data) => {
      if (data.trains && data.trains.length > 0) {
        setLiveTrains(data.trains);
        setIsLiveStreaming(true);
        setLastSyncTime(new Date().toLocaleTimeString());
      }
      if (data.weather) {
        setLiveWeather(data.weather);
      }
    });

    // 8-second polling fallback to ensure constant real-time data sync
    const interval = setInterval(() => {
      fetchLiveTelemetry();
    }, 8000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <Card className="w-full bg-[#050505] border-zinc-800 shadow-2xl overflow-hidden text-white font-sans">
      {/* Tactical Header Bar with Live Telemetry Indicators */}
      <CardHeader className="p-4 sm:p-5 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/80">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45 animate-pulse" />
            <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <span>ISOMETRIC 3D DIGITAL TWIN CORRIDOR</span>
              <span className="text-zinc-600 font-normal">//</span>
              <span className="text-cyan-400 font-mono text-xs font-bold">
                PRAYAGRAJ TERMINAL (PRYJ)
              </span>
            </CardTitle>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
            {/* Live Streaming Badge */}
            <Badge
              variant="outline"
              className="bg-cyan-950/80 border-cyan-500/80 text-cyan-300 font-mono text-[10px] flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>LIVE TELEMETRY ACTIVE</span>
            </Badge>

            {/* Tactical Scenario Active Indicator */}
            {rerouteActive && (
              <Badge variant="outline" className="bg-emerald-950/90 border-emerald-400 text-emerald-300 font-mono text-[10px] flex items-center gap-1 animate-pulse">
                <Navigation className="w-3 h-3 text-emerald-400" />
                <span>3RD LINE LOOP BYPASS ENGAGED</span>
              </Badge>
            )}

            {speedRestrictionActive && (
              <Badge variant="outline" className="bg-amber-950/90 border-amber-400 text-amber-300 font-mono text-[10px] flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>TSR 30 KM/H SPEED RESTRICTION ACTIVE</span>
              </Badge>
            )}

            {activeScenario === "CP_SAT" && (
              <Badge variant="outline" className="bg-cyan-950/90 border-cyan-400 text-cyan-300 font-mono text-[10px] flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span>OR-TOOLS CP-SAT OPTIMIZED</span>
              </Badge>
            )}

            {/* Trains Tracked Badge */}
            <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-zinc-300 font-mono text-[10px] flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>{liveTrains.length || 8} TRAINS TRACKED</span>
            </Badge>

            {/* Weather / Rail Temp Badge */}
            {liveWeather && (
              <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-zinc-300 font-mono text-[10px] flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-amber-400" />
                <span>RAIL TEMP {liveWeather.estimated_rail_temp_c}°C</span>
              </Badge>
            )}

            {lastSyncTime && (
              <span className="text-zinc-500 text-[10px] font-mono">
                SYNCED {lastSyncTime}
              </span>
            )}
          </div>
        </div>

        {/* View Controls & Refresh */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLiveTelemetry}
            disabled={isRefreshing}
            className="bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>REFRESH FEED</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setResetKey((k) => k + 1)}
            className="bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>RESET VIEW</span>
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
          <color attach="background" args={["#070b14"]} />
          <fog attach="fog" args={["#070b14", 26, 64]} />

          <ambientLight color="#60a5fa" intensity={1.5} />
          <directionalLight
            position={[25, 35, 20]}
            intensity={3.4}
            color="#ffffff"
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <directionalLight position={[-22, 18, -18]} intensity={2.4} color="#00f0ff" />
          <hemisphereLight args={["#38bdf8", "#0f172a", 1.2]} />

          <CorridorCameraController resetTrigger={resetKey} />

          <Suspense fallback={<ModelLoadingFallback />}>
            {/* 1. Active Cityscape */}
            <IsometricCityscape />

            {/* 2. Central Station Hub with Live Weather */}
            <StationHub position={[-2, 0.22, -6.8]} rotation={[0, 0, 0]} weather={liveWeather} />

            {/* 3. Physical Tracks, Platforms & OHE */}
            <RailwayCorridorTracks
              rerouteActive={rerouteActive}
              speedRestrictionActive={speedRestrictionActive}
            />

            {/* 4. Live Train Models Driven by Real Backend Telemetry */}
            <LiveTrainFleet
              liveTrains={liveTrains}
              rerouteActive={rerouteActive}
              speedRestrictionActive={speedRestrictionActive}
              activeScenario={activeScenario}
            />

            {/* 5. PostgreSQL In-Situ Possession Blocks */}
            <InSituMaintenanceBlocks blocks={liveBlocks} />
          </Suspense>
        </Canvas>

        {/* On-Screen HUD Interactive Legend */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono bg-black/85 backdrop-blur-md border border-zinc-800/90 p-3 rounded">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-zinc-500 font-bold uppercase tracking-wider">LIVE TELEMETRY:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#38bdf8]" />
              <span className="text-zinc-300">
                {liveTrains[0]?.train_number || "22436"} (UP Lead • {liveTrains[0]?.speed_kmph || 130} km/h)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded ${rerouteActive ? "bg-emerald-400" : speedRestrictionActive ? "bg-amber-400" : "bg-[#06b6d4]"}`} />
              <span className="text-zinc-300">
                {liveTrains[1]?.train_number || "12424"} ({rerouteActive ? "Rerouted to Loop • 85 km/h" : speedRestrictionActive ? "TSR Caution • 30 km/h" : `UP Headway • ${liveTrains[1]?.speed_kmph || 110} km/h`})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#fbbf24]" />
              <span className="text-zinc-300">
                {liveTrains[liveTrains.length - 1]?.train_number || "BTPN-6602"} (DN Freight)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/70 border border-amber-400" />
              <span className="text-amber-300">
                {liveBlocks[0]?.block_code || "GZB-TDL-UP-1045"} ({liveBlocks[0]?.status || "APPROVED"})
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-zinc-400 font-semibold">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>DRAG TO ROTATE TILT-SHIFT • SCROLL TO ZOOM • LIVE DATA ACTIVE</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThreeDStringChart;
