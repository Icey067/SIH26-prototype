import React, { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { TrainTrajectory, MaintenanceBlock, ConflictItem } from "@/types/railway";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rotate3d, Play, Pause, ShieldAlert, AlertTriangle, Sparkles, Activity, Eye } from "lucide-react";

interface Marey3DViewProps {
  trajectories?: TrainTrajectory[];
  blocks?: MaintenanceBlock[];
  conflicts?: ConflictItem[];
  selectedDirection?: "ALL" | "DN" | "UP";
  showConflictsOnly?: boolean;
  onOpenGrantModal?: (block: MaintenanceBlock) => void;
}

// Full baseline corridor trajectories guaranteeing instant visual display
const DEFAULT_TRAJECTORIES: TrainTrajectory[] = [
  {
    train_id: "22436",
    name: "Vande Bharat Express",
    direction: "DN",
    priority: "VIP_PREMIUM",
    weight: 10,
    color: "#00f0ff", // Neon Electric Cyan
    points: [
      { km: 0.0, minute: 380, time_str: "06:20", station: "GZB" },
      { km: 126.0, minute: 435, time_str: "07:15", station: "ALJN" },
      { km: 204.0, minute: 472, time_str: "07:52", station: "TDL" },
      { km: 296.0, minute: 515, time_str: "08:35", station: "ETW" },
      { km: 440.0, minute: 585, time_str: "09:45", station: "CNB" },
    ],
  },
  {
    train_id: "12424",
    name: "Dibrugarh Rajdhani",
    direction: "DN",
    priority: "VIP_PREMIUM",
    weight: 9,
    color: "#ffb703", // Radiant Solar Gold
    points: [
      { km: 0.0, minute: 985, time_str: "16:25", station: "GZB" },
      { km: 126.0, minute: 1045, time_str: "17:25", station: "ALJN" },
      { km: 204.0, minute: 1085, time_str: "18:05", station: "TDL" },
      { km: 296.0, minute: 1135, time_str: "18:55", station: "ETW" },
      { km: 440.0, minute: 1215, time_str: "20:15", station: "CNB" },
    ],
  },
  {
    train_id: "12004",
    name: "Lucknow Shatabdi",
    direction: "DN",
    priority: "HIGH_SPEED_SUPERFAST",
    weight: 8,
    color: "#d946ef", // Cyberpunk Neon Violet
    points: [
      { km: 0.0, minute: 405, time_str: "06:45", station: "GZB" },
      { km: 126.0, minute: 470, time_str: "07:50", station: "ALJN" },
      { km: 204.0, minute: 512, time_str: "08:32", station: "TDL" },
      { km: 296.0, minute: 560, time_str: "09:20", station: "ETW" },
      { km: 440.0, minute: 645, time_str: "10:45", station: "CNB" },
    ],
  },
  {
    train_id: "12398",
    name: "Mahabodhi Express",
    direction: "DN",
    priority: "SUPERFAST",
    weight: 7,
    color: "#10b981", // Emerald Laser
    points: [
      { km: 0.0, minute: 765, time_str: "12:45", station: "GZB" },
      { km: 126.0, minute: 835, time_str: "13:55", station: "ALJN" },
      { km: 204.0, minute: 880, time_str: "14:40", station: "TDL" },
      { km: 296.0, minute: 930, time_str: "15:30", station: "ETW" },
      { km: 440.0, minute: 1020, time_str: "17:00", station: "CNB" },
    ],
  },
  {
    train_id: "12003",
    name: "Lucknow Shatabdi (Up)",
    direction: "UP",
    priority: "HIGH_SPEED_SUPERFAST",
    weight: 8,
    color: "#06b6d4", // Electric Cyan
    points: [
      { km: 440.0, minute: 990, time_str: "16:30", station: "CNB" },
      { km: 296.0, minute: 1070, time_str: "17:50", station: "ETW" },
      { km: 204.0, minute: 1115, time_str: "18:35", station: "TDL" },
      { km: 126.0, minute: 1160, time_str: "19:20", station: "ALJN" },
      { km: 0.0, minute: 1230, time_str: "20:30", station: "GZB" },
    ],
  },
  {
    train_id: "BOXN_701",
    name: "Heavy Coal Freight Rake",
    direction: "UP",
    priority: "FREIGHT",
    weight: 4,
    color: "#f97316", // Magma Orange
    points: [
      { km: 440.0, minute: 120, time_str: "02:00", station: "CNB" },
      { km: 296.0, minute: 280, time_str: "04:40", station: "ETW" },
      { km: 204.0, minute: 390, time_str: "06:30", station: "TDL" },
      { km: 126.0, minute: 480, time_str: "08:00", station: "ALJN" },
      { km: 0.0, minute: 620, time_str: "10:20", station: "GZB" },
    ],
  },
  {
    train_id: "12418",
    name: "Prayagraj Superfast",
    direction: "DN",
    priority: "EXPRESS",
    weight: 6,
    color: "#38bdf8",
    points: [
      { km: 0.0, minute: 1340, time_str: "22:20", station: "GZB" },
      { km: 126.0, minute: 1415, time_str: "23:35", station: "ALJN" },
      { km: 204.0, minute: 1440, time_str: "24:00", station: "TDL" },
    ],
  },
  {
    train_id: "BOXN_702",
    name: "Container Freight (Regulated)",
    direction: "DN",
    priority: "FREIGHT",
    weight: 3,
    color: "#e11d48", // Neon Red/Rose
    points: [
      { km: 0.0, minute: 420, time_str: "07:00", station: "GZB" },
      { km: 126.0, minute: 550, time_str: "09:10", station: "ALJN" },
      { km: 204.0, minute: 640, time_str: "10:40", station: "TDL" },
      { km: 296.0, minute: 750, time_str: "12:30", station: "ETW" },
      { km: 440.0, minute: 900, time_str: "15:00", station: "CNB" },
    ],
  },
];

const STATIONS = [
  { code: "GZB", name: "Ghaziabad", km: 0 },
  { code: "ALJN", name: "Aligarh Jn", km: 126 },
  { code: "TDL", name: "Tundla Jn", km: 204 },
  { code: "ETW", name: "Etawah Jn", km: 296 },
  { code: "PHD", name: "Phaphund", km: 352 },
  { code: "CNB", name: "Kanpur Central", km: 440 },
];

export const Marey3DView: React.FC<Marey3DViewProps> = ({
  trajectories = [],
  blocks = [],
  conflicts = [],
  selectedDirection = "ALL",
  showConflictsOnly = false,
  onOpenGrantModal,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredTrain, setHoveredTrain] = useState<TrainTrajectory | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<MaintenanceBlock | null>(null);
  const [hoveredConflict, setHoveredConflict] = useState<ConflictItem | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [cameraView, setCameraView] = useState<"ISO" | "TOP" | "TRACK">("ISO");

  // Interaction state refs for mouse orbit
  const isDraggingRef = useRef(false);
  const isPanningRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: 0.65, phi: 1.05, radius: 36 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const interactiveMeshesRef = useRef<{ mesh: THREE.Object3D; data: any; type: "TRAIN" | "BLOCK" | "CONFLICT" }[]>([]);
  const movingTrainMeshesRef = useRef<{ mesh: THREE.Object3D; curve: THREE.CatmullRomCurve3; speed: number; offset: number }[]>([]);

  // Coordinate transforms
  // Time (minutes 0 to 1440) -> X [-18, +18]
  const mapTimeToX = (min: number) => (Math.max(0, Math.min(1440, min)) / 1440 - 0.5) * 36;
  // Distance (km 0 to 440) -> Y [+9, -9]
  const mapKmToY = (km: number) => (0.5 - Math.max(0, Math.min(440, km)) / 440) * 18;
  // Track Layer Depth -> Z (+3.2 for UP line, -3.2 for DN line)
  const mapLineToZ = (dir: string) => (dir === "UP" ? 3.2 : dir === "DN" ? -3.2 : 0);

  // Use passed trajectories if present, otherwise rich fallback
  const activeTrajectories = useMemo(() => {
    const source = trajectories && trajectories.length > 0 ? trajectories : DEFAULT_TRAJECTORIES;
    if (selectedDirection === "ALL") return source;
    return source.filter((t) => t.direction === selectedDirection);
  }, [trajectories, selectedDirection]);

  // Create crisp glowing canvas sprite for text & HUD badges
  const createTextSprite = (text: string, color: string = "#38bdf8", bgColor: string = "rgba(3, 7, 18, 0.75)", fontSize: number = 24) => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 70;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.Object3D();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Glowing Pill Background
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 12);
    ctx.fill();
    ctx.stroke();

    // Text with glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(3.8, 0.85, 1);
    return sprite;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x02040a);
    scene.fog = new THREE.FogExp2(0x02040a, 0.012);

    // 2. Camera Setup
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Futuristic Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.2);
    scene.add(ambientLight);

    const primaryBeacon = new THREE.PointLight(0x00f0ff, 2.5, 60);
    primaryBeacon.position.set(0, 15, 10);
    scene.add(primaryBeacon);

    const secondaryBeacon = new THREE.PointLight(0xd946ef, 2.0, 60);
    secondaryBeacon.position.set(0, -15, -10);
    scene.add(secondaryBeacon);

    // 5. Cybernetic Ambient Starfield / Floating Data Particles
    const particleCount = 400;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 60;
      particlePos[i + 1] = (Math.random() - 0.5) * 35;
      particlePos[i + 2] = (Math.random() - 0.5) * 25;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.15,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const starfield = new THREE.Points(particleGeo, particleMat);
    scene.add(starfield);

    interactiveMeshesRef.current = [];
    movingTrainMeshesRef.current = [];

    // 6. Holographic Track Planes (UP Line at +3.2Z, DOWN Line at -3.2Z)
    const trackFloorGeo = new THREE.PlaneGeometry(36, 18);
    const upFloorMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    });
    const upFloor = new THREE.Mesh(trackFloorGeo, upFloorMat);
    upFloor.position.set(0, 0, 3.2);
    scene.add(upFloor);

    const dnFloorMat = new THREE.MeshBasicMaterial({
      color: 0xff007f,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
    });
    const dnFloor = new THREE.Mesh(trackFloorGeo, dnFloorMat);
    dnFloor.position.set(0, 0, -3.2);
    scene.add(dnFloor);

    // Glowing Neon Track Edge Boundaries
    [-3.2, 3.2].forEach((z, idx) => {
      const color = idx === 1 ? 0x00f0ff : 0xff007f;
      const pts = [
        new THREE.Vector3(-18, mapKmToY(0), z),
        new THREE.Vector3(18, mapKmToY(0), z),
        new THREE.Vector3(18, mapKmToY(440), z),
        new THREE.Vector3(-18, mapKmToY(440), z),
        new THREE.Vector3(-18, mapKmToY(0), z),
      ];
      const outlineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const outlineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 });
      scene.add(new THREE.Line(outlineGeo, outlineMat));
    });

    // 7. Station Vertical Hologram Columns & Beacons
    STATIONS.forEach((stn) => {
      const y = mapKmToY(stn.km);

      // Station Laser Wire across Time (X)
      [-3.2, 3.2].forEach((z) => {
        const stationLineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-18, y, z),
          new THREE.Vector3(18, y, z),
        ]);
        const stationLineMat = new THREE.LineBasicMaterial({
          color: stn.code === "GZB" || stn.code === "CNB" ? 0x38bdf8 : 0x1e293b,
          transparent: true,
          opacity: 0.85,
        });
        scene.add(new THREE.Line(stationLineGeo, stationLineMat));
      });

      // Futuristic Station Beacon Cylinder
      const beaconGeo = new THREE.CylinderGeometry(0.12, 0.12, 8, 16);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.25,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.rotation.x = Math.PI / 2;
      beacon.position.set(-18.5, y, 0);
      scene.add(beacon);

      // Station HUD Billboard Sprite
      const stnSprite = createTextSprite(`${stn.code} • ${stn.km}k`, "#38bdf8", "rgba(8, 47, 73, 0.8)", 26);
      stnSprite.position.set(-20.2, y, 0);
      scene.add(stnSprite);
    });

    // 8. Time Axis Ticks (Every 2 Hours)
    for (let hour = 0; hour <= 24; hour += 2) {
      const x = mapTimeToX(hour * 60);
      const timeStr = `${hour.toString().padStart(2, "0")}:00`;

      [-3.2, 3.2].forEach((z) => {
        const timeLineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, mapKmToY(0), z),
          new THREE.Vector3(x, mapKmToY(440), z),
        ]);
        const timeLineMat = new THREE.LineBasicMaterial({
          color: hour % 6 === 0 ? 0x334155 : 0x0f172a,
          transparent: true,
          opacity: 0.7,
        });
        scene.add(new THREE.Line(timeLineGeo, timeLineMat));
      });

      const timeSprite = createTextSprite(timeStr, "#94a3b8", "rgba(15, 23, 42, 0.6)", 22);
      timeSprite.position.set(x, mapKmToY(440) - 1.2, 0);
      scene.add(timeSprite);
    }

    // 9. Live Scanning Red Laser Time Curtain
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const currentX = mapTimeToX(currentMin);

    const laserCurtainGeo = new THREE.PlaneGeometry(0.08, 18);
    const laserCurtainMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const laserCurtain = new THREE.Mesh(laserCurtainGeo, laserCurtainMat);
    laserCurtain.position.set(currentX, 0, 0);
    laserCurtain.scale.set(1, 1, 7.5);
    laserCurtain.rotation.y = Math.PI / 2;
    scene.add(laserCurtain);

    const liveBadge = createTextSprite("🔴 LIVE TIME SCAN", "#ef4444", "rgba(69, 10, 10, 0.8)", 22);
    liveBadge.position.set(currentX, mapKmToY(0) + 1.2, 0);
    scene.add(liveBadge);

    // 10. Volumetric 3D Containment Force-Fields (Maintenance Blocks)
    const blocksToRender = blocks && blocks.length > 0 ? blocks : [
      {
        id: "MEGA-BLK-01",
        block_code: "BLK-GZB-TDL-01",
        title: "Joint Bundled Block: BCM Ballast Cleaning + OHE Isolation",
        start_km: 110,
        end_km: 145,
        duration_minutes: 135,
        line: "UP",
        status: "APPROVED",
        is_joint_bundle: true,
        primary_department: "ENG",
        bundled_departments: "ENG,S&T,TRD",
        time_window_start: new Date(Date.now() + 3600000).toISOString(),
        time_window_end: new Date(Date.now() + 11700000).toISOString(),
      } as any,
    ];

    blocksToRender.forEach((block) => {
      let startMin = 600;
      let endMin = startMin + (block.duration_minutes || 120);
      if (block.time_window_start) {
        const dt = new Date(block.time_window_start);
        if (!isNaN(dt.getTime())) {
          startMin = dt.getHours() * 60 + dt.getMinutes();
          endMin = startMin + block.duration_minutes;
        }
      }

      const x1 = mapTimeToX(startMin);
      const x2 = mapTimeToX(endMin);
      const y1 = mapKmToY(block.start_km);
      const y2 = mapKmToY(block.end_km || block.start_km + 12);
      const z = mapLineToZ(block.line || "UP");

      const width = Math.max(1.2, Math.abs(x2 - x1));
      const height = Math.max(0.8, Math.abs(y2 - y1));
      const depth = 2.0;

      const posX = (x1 + x2) / 2;
      const posY = (y1 + y2) / 2;
      const posZ = z;

      const isJoint = block.is_joint_bundle || (block.bundled_departments && block.bundled_departments.includes(","));
      const forceFieldColor = isJoint ? 0x6366f1 : 0x10b981;

      // 3D Holographic Force-Field Glass Prism
      const boxGeo = new THREE.BoxGeometry(width, height, depth);
      const boxMat = new THREE.MeshStandardMaterial({
        color: forceFieldColor,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.8,
        emissive: forceFieldColor,
        emissiveIntensity: 0.45,
      });
      const prism = new THREE.Mesh(boxGeo, boxMat);
      prism.position.set(posX, posY, posZ);
      scene.add(prism);

      // Pulsing Neon Force-Field Edges
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({
          color: isJoint ? 0xa5b4fc : 0x6ee7b7,
          linewidth: 2.5,
        })
      );
      edges.position.set(posX, posY, posZ);
      scene.add(edges);

      // Floating Hologram Badge
      const blockBadge = createTextSprite(
        `⚡ ${isJoint ? "MEGA BUNDLE" : block.primary_department} (${block.duration_minutes}m)`,
        isJoint ? "#c7d2fe" : "#a7f3d0",
        "rgba(30, 27, 75, 0.85)",
        20
      );
      blockBadge.position.set(posX, posY, posZ + depth / 2 + 0.5);
      scene.add(blockBadge);

      interactiveMeshesRef.current.push({ mesh: prism, data: block, type: "BLOCK" });
    });

    // 11. 3D Glowing Laser Trajectories & Animated Train Pods
    activeTrajectories.forEach((train, trainIdx) => {
      const pts = train.points;
      if (!pts || pts.length < 2) return;

      const z = mapLineToZ(train.direction);
      const v3Points = pts.map((p) => new THREE.Vector3(mapTimeToX(p.minute), mapKmToY(p.km), z));

      // Build 3D Smooth Curve
      const curve = new THREE.CatmullRomCurve3(v3Points, false, "catmullrom", 0.05);

      // Dual-Layer Glowing Laser Ribbon:
      // Inner High-Intensity Core
      const coreGeo = new THREE.TubeGeometry(curve, 128, 0.05, 8, false);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const coreTube = new THREE.Mesh(coreGeo, coreMat);
      scene.add(coreTube);

      // Outer Translucent Glowing Sheath
      const trainColor = new THREE.Color(train.color || (train.direction === "UP" ? 0x00f0ff : 0xff007f));
      const sheathGeo = new THREE.TubeGeometry(curve, 128, 0.14, 12, false);
      const sheathMat = new THREE.MeshStandardMaterial({
        color: trainColor,
        emissive: trainColor,
        emissiveIntensity: showConflictsOnly ? 0.3 : 1.4,
        roughness: 0.2,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85,
      });
      const sheathTube = new THREE.Mesh(sheathGeo, sheathMat);
      scene.add(sheathTube);

      // Moving Futuristic Aerodynamic Train Pod
      const podGroup = new THREE.Group();
      const podGeo = new THREE.ConeGeometry(0.3, 0.8, 16);
      const podMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: trainColor,
        emissiveIntensity: 2.0,
      });
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.rotation.z = -Math.PI / 2;
      podGroup.add(pod);

      // Headlight Point Beam
      const headLight = new THREE.PointLight(trainColor, 1.8, 8);
      podGroup.add(headLight);

      scene.add(podGroup);
      movingTrainMeshesRef.current.push({
        mesh: podGroup,
        curve,
        speed: 0.06 + (train.weight / 10) * 0.04,
        offset: trainIdx * 0.15,
      });

      // Futuristic Train HUD Label
      const labelSprite = createTextSprite(
        `[${train.train_id}] ${train.name.split(" ")[0]}`,
        train.color || "#38bdf8",
        "rgba(3, 7, 18, 0.8)",
        20
      );
      labelSprite.position.set(v3Points[0].x + 0.8, v3Points[0].y + (train.direction === "DN" ? -0.5 : 0.5), z);
      scene.add(labelSprite);

      interactiveMeshesRef.current.push({ mesh: sheathTube, data: train, type: "TRAIN" });
    });

    // 12. 3D Octahedral Conflict Beacons
    conflicts.forEach((conf, idx) => {
      const cx = mapTimeToX(480 + idx * 55);
      const cy = mapKmToY(conf.location_km || 126);
      const cz = 0;

      const confGeo = new THREE.OctahedronGeometry(0.5);
      const confMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 1.5,
        wireframe: true,
      });
      const confMesh = new THREE.Mesh(confGeo, confMat);
      confMesh.position.set(cx, cy, cz);
      scene.add(confMesh);

      interactiveMeshesRef.current.push({ mesh: confMesh, data: conf, type: "CONFLICT" });
    });

    // 13. High-Performance Render Loop & Real-Time Physics
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Cinematic Auto-Rotation Turntable
      if (autoRotate) {
        cameraAngleRef.current.theta += 0.003;
        updateCameraPosition();
      }

      // Animate starfield drift
      starfield.rotation.y = elapsed * 0.015;

      // Animate pulse on beacons
      primaryBeacon.intensity = 2.0 + Math.sin(elapsed * 3) * 0.8;
      secondaryBeacon.intensity = 1.8 + Math.cos(elapsed * 2.5) * 0.6;

      // Move trains along their 3D curved trajectories
      movingTrainMeshesRef.current.forEach((item) => {
        const progress = (elapsed * item.speed + item.offset) % 1.0;
        const currentPos = item.curve.getPointAt(progress);
        const tangent = item.curve.getTangentAt(progress);

        item.mesh.position.copy(currentPos);
        item.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
      });

      renderer.render(scene, camera);
    };
    animate();

    // 14. Responsive Window Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 15. Raycasting Interactive Hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const targets = interactiveMeshesRef.current.map((item) => item.mesh);
      const intersects = raycaster.intersectObjects(targets);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const matched = interactiveMeshesRef.current.find((item) => item.mesh === hit);
        if (matched) {
          if (matched.type === "TRAIN") {
            setHoveredTrain(matched.data);
            setHoveredBlock(null);
            setHoveredConflict(null);
          } else if (matched.type === "BLOCK") {
            setHoveredBlock(matched.data);
            setHoveredTrain(null);
            setHoveredConflict(null);
          } else if (matched.type === "CONFLICT") {
            setHoveredConflict(matched.data);
            setHoveredTrain(null);
            setHoveredBlock(null);
          }
        }
      } else {
        setHoveredTrain(null);
        setHoveredBlock(null);
        setHoveredConflict(null);
      }
    };

    container.addEventListener("mousemove", handleMouseMove);

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      renderer.dispose();
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [activeTrajectories, blocks, conflicts, selectedDirection, showConflictsOnly, autoRotate]);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const target = cameraTargetRef.current;

    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);
  };

  // Mouse Orbit Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      isDraggingRef.current = true;
    } else if (e.button === 2) {
      isPanningRef.current = true;
    }
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - prevMousePosRef.current.x;
    const dy = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current) {
      cameraAngleRef.current.theta -= dx * 0.007;
      cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.007));
      updateCameraPosition();
    } else if (isPanningRef.current) {
      cameraTargetRef.current.x -= dx * 0.02;
      cameraTargetRef.current.y += dy * 0.02;
      updateCameraPosition();
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraAngleRef.current.radius = Math.max(12, Math.min(65, cameraAngleRef.current.radius + e.deltaY * 0.035));
    updateCameraPosition();
  };

  // Presets
  const setPresetView = (view: "ISO" | "TOP" | "TRACK") => {
    setCameraView(view);
    cameraTargetRef.current.set(0, 0, 0);
    if (view === "ISO") {
      cameraAngleRef.current = { theta: 0.65, phi: 1.05, radius: 36 };
    } else if (view === "TOP") {
      cameraAngleRef.current = { theta: 0, phi: 0.01, radius: 34 };
    } else if (view === "TRACK") {
      cameraAngleRef.current = { theta: 0, phi: Math.PI / 2.2, radius: 28 };
    }
    updateCameraPosition();
  };

  return (
    <div className="relative w-full h-[580px] rounded-xl overflow-hidden bg-gray-950 border border-cyan-950 shadow-2xl">
      {/* 3D WebGL Canvas Mount */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Top Futuristic Command Header */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        <div className="flex items-center gap-2 pointer-events-auto bg-gray-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-cyan-500/30 text-xs shadow-[0_0_15px_rgba(0,240,255,0.15)]">
          <Rotate3d className="h-4 w-4 text-cyan-400" />
          <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
          <span className="font-mono font-bold text-white tracking-wider">HOLOGRAPHIC TIME-SPACE MATRIX</span>
          <Badge variant="outline" className="text-[10px] bg-cyan-950/80 border-cyan-500/50 text-cyan-300 font-mono">
            LIVE 3D VOLUMETRIC
          </Badge>
        </div>

        {/* Camera Preset Toolbar */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-gray-950/90 backdrop-blur-md p-1 rounded-lg border border-gray-800 text-xs shadow-lg">
          <button
            onClick={() => setPresetView("ISO")}
            className={`px-3 py-1 rounded font-mono text-[11px] font-bold transition-all ${
              cameraView === "ISO"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/50"
                : "text-gray-400 hover:text-white"
            }`}
          >
            📐 ISOMETRIC 3D
          </button>
          <button
            onClick={() => setPresetView("TOP")}
            className={`px-3 py-1 rounded font-mono text-[11px] font-bold transition-all ${
              cameraView === "TOP"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🛰️ TOP-DOWN 2D
          </button>
          <button
            onClick={() => setPresetView("TRACK")}
            className={`px-3 py-1 rounded font-mono text-[11px] font-bold transition-all ${
              cameraView === "TRACK"
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🚆 CORRIDOR EYE
          </button>
          <div className="h-4 w-[1px] bg-gray-700 mx-1" />
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 rounded font-mono text-[11px] flex items-center gap-1.5 transition-all ${
              autoRotate ? "bg-amber-500 text-black font-bold shadow-md shadow-amber-900/50" : "text-gray-400 hover:text-white"
            }`}
            title="Toggle Holographic Turntable Auto-Rotation"
          >
            {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>TURNTABLE</span>
          </button>
        </div>
      </div>

      {/* Bottom Floating Cyber HUD Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10 text-[11px] font-mono">
        <div className="flex items-center gap-3 bg-gray-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-gray-800 text-gray-300">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]"></span> UP LINE (+3.2Z)
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shadow-[0_0_8px_#ff007f]"></span> DN LINE (-3.2Z)
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-indigo-500 shadow-[0_0_8px_#6366f1]"></span> 3D POSSESSION PRISMS
          </span>
          <span className="text-cyan-400/80 text-[10px] ml-2">
            [Left Drag: Orbit • Right Drag: Pan • Scroll: Zoom]
          </span>
        </div>

        <div className="bg-gray-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-800 text-cyan-400 font-bold flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          <span>{activeTrajectories.length} TRAINS SIMULATED</span>
        </div>
      </div>

      {/* Futuristic Floating HUD for Hovered Train */}
      {hoveredTrain && (
        <div className="absolute top-16 right-4 p-3.5 rounded-xl border border-cyan-500/50 bg-gray-950/95 backdrop-blur-xl shadow-[0_0_25px_rgba(0,240,255,0.2)] text-xs space-y-1.5 z-20 min-w-[240px] pointer-events-auto">
          <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
            <span className="font-bold text-white flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hoveredTrain.color }}></span>
              {hoveredTrain.train_id} {hoveredTrain.name}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-cyan-500 text-cyan-300">
              PRIORITY: {hoveredTrain.weight}/10
            </Badge>
          </div>
          <div className="text-gray-300 text-[11px] flex justify-between">
            <span className="text-gray-400">Direction Track:</span>
            <strong className="text-cyan-300">{hoveredTrain.direction === "DN" ? "DN Line (GZB➔CNB)" : "UP Line (CNB➔GZB)"}</strong>
          </div>
          <div className="text-gray-300 text-[11px] flex justify-between">
            <span className="text-gray-400">Entry / Exit:</span>
            <span className="font-mono text-white">
              {hoveredTrain.points[0]?.time_str} ➔ {hoveredTrain.points[hoveredTrain.points.length - 1]?.time_str}
            </span>
          </div>
          <div className="text-emerald-400 text-[10px] font-mono flex items-center gap-1 pt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            SPEED: 130 km/h • TRACK POSSESSION CLEARED
          </div>
        </div>
      )}

      {/* Futuristic Floating HUD for Hovered Block Prism */}
      {hoveredBlock && (
        <div className="absolute top-16 left-4 p-3.5 rounded-xl border border-indigo-500/50 bg-gray-950/95 backdrop-blur-xl shadow-[0_0_25px_rgba(99,102,241,0.2)] text-xs space-y-2 z-20 min-w-[260px] pointer-events-auto">
          <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
            <span className="font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
              <ShieldAlert className="h-4 w-4 text-indigo-400" />
              {hoveredBlock.block_code}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold">
              {hoveredBlock.status}
            </Badge>
          </div>
          <p className="text-white font-semibold text-[11px] leading-tight">{hoveredBlock.title}</p>
          <div className="text-gray-300 text-[11px] flex justify-between">
            <span className="text-gray-400">Territory:</span>
            <strong className="text-white font-mono">Km {hoveredBlock.start_km} - {hoveredBlock.end_km}</strong>
          </div>
          <div className="text-gray-300 text-[11px] flex justify-between">
            <span className="text-gray-400">Possession Window:</span>
            <strong className="text-emerald-400 font-mono">{hoveredBlock.duration_minutes} Minutes</strong>
          </div>
          {onOpenGrantModal && (
            <Button
              size="sm"
              className="w-full mt-1.5 text-[11px] h-7 bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-1 shadow-lg shadow-indigo-950"
              onClick={() => onOpenGrantModal(hoveredBlock)}
            >
              <Eye className="h-3 w-3" />
              Inspect Possession Hologram
            </Button>
          )}
        </div>
      )}

      {/* Floating Conflict HUD */}
      {hoveredConflict && (
        <div className="absolute bottom-16 right-4 p-3.5 rounded-xl border border-red-500/50 bg-red-950/95 backdrop-blur-xl shadow-[0_0_25px_rgba(239,68,68,0.3)] text-xs space-y-1.5 z-20 max-w-[290px]">
          <div className="flex items-center space-x-2 text-red-300 font-bold">
            <AlertTriangle className="h-4 w-4 text-red-400 animate-pulse" />
            <span className="tracking-wide uppercase font-mono">{hoveredConflict.title}</span>
          </div>
          <p className="text-gray-200 text-[11px] leading-relaxed">{hoveredConflict.message}</p>
          <p className="text-amber-300 text-[10px] font-mono border-t border-red-800/80 pt-1">
            G&SR Action: {hoveredConflict.recommended_action}
          </p>
        </div>
      )}
    </div>
  );
};
