import React, { useState, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import {
  Layers,
  Box,
  Compass,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  Eye,
  Info,
  Radio,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Mathematical Coordinate Mapping Helpers ─────────────────────────────────
// Time: 00:00 (0m) to 12:00 (720m) mapped to X: -10 to +10
const timeToX = (minutes: number): number => {
  const clamped = Math.max(0, Math.min(720, minutes));
  return -10 + (clamped / 720) * 20;
};

// Distance: GZB (0 km) to CNB (440 km) mapped to Y: +5.5 to -5.5
const kmToY = (km: number): number => {
  const clamped = Math.max(0, Math.min(440, km));
  return 5.5 - (clamped / 440) * 11;
};

// Station Keypoints
const STATIONS = [
  { code: "GZB", name: "Ghaziabad", km: 0 },
  { code: "ALJN", name: "Aligarh Jn", km: 126 },
  { code: "TDL", name: "Tundla Jn", km: 204 },
  { code: "ETW", name: "Etawah Jn", km: 296 },
  { code: "CNB", name: "Kanpur Central", km: 440 },
];

// Z-Planes for Track Lines
const Z_PLANES = {
  UP: -2.5,
  DOWN: 0.0,
  LOOP: 2.5,
};

// ─── Camera Controller for Smooth 2D / 3D Interpolation ─────────────────────
function CameraController({ is2D, resetTrigger }: { is2D: boolean; resetTrigger: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Target camera coordinates
  const targetPos = useRef(new THREE.Vector3(12, 10, 15));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  React.useEffect(() => {
    if (is2D) {
      targetPos.current.set(0, 0, 18);
      targetLookAt.current.set(0, 0, 0);
    } else {
      targetPos.current.set(12, 10, 15);
      targetLookAt.current.set(0, 0, 0);
    }
  }, [is2D, resetTrigger]);

  useFrame(() => {
    camera.position.lerp(targetPos.current, 0.06);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, 0.06);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      maxPolarAngle={Math.PI / 2 + 0.15}
      minPolarAngle={0.05}
      maxDistance={35}
      minDistance={6}
    />
  );
}

// ─── Parallel Track Grid Planes (UP, DOWN, LOOP) ─────────────────────────────
function GridPlanes() {
  const timeLabels = [
    { label: "00:00", min: 0 },
    { label: "02:00", min: 120 },
    { label: "04:00", min: 240 },
    { label: "06:00", min: 360 },
    { label: "08:00", min: 480 },
    { label: "10:00", min: 600 },
    { label: "12:00", min: 720 },
  ];

  return (
    <group>
      {/* 3 Track Planes: UP (-2.5), DOWN (0.0), LOOP (+2.5) */}
      {[
        { z: Z_PLANES.UP, name: "UP LINE [FAST EXPRESS]", color: "#06B6D4" },
        { z: Z_PLANES.DOWN, name: "DOWN LINE [TRUNK CORRIDOR]", color: "#10B981" },
        { z: Z_PLANES.LOOP, name: "3RD / LOOP LINE [FREIGHT / OVERTAKE]", color: "#64748B" },
      ].map((plane) => (
        <group key={plane.z} position={[0, 0, plane.z]}>
          {/* Subtle Wireframe Boundary Plane */}
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[20, 11]} />
            <meshBasicMaterial
              color={plane.color}
              wireframe
              transparent
              opacity={0.07}
            />
          </mesh>

          {/* Plane Backdrop with slight tint */}
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[20, 11]} />
            <meshBasicMaterial
              color="#09090b"
              transparent
              opacity={0.35}
            />
          </mesh>

          {/* Plane Label Tag on Left Margin */}
          <Text
            position={[-10.4, 6.0, 0]}
            fontSize={0.28}
            color={plane.color}
            anchorX="left"
            anchorY="bottom"
            font=""
          >
            {plane.name}
          </Text>

          {/* Station Horizontal Guide Lines */}
          {STATIONS.map((stn) => {
            const y = kmToY(stn.km);
            return (
              <group key={stn.code}>
                {/* Horizontal Guide Line across 00:00 to 12:00 */}
                <Line
                  points={[
                    [-10, y, 0],
                    [10, y, 0],
                  ]}
                  color={stn.km === 0 || stn.km === 440 ? "#71717a" : "#27272a"}
                  lineWidth={stn.km === 0 || stn.km === 440 ? 1.5 : 0.8}
                  dashed={stn.km !== 0 && stn.km !== 440}
                  dashScale={40}
                  dashSize={0.4}
                  gapSize={0.2}
                />

                {/* 3D Station Monospace Text Label */}
                <Text
                  position={[-10.3, y, 0]}
                  fontSize={0.24}
                  color={stn.km === 0 || stn.km === 440 ? "#e4e4e7" : "#a1a1aa"}
                  anchorX="right"
                  anchorY="middle"
                >
                  {`${stn.code} (${stn.km}km)`}
                </Text>
              </group>
            );
          })}

          {/* Vertical Time Interval Grid Lines */}
          {timeLabels.map((t) => {
            const x = timeToX(t.min);
            return (
              <group key={t.label}>
                <Line
                  points={[
                    [x, -5.5, 0],
                    [x, 5.5, 0],
                  ]}
                  color="#18181b"
                  lineWidth={0.6}
                  dashed
                  dashScale={30}
                  dashSize={0.3}
                  gapSize={0.3}
                />
                {/* Time Axis Monospace Labels along bottom */}
                <Text
                  position={[x, -5.85, 0]}
                  fontSize={0.22}
                  color="#71717a"
                  anchorX="center"
                  anchorY="top"
                >
                  {t.label}
                </Text>
              </group>
            );
          })}
        </group>
      ))}

      {/* Axis Framing Hairline Brackets */}
      <Line
        points={[
          [-10, 5.5, Z_PLANES.UP],
          [-10, -5.5, Z_PLANES.UP],
          [10, -5.5, Z_PLANES.UP],
        ]}
        color="#3f3f46"
        lineWidth={1.2}
      />
    </group>
  );
}

// ─── Glowing 3D Train Trajectories ───────────────────────────────────────────
function TrainTrajectories() {
  // 1. Rajdhani Express 12424 (UP Line: Z = -2.5)
  // Departs GZB at 02:00 (120m), arrives CNB at 06:30 (390m)
  // Critical conflict point: enters Block A-14 at ALJN-TDL (KM 184) at 03:45 (225m)
  const rajdhaniPoints: [number, number, number][] = [
    [timeToX(120), kmToY(0), Z_PLANES.UP],
    [timeToX(180), kmToY(126), Z_PLANES.UP],
    [timeToX(225), kmToY(184), Z_PLANES.UP], // Conflict intersection!
    [timeToX(260), kmToY(204), Z_PLANES.UP],
    [timeToX(320), kmToY(296), Z_PLANES.UP],
    [timeToX(390), kmToY(440), Z_PLANES.UP],
  ];

  // 2. Vande Bharat Express 22436 (UP Line: Z = -2.5)
  // High-speed semi-high speed run from GZB (06:00, 360m) to CNB (09:45, 585m)
  const vandeBharatPoints: [number, number, number][] = [
    [timeToX(360), kmToY(0), Z_PLANES.UP],
    [timeToX(430), kmToY(126), Z_PLANES.UP],
    [timeToX(480), kmToY(204), Z_PLANES.UP],
    [timeToX(530), kmToY(296), Z_PLANES.UP],
    [timeToX(585), kmToY(440), Z_PLANES.UP],
  ];

  // 3. BCNHL Freight 41108 (DOWN Line: Z = 0.0)
  // Heavy coal rake traversing reverse from CNB (01:00, 60m) to GZB (09:30, 570m)
  const freightPoints: [number, number, number][] = [
    [timeToX(60), kmToY(440), Z_PLANES.DOWN],
    [timeToX(180), kmToY(350), Z_PLANES.DOWN],
    [timeToX(300), kmToY(250), Z_PLANES.DOWN],
    [timeToX(420), kmToY(150), Z_PLANES.DOWN],
    [timeToX(570), kmToY(0), Z_PLANES.DOWN],
  ];

  return (
    <group>
      {/* 1. Rajdhani 12424: Cyan Neon Ribbon */}
      <Line
        points={rajdhaniPoints}
        color="#06B6D4"
        lineWidth={3.5}
      />
      {/* Label at start of trajectory */}
      <Text
        position={[rajdhaniPoints[0][0] + 0.15, rajdhaniPoints[0][1] + 0.35, Z_PLANES.UP]}
        fontSize={0.25}
        color="#06B6D4"
        anchorX="left"
        anchorY="bottom"
      >
        RAJDHANI 12424 (UP)
      </Text>

      {/* 2. Vande Bharat 22436: Orange Neon Ribbon */}
      <Line
        points={vandeBharatPoints}
        color="#F97316"
        lineWidth={3.5}
      />
      <Text
        position={[vandeBharatPoints[0][0] + 0.15, vandeBharatPoints[0][1] + 0.35, Z_PLANES.UP]}
        fontSize={0.25}
        color="#F97316"
        anchorX="left"
        anchorY="bottom"
      >
        VANDE BHARAT 22436 (UP)
      </Text>

      {/* 3. BCNHL Freight: Slate/Gray Dashed Line */}
      <Line
        points={freightPoints}
        color="#94A3B8"
        lineWidth={2.2}
        dashed
        dashScale={25}
        dashSize={0.5}
        gapSize={0.25}
      />
      <Text
        position={[freightPoints[0][0] + 0.15, freightPoints[0][1] - 0.35, Z_PLANES.DOWN]}
        fontSize={0.23}
        color="#94A3B8"
        anchorX="left"
        anchorY="top"
      >
        BCNHL FREIGHT 41108 (DN)
      </Text>
    </group>
  );
}

// ─── Volumetric Maintenance Possession Blocks ───────────────────────────────
function MaintenancePossessionBlocks() {
  // Block A-14 (TMS + TDMS Bundled)
  // Plane: UP Line (Z = -2.5)
  // Time: 03:00 (180m) to 05:30 (330m)
  // Range: ALJN (126 km) to TDL (204 km)
  const blockAX1 = timeToX(180);
  const blockAX2 = timeToX(330);
  const blockAY1 = kmToY(126);
  const blockAY2 = kmToY(204);

  const widthA = Math.abs(blockAX2 - blockAX1);
  const heightA = Math.abs(blockAY2 - blockAY1);
  const centerAX = (blockAX1 + blockAX2) / 2;
  const centerAY = (blockAY1 + blockAY2) / 2;

  // Block B-09 (SMMS Signal Renewal)
  // Plane: DOWN Line (Z = 0.0)
  // Time: 04:30 (270m) to 07:30 (450m)
  // Range: TDL (204 km) to ETW (296 km)
  const blockBX1 = timeToX(270);
  const blockBX2 = timeToX(450);
  const blockBY1 = kmToY(204);
  const blockBY2 = kmToY(296);

  const widthB = Math.abs(blockBX2 - blockBX1);
  const heightB = Math.abs(blockBY2 - blockBY1);
  const centerBX = (blockBX1 + blockBX2) / 2;
  const centerBY = (blockBY1 + blockBY2) / 2;

  return (
    <group>
      {/* ─── Block A-14: Amber Cuboid on UP Line ───────────────────────────── */}
      <group position={[centerAX, centerAY, Z_PLANES.UP]}>
        {/* Semi-transparent Physical Glass Mesh */}
        <mesh>
          <boxGeometry args={[widthA, heightA, 1.2]} />
          <meshPhysicalMaterial
            color="#F59E0B"
            transmission={0.8}
            roughness={0.2}
            transparent
            opacity={0.45}
            emissive="#F59E0B"
            emissiveIntensity={0.25}
          />
        </mesh>

        {/* Wireframe Outline */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(widthA, heightA, 1.2)]} />
          <lineBasicMaterial color="#FBBF24" linewidth={1.5} />
        </lineSegments>

        {/* Floating 3D Block Metadata Tag */}
        <Text
          position={[0, heightA / 2 + 0.28, 0.65]}
          fontSize={0.26}
          color="#FDE68A"
          anchorX="center"
          anchorY="bottom"
        >
          BLOCK A-14 [TMS+TDMS BUNDLE]
        </Text>
      </group>

      {/* ─── Block B-09: Emerald Cuboid on DOWN Line ───────────────────────── */}
      <group position={[centerBX, centerBY, Z_PLANES.DOWN]}>
        <mesh>
          <boxGeometry args={[widthB, heightB, 1.2]} />
          <meshPhysicalMaterial
            color="#10B981"
            transmission={0.8}
            roughness={0.2}
            transparent
            opacity={0.45}
            emissive="#10B981"
            emissiveIntensity={0.25}
          />
        </mesh>

        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(widthB, heightB, 1.2)]} />
          <lineBasicMaterial color="#34D399" linewidth={1.5} />
        </lineSegments>

        <Text
          position={[0, heightB / 2 + 0.28, 0.65]}
          fontSize={0.26}
          color="#A7F3D0"
          anchorX="center"
          anchorY="bottom"
        >
          BLOCK B-09 [SMMS SIGNAL]
        </Text>
      </group>
    </group>
  );
}

// ─── Pulsing Conflict Beacon with 3D HTML Callout Tag ────────────────────────
function ConflictBeacon() {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  // Exact 3D intersection point: Rajdhani enters Block A-14 at KM 184 (03:45)
  const conflictX = timeToX(225);
  const conflictY = kmToY(184);
  const conflictZ = Z_PLANES.UP;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (sphereRef.current) {
      const s = 1 + Math.sin(t * 8) * 0.25;
      sphereRef.current.scale.set(s, s, s);
    }
    if (ringRef.current) {
      const rs = (t * 2) % 2.5;
      ringRef.current.scale.set(rs, rs, rs);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        1 - rs / 2.5
      );
    }
  });

  return (
    <group position={[conflictX, conflictY, conflictZ]}>
      {/* Glowing Red Spherical Beacon */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>

      {/* Volumetric Radial Wave Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.5, 32]} />
        <meshBasicMaterial color="#EF4444" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* Point Light Illuminating Surrounding Space */}
      <pointLight color="#EF4444" intensity={4} distance={6} />

      {/* 3D HTML Interactive Callout Tag */}
      <Html position={[0.2, 0.4, 0.2]} center distanceFactor={13} zIndexRange={[100, 0]}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/90 border border-red-500/80 rounded shadow-2xl backdrop-blur-md whitespace-nowrap animate-pulse select-none">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-black text-red-200 uppercase tracking-wide">
              [KM 184] CLASH: TRACK RENEWAL VS RAJDHANI 12424
            </span>
            <span className="font-mono text-[10px] text-red-400 font-semibold">
              CRITICAL HEADWAY VIOLATION • DELAY IMPACT: +42 MIN
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── Main 3D String Chart Component ──────────────────────────────────────────
export const ThreeDStringChart: React.FC = () => {
  const [is2D, setIs2D] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  return (
    <Card className="w-full bg-[#050505] border-zinc-800 shadow-2xl overflow-hidden text-white font-sans">
      {/* Header Bar with Telemetry Badges and Viewport Toggle */}
      <CardHeader className="p-4 sm:p-5 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/70">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 bg-cyan-400 rotate-45" />
            <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
              <span>3D SPACE-TIME RAIL MATRIX</span>
              <span className="text-zinc-600 font-normal">//</span>
              <span className="text-cyan-400 font-mono text-xs font-bold">
                MULTI-PLANE STRING CHART
              </span>
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-400">
            <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-cyan-400 font-mono text-[10px]">
              NCR-PRYJ DIVISION
            </Badge>
            <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-emerald-400 font-mono text-[10px]">
              G&SR 15-MIN HEADWAY
            </Badge>
            <Badge variant="outline" className="bg-zinc-900/80 border-zinc-700 text-amber-400 font-mono text-[10px]">
              OR-TOOLS CP-SAT LAYER
            </Badge>
          </div>
        </div>

        {/* Interactive Controls & Viewport Toggle */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIs2D(!is2D)}
            className="bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700 font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            {is2D ? (
              <>
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>SWITCH TO 3D ISOMETRIC</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>SWITCH TO 2D ORTHOGRAPHIC</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setResetKey((k) => k + 1)}
            title="Reset Camera Angle"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800/80 h-8 w-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>

      {/* Interactive 3D Canvas Viewport */}
      <CardContent className="p-0 relative w-full h-[580px] bg-[#050505]">
        <Canvas
          camera={{ position: [12, 10, 15], fov: 45 }}
          gl={{ antialias: true, alpha: false }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          {/* Dark Industrial Canvas Background */}
          <color attach="background" args={["#050505"]} />

          {/* Lighting Rig */}
          <ambientLight color="#06B6D4" intensity={0.9} />
          <directionalLight position={[10, 15, 10]} intensity={1.8} color="#ffffff" />
          <directionalLight position={[-10, 5, -10]} intensity={0.8} color="#06B6D4" />

          {/* Orbit Controls with Camera Interpolation */}
          <CameraController is2D={is2D} resetTrigger={resetKey} />

          {/* Parallel Grid Planes (UP, DOWN, LOOP) */}
          <GridPlanes />

          {/* Glowing 3D Train Trajectories */}
          <TrainTrajectories />

          {/* Volumetric Maintenance Possession Blocks */}
          <MaintenancePossessionBlocks />

          {/* Pulsing Red Conflict Beacon & 3D HTML Tag */}
          <ConflictBeacon />
        </Canvas>

        {/* On-screen HUD Legend Overlay */}
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono bg-black/75 backdrop-blur-md border border-zinc-800/90 p-3 rounded">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-zinc-500 font-bold uppercase tracking-wider">LEGEND:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-[#06B6D4] rounded" />
              <span className="text-zinc-300">Rajdhani 12424 (UP)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-[#F97316] rounded" />
              <span className="text-zinc-300">Vande Bharat 22436 (UP)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-t border-dashed border-[#94A3B8]" />
              <span className="text-zinc-300">Freight 41108 (DN)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500/50 border border-amber-400 rounded-sm" />
              <span className="text-amber-300">Block A-14 [Bundled]</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500/50 border border-emerald-400 rounded-sm" />
              <span className="text-emerald-300">Block B-09 [SMMS]</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-red-400 font-bold">Conflict Beacon</span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-zinc-500">
            <span>DRAG TO ROTATE • SCROLL TO ZOOM • CLICK TOGGLE FOR 2D PROJECTION</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThreeDStringChart;
