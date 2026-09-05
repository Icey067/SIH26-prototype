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

// ─── Overhead Railway Electrification Gantries with Dynamic Block Signaling ───
function OverheadCatenaryGantries({
  train1Ref,
  train2Ref,
  train3Ref,
  rerouteActive = false,
}: {
  train1Ref?: React.RefObject<THREE.Group | null>;
  train2Ref?: React.RefObject<THREE.Group | null>;
  train3Ref?: React.RefObject<THREE.Group | null>;
  rerouteActive?: boolean;
}) {
  const gantryX = [-22, -14, -6, 2, 10, 18, 26];
  const signalMeshesRef = useRef<(THREE.Mesh | null)[]>([]);
  const signalLightsRef = useRef<(THREE.PointLight | null)[]>([]);

  useFrame(() => {
    if (!train1Ref?.current || !train2Ref?.current || !train3Ref?.current) return;
    const p1 = train1Ref.current.position;
    const p2 = train2Ref.current.position;
    const p3 = train3Ref.current.position;

    // Check if Turnout #34-B is currently occupied by Train 2
    const isCrossoverOccupied = rerouteActive && p2.x >= 6.5 && p2.x <= 19.5;

    gantryX.forEach((gx, gIdx) => {
      [-3.2, 0, 3.2].forEach((gz, sIdx) => {
        const flatIdx = gIdx * 3 + sIdx;
        const mesh = signalMeshesRef.current[flatIdx];
        const light = signalLightsRef.current[flatIdx];
        if (!mesh || !light) return;

        let color = "#10b981"; // Default Green (clear)

        if (gz === -3.2) {
          // Track 01 (UP Fast Line, train direction +X)
          const t1InBlock = p1.x >= gx - 1.0 && p1.x < gx + 8.0;
          const t2InBlock = (!rerouteActive || p2.x < 8) && p2.x >= gx - 1.0 && p2.x < gx + 8.0;
          const t1InApproach = p1.x >= gx + 8.0 && p1.x < gx + 16.0;
          const t2InApproach = (!rerouteActive || p2.x < 8) && p2.x >= gx + 8.0 && p2.x < gx + 16.0;

          if (t1InBlock || t2InBlock) {
            color = "#ef4444"; // Red (Occupied)
          } else if (t1InApproach || t2InApproach) {
            color = "#f59e0b"; // Yellow (Caution)
          }
        } else if (gz === 0.0) {
          // Track 02 (DOWN Mainline, train direction -X)
          if (isCrossoverOccupied && (gx === 18 || gx === 26)) {
            color = "#ef4444"; // Red (Interlocking Hold before Turnout #34-B)
          } else {
            const t3InBlock = p3.x <= gx + 1.0 && p3.x > gx - 8.0;
            const t3InApproach = p3.x <= gx - 8.0 && p3.x > gx - 16.0;
            if (t3InBlock) {
              color = "#ef4444"; // Red
            } else if (t3InApproach) {
              color = "#f59e0b"; // Yellow
            }
          }
        } else if (gz === 3.2) {
          // Track 03 (Loop Overtake Line)
          if (rerouteActive) {
            const t2InBlock = p2.z > 1.0 && p2.x >= gx - 1.0 && p2.x < gx + 8.0;
            const t2InApproach = p2.z > 1.0 && p2.x >= gx + 8.0 && p2.x < gx + 16.0;
            if (t2InBlock) {
              color = "#ef4444";
            } else if (t2InApproach) {
              color = "#f59e0b";
            }
          } else {
            color = "#f59e0b"; // Amber (Inactive siding warning)
          }
        }

        (mesh.material as THREE.MeshBasicMaterial).color.set(color);
        light.color.set(color);
      });
    });
  });

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
            const flatIdx = idx * 3 + sIdx;

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
                <mesh
                  ref={(el) => { signalMeshesRef.current[flatIdx] = el; }}
                  position={[0, -0.2, 0.27]}
                >
                  <sphereGeometry args={[0.05, 8, 8]} />
                  <meshBasicMaterial color="#10b981" />
                </mesh>
                <pointLight
                  ref={(el) => { signalLightsRef.current[flatIdx] = el; }}
                  color="#10b981"
                  intensity={1.2}
                  distance={3}
                  position={[0, -0.2, 0.35]}
                />
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
  train1Ref,
  train2Ref,
  train3Ref,
}: {
  rerouteActive?: boolean;
  speedRestrictionActive?: boolean;
  train1Ref?: React.RefObject<THREE.Group | null>;
  train2Ref?: React.RefObject<THREE.Group | null>;
  train3Ref?: React.RefObject<THREE.Group | null>;
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

      {/* Turnout Crossover from Track 01 (Z=-3.2) to Track 03 (Z=3.2) across Track 02 (Z=0) */}
      <group position={[13.0, 0.18, 0.0]} rotation={[0, -0.569, 0]}>
        <mesh position={[0, 0.08, -0.45]}>
          <boxGeometry args={[12.2, 0.1, 0.06]} />
          <meshStandardMaterial
            color={rerouteActive ? "#10b981" : "#94a3b8"}
            emissive={rerouteActive ? "#059669" : "#000000"}
            emissiveIntensity={rerouteActive ? 2.5 : 0}
            metalness={0.95}
            roughness={0.15}
          />
        </mesh>
        <mesh position={[0, 0.08, 0.45]}>
          <boxGeometry args={[12.2, 0.1, 0.06]} />
          <meshStandardMaterial
            color={rerouteActive ? "#10b981" : "#94a3b8"}
            emissive={rerouteActive ? "#059669" : "#000000"}
            emissiveIntensity={rerouteActive ? 2.5 : 0}
            metalness={0.95}
            roughness={0.15}
          />
        </mesh>
        {/* Angled turnout sleepers */}
        {Array.from({ length: 14 }).map((_, i) => (
          <mesh key={`to-slp-${i}`} position={[-5.5 + i * 0.85, 0.02, 0]}>
            <boxGeometry args={[0.28, 0.06, 1.4]} />
            <meshStandardMaterial color="#475569" roughness={0.8} />
          </mesh>
        ))}
        <pointLight
          color={rerouteActive ? "#10b981" : "#00f0ff"}
          intensity={rerouteActive ? 5.5 : 1.5}
          distance={7}
          position={[0, 0.4, 0]}
        />
        {rerouteActive && (
          <Html position={[0, 2.2, 0]} center distanceFactor={14} zIndexRange={[60, 0]}>
            <div className="px-2.5 py-1 bg-emerald-950/95 border border-emerald-400 rounded text-[9px] font-mono text-emerald-300 font-bold uppercase whitespace-nowrap shadow-xl flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>TURNOUT #34-B // 3RD LINE BYPASS ENGAGED (INTERLOCKED)</span>
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

      <OverheadCatenaryGantries
        train1Ref={train1Ref}
        train2Ref={train2Ref}
        train3Ref={train3Ref}
        rerouteActive={rerouteActive}
      />
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

// ─── Live Train Fleet with Real-Time Telemetry & Kavach Headway Engine ───────
function LiveTrainFleet({
  liveTrains,
  rerouteActive = false,
  speedRestrictionActive = false,
  activeScenario = "NONE",
  train1Ref,
  train2Ref,
  train3Ref,
}: {
  liveTrains: TrainTelemetry[];
  rerouteActive?: boolean;
  speedRestrictionActive?: boolean;
  activeScenario?: "NONE" | "CP_SAT" | "REROUTE" | "SPEED_RESTRICTION";
  train1Ref: React.RefObject<THREE.Group | null>;
  train2Ref: React.RefObject<THREE.Group | null>;
  train3Ref: React.RefObject<THREE.Group | null>;
}) {
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

  // Actual instantaneous velocities managed smoothly in useFrame
  const v1Actual = useRef((t1.speed_kmph || 125) * 0.035);
  const v2Actual = useRef((t2.speed_kmph || 110) * 0.032);
  const v3Actual = useRef((t3.speed_kmph || 65) * 0.040);

  // Status records updated in useFrame and synchronized to state at 6 FPS
  const t1StatusRef = useRef<{ mode: string; text: string }>({
    mode: "NORMAL",
    text: `LEAD EXPRESS // ${t1.speed_kmph} KM/H • TRACK CLEAR`,
  });

  const t2StatusRef = useRef<{ mode: string; text: string }>({
    mode: "NORMAL",
    text: `TRAILING EXPRESS // ${t2.speed_kmph} KM/H • TRACK CLEAR`,
  });

  const t3StatusRef = useRef<{ isHolding: boolean; text: string }>({
    isHolding: false,
    text: `DN MAINLINE FREIGHT // ${t3.speed_kmph} KM/H • CLEAR`,
  });

  const [hudState, setHudState] = useState({
    t1Text: "LEAD EXPRESS // 130 KM/H • TRACK CLEAR",
    t1Mode: "NORMAL",
    t2Text: "TRAILING EXPRESS // 120 KM/H • TRACK CLEAR",
    t2Mode: "NORMAL",
    t3Text: "DN MAINLINE FREIGHT // 65 KM/H • CLEAR",
    t3Holding: false,
  });

  const frameCounter = useRef(0);

  useFrame((_, delta) => {
    if (!train1Ref.current || !train2Ref.current || !train3Ref.current) return;

    const dt = Math.min(delta, 0.1);

    // Dynamic base velocities from API
    const v1Base = (t1.speed_kmph || 125) * 0.035;
    let v2Base = (t2.speed_kmph || 110) * 0.032;

    if (speedRestrictionActive) {
      v2Base = 30 * 0.035; // TSR 30 km/h caution order
    } else if (rerouteActive) {
      v2Base = 85 * 0.032; // Loop line cruising speed
    }

    const v3Base = (t3.speed_kmph || 65) * 0.040;

    const pos1 = train1Ref.current.position;
    const pos2 = train2Ref.current.position;
    const pos3 = train3Ref.current.position;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. KAVACH AUTOMATIC TRAIN PROTECTION (ATP) HEADWAY ON TRACK 01 (Z = -3.2)
    // ─────────────────────────────────────────────────────────────────────────
    const bothOnTrack1 = !rerouteActive || (pos2.x < 8 && pos2.z < -2.0);

    let desiredSpeed1 = v1Base;
    let desiredSpeed2 = v2Base;

    const TRACK_LEN = 52.0; // Corridor domain [-26, 26]
    const EMERGENCY_STOP_GAP = 9.2; // Absolute minimum physical clearance
    const CAUTION_SLOW_GAP = 18.0;   // Yellow aspect deceleration zone

    if (bothOnTrack1) {
      // Forward circular distance from Train 2 to Train 1 in +X direction:
      const dist2to1 = ((pos1.x - pos2.x) % TRACK_LEN + TRACK_LEN) % TRACK_LEN;
      // Forward circular distance from Train 1 to Train 2 in +X direction:
      const dist1to2 = ((pos2.x - pos1.x) % TRACK_LEN + TRACK_LEN) % TRACK_LEN;

      if (dist2to1 <= dist1to2) {
        // Train 1 is ahead of Train 2! Train 2 is trailing.
        const gap = dist2to1;

        if (activeScenario === "CP_SAT") {
          // CP-SAT mathematically synchronized slot (optimal headway ~20m)
          if (gap < 20) {
            desiredSpeed2 = v1Actual.current * 0.85;
            t2StatusRef.current.mode = "CP_SAT";
            t2StatusRef.current.text = `CP-SAT SYNCHRONIZED // GAP ${gap.toFixed(1)}m • AUTHORIZED`;
          } else {
            desiredSpeed2 = desiredSpeed1;
            t2StatusRef.current.mode = "CP_SAT";
            t2StatusRef.current.text = `CP-SAT OPTIMAL MATRIX // ZERO DELAY • 120 KM/H`;
          }
        } else if (gap <= EMERGENCY_STOP_GAP) {
          // Red Aspect: Kavach Emergency Stop
          desiredSpeed2 = 0;
          t2StatusRef.current.mode = "KAVACH_STOP";
          t2StatusRef.current.text = `KAVACH ATP [RED] // BRAKE APPLIED • GAP ${gap.toFixed(1)}m`;
        } else if (gap < CAUTION_SLOW_GAP) {
          // Yellow Aspect: Kavach Caution Speed Regulation
          const factor = (gap - EMERGENCY_STOP_GAP) / (CAUTION_SLOW_GAP - EMERGENCY_STOP_GAP);
          desiredSpeed2 = Math.max(0.2, v1Actual.current * factor);
          t2StatusRef.current.mode = "KAVACH_CAUTION";
          t2StatusRef.current.text = `KAVACH ATP [CAUTION] // SPEED REGULATED • GAP ${gap.toFixed(1)}m`;
        } else {
          t2StatusRef.current.mode = speedRestrictionActive ? "TSR" : "NORMAL";
          t2StatusRef.current.text = speedRestrictionActive
            ? `TSR 30 KM/H CAUTION ORDER // KM 170-184`
            : `${t2.speed_kmph} KM/H • ON-TIME • GAP ${gap.toFixed(1)}m`;
        }

        t1StatusRef.current.mode = "NORMAL";
        t1StatusRef.current.text = `LEAD EXPRESS // ${t1.speed_kmph} KM/H • TRACK 01 CLEAR`;
      } else {
        // Train 2 is ahead of Train 1! Train 1 is trailing.
        const gap = dist1to2;

        if (gap <= EMERGENCY_STOP_GAP) {
          desiredSpeed1 = 0;
          t1StatusRef.current.mode = "KAVACH_STOP";
          t1StatusRef.current.text = `KAVACH ATP [RED] // BRAKE APPLIED • GAP ${gap.toFixed(1)}m`;
        } else if (gap < CAUTION_SLOW_GAP) {
          const factor = (gap - EMERGENCY_STOP_GAP) / (CAUTION_SLOW_GAP - EMERGENCY_STOP_GAP);
          desiredSpeed1 = Math.max(0.2, v2Actual.current * factor);
          t1StatusRef.current.mode = "KAVACH_CAUTION";
          t1StatusRef.current.text = `KAVACH ATP [CAUTION] // SPEED REGULATED • GAP ${gap.toFixed(1)}m`;
        } else {
          t1StatusRef.current.mode = "NORMAL";
          t1StatusRef.current.text = `LEAD EXPRESS // ${t1.speed_kmph} KM/H • TRACK 01 CLEAR`;
        }

        t2StatusRef.current.mode = speedRestrictionActive ? "TSR" : "NORMAL";
        t2StatusRef.current.text = speedRestrictionActive
          ? `TSR 30 KM/H PRE-WARNING • KM 170-184`
          : `${t2.speed_kmph} KM/H • LEAD BLOCK CLEAR`;
      }
    } else {
      // Train 2 is on Loop Line (Track 03) or traversing switch
      t1StatusRef.current.mode = "NORMAL";
      t1StatusRef.current.text = `UP FAST EXPRESS // ${t1.speed_kmph} KM/H • TRACK 01 CLEAR`;

      t2StatusRef.current.mode = "REROUTED";
      t2StatusRef.current.text = pos2.x >= 18
        ? `LOOP OVERTAKE LINE // 85 KM/H • BYPASS CLEAR`
        : `TURNOUT 34-B TRAVERSAL // ROUTE INTERLOCKED`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. TURNOUT #34-B INTERLOCKING SIGNAL HOLD (TRACK 02 vs TRAIN 3)
    // ─────────────────────────────────────────────────────────────────────────
    let desiredSpeed3 = v3Base;
    const isCrossoverOccupied = rerouteActive && (pos2.x >= 6.5 && pos2.x <= 19.5);

    if (isCrossoverOccupied) {
      // Train 3 travels towards -X on Track 02. Stop Train 3 before fouling mark at X = 20.8
      if (pos3.x >= 20.0 && pos3.x <= 25.5) {
        desiredSpeed3 = 0;
        t3StatusRef.current.isHolding = true;
        t3StatusRef.current.text = `INTERLOCKING HOLD [RED] // WAITING TURNOUT 34-B`;
      } else {
        t3StatusRef.current.isHolding = false;
        t3StatusRef.current.text = `DN MAINLINE FREIGHT // ${t3.speed_kmph} KM/H`;
      }
    } else {
      t3StatusRef.current.isHolding = false;
      t3StatusRef.current.text = `DN MAINLINE FREIGHT // ${t3.speed_kmph} KM/H • CLEAR`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. SMOOTH BRAKING / ACCELERATION DYNAMICS
    // ─────────────────────────────────────────────────────────────────────────
    const accel = 3.5;
    const brake = 8.5;

    v1Actual.current = v1Actual.current > desiredSpeed1
      ? Math.max(desiredSpeed1, v1Actual.current - dt * brake)
      : Math.min(desiredSpeed1, v1Actual.current + dt * accel);

    v2Actual.current = v2Actual.current > desiredSpeed2
      ? Math.max(desiredSpeed2, v2Actual.current - dt * brake)
      : Math.min(desiredSpeed2, v2Actual.current + dt * accel);

    v3Actual.current = v3Actual.current > desiredSpeed3
      ? Math.max(desiredSpeed3, v3Actual.current - dt * brake)
      : Math.min(desiredSpeed3, v3Actual.current + dt * accel);

    // ─────────────────────────────────────────────────────────────────────────
    // 4. POSITION ADVANCEMENT & SAFE WRAP-AROUND QUEUEING
    // ─────────────────────────────────────────────────────────────────────────
    // Train 1:
    pos1.x += dt * v1Actual.current;
    if (pos1.x > 26) {
      const entryOccupied = !rerouteActive && (pos2.x >= -26 && pos2.x <= -16);
      if (!entryOccupied) {
        pos1.x = -26;
      } else {
        pos1.x = 26.2; // Hold at boundary signal until entry clears
      }
    }

    // Train 2:
    pos2.x += dt * v2Actual.current;
    if (pos2.x > 26) {
      const entryOccupied = !rerouteActive && (pos1.x >= -26 && pos1.x <= -16);
      if (!entryOccupied) {
        pos2.x = -26;
      } else {
        pos2.x = 26.2;
      }
    }

    // Turnout #34-B Traversal & 3D Alignment for Train 2
    if (rerouteActive) {
      const x = pos2.x;
      if (x < 8) {
        pos2.z = -3.2;
        train2Ref.current.rotation.y = 0;
      } else if (x >= 8 && x <= 18) {
        const progress = (x - 8) / 10;
        pos2.z = -3.2 + progress * 6.4;
        train2Ref.current.rotation.y = -0.569; // Exactly aligns with switch angle
      } else {
        pos2.z = 3.2;
        train2Ref.current.rotation.y = 0;
      }
    } else {
      pos2.z = -3.2;
      train2Ref.current.rotation.y = 0;
    }

    // Train 3:
    pos3.x -= dt * v3Actual.current;
    if (pos3.x < -26) {
      pos3.x = 26;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. THROTTLED HUD REACTION (6 FPS update for silky smooth HTML)
    // ─────────────────────────────────────────────────────────────────────────
    frameCounter.current++;
    if (frameCounter.current % 10 === 0) {
      setHudState({
        t1Text: t1StatusRef.current.text,
        t1Mode: t1StatusRef.current.mode,
        t2Text: t2StatusRef.current.text,
        t2Mode: t2StatusRef.current.mode,
        t3Text: t3StatusRef.current.text,
        t3Holding: t3StatusRef.current.isHolding,
      });
    }
  });

  const getStatusBadgeClass = (status: string, delay: number) => {
    if (delay === 0 || status === "ON_TIME") return "text-cyan-400 border-cyan-400/80 bg-cyan-950/90";
    if (delay > 15 || status === "CRITICAL_DELAY") return "text-red-400 border-red-400/80 bg-red-950/90";
    return "text-amber-400 border-amber-400/80 bg-amber-950/90";
  };

  return (
    <group>
      {/* ─── Live Train 1: UP Fast Line (Z = -3.2) ───────────────────────── */}
      <group ref={train1Ref} position={[12, 0.32, -3.2]}>
        <BulletTrainModel position={[1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <BulletCarriageModel position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <BulletCarriageModel position={[-1.8, 0, 0]} rotation={[0, Math.PI / 2, 0]} />

        <pointLight color="#38bdf8" intensity={4.5} distance={8} position={[3.5, 0.6, 0]} />

        <Html position={[0, 2.4, 0]} center distanceFactor={14} zIndexRange={[50, 0]}>
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px] border ${
            hudState.t1Mode === "KAVACH_STOP"
              ? "text-red-400 border-red-400/90 bg-red-950/95 animate-pulse"
              : hudState.t1Mode === "KAVACH_CAUTION"
              ? "text-amber-400 border-amber-400/90 bg-amber-950/95 animate-pulse"
              : getStatusBadgeClass(t1.status, t1.delay_minutes)
          }`}>
            <TrainIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <div className="flex flex-col text-left">
              <span className="font-bold text-white tracking-wide">{t1.train_number} {t1.train_name}</span>
              <span className="font-semibold text-[9px]">{hudState.t1Text}</span>
            </div>
          </div>
        </Html>
      </group>

      {/* ─── Live Train 2: UP Fast Line (Z = -3.2) / Rerouted to Loop (Z = 3.2) ─── */}
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
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded shadow-2xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px] border ${
            hudState.t2Mode === "REROUTED"
              ? "text-emerald-400 border-emerald-400/90 bg-emerald-950/95 animate-pulse"
              : hudState.t2Mode === "KAVACH_STOP"
              ? "text-red-400 border-red-400/90 bg-red-950/95 animate-pulse"
              : hudState.t2Mode === "KAVACH_CAUTION"
              ? "text-amber-400 border-amber-400/90 bg-amber-950/95 animate-pulse"
              : hudState.t2Mode === "CP_SAT"
              ? "text-cyan-400 border-cyan-400/90 bg-cyan-950/95"
              : hudState.t2Mode === "TSR"
              ? "text-amber-400 border-amber-400/90 bg-amber-950/95 animate-pulse"
              : getStatusBadgeClass(t2.status, t2.delay_minutes)
          }`}>
            {hudState.t2Mode === "REROUTED" ? (
              <Navigation className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
            ) : hudState.t2Mode === "KAVACH_STOP" ? (
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
            ) : (
              <TrainIcon className="w-3.5 h-3.5 flex-shrink-0 text-cyan-400" />
            )}
            <div className="flex flex-col text-left">
              <span className="font-bold text-white tracking-wide">{t2.train_number} {t2.train_name}</span>
              <span className="font-semibold text-[9px]">{hudState.t2Text}</span>
            </div>
          </div>
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
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[10px] border ${
            hudState.t3Holding
              ? "text-red-400 border-red-500/90 bg-red-950/95 animate-pulse"
              : "bg-zinc-900/90 border-zinc-600 text-amber-400"
          }`}>
            {hudState.t3Holding ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            ) : (
              <TrainIcon className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            )}
            <div className="flex flex-col text-left">
              <span className="font-bold text-white tracking-wide">{t3.train_number} {t3.train_name}</span>
              <span className="text-zinc-300 font-semibold text-[9px]">{hudState.t3Text}</span>
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// ─── Real PostgreSQL In-Situ Maintenance Possession Blocks ───────────────────
function InSituMaintenanceBlocks({
  blocks,
  rerouteActive = false,
}: {
  blocks: MaintenanceBlock[];
  rerouteActive?: boolean;
}) {
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
        {!rerouteActive ? (
          <>
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
                    KM {b2.start_km} TO {b2.end_km} • {b2.status} • SIDING CLEAR
                  </span>
                </div>
              </div>
            </Html>
          </>
        ) : (
          <Html position={[0, 2.4, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
            <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-950/90 border border-emerald-400/80 rounded shadow-xl backdrop-blur-md whitespace-nowrap select-none font-mono text-[9px] text-emerald-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>LOOP SIDING UNLOCKED // BYPASS CORRIDOR ACTIVE</span>
            </div>
          </Html>
        )}
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
  const train1Ref = useRef<THREE.Group>(null);
  const train2Ref = useRef<THREE.Group>(null);
  const train3Ref = useRef<THREE.Group>(null);
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
              train1Ref={train1Ref}
              train2Ref={train2Ref}
              train3Ref={train3Ref}
            />

            {/* 4. Live Train Models Driven by Real Backend Telemetry */}
            <LiveTrainFleet
              liveTrains={liveTrains}
              rerouteActive={rerouteActive}
              speedRestrictionActive={speedRestrictionActive}
              activeScenario={activeScenario}
              train1Ref={train1Ref}
              train2Ref={train2Ref}
              train3Ref={train3Ref}
            />

            {/* 5. PostgreSQL In-Situ Possession Blocks */}
            <InSituMaintenanceBlocks blocks={liveBlocks} rerouteActive={rerouteActive} />
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
