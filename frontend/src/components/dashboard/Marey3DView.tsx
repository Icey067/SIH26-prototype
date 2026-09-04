import React, { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { TrainTrajectory, MaintenanceBlock, ConflictItem } from "@/types/railway";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rotate3d, Play, Pause, ShieldAlert, AlertTriangle } from "lucide-react";

interface Marey3DViewProps {
  trajectories: TrainTrajectory[];
  blocks: MaintenanceBlock[];
  conflicts: ConflictItem[];
  selectedDirection: "ALL" | "DN" | "UP";
  showConflictsOnly: boolean;
  onOpenGrantModal?: (block: MaintenanceBlock) => void;
}

const STATIONS = [
  { code: "GZB", name: "Ghaziabad", km: 0 },
  { code: "ALJN", name: "Aligarh Jn", km: 126 },
  { code: "TDL", name: "Tundla Jn", km: 204 },
  { code: "ETW", name: "Etawah Jn", km: 296 },
  { code: "PHD", name: "Phaphund", km: 352 },
  { code: "CNB", name: "Kanpur Central", km: 440 },
];

export const Marey3DView: React.FC<Marey3DViewProps> = ({
  trajectories,
  blocks,
  conflicts,
  selectedDirection,
  showConflictsOnly,
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
  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 34 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const interactiveMeshesRef = useRef<{ mesh: THREE.Object3D; data: any; type: "TRAIN" | "BLOCK" | "CONFLICT" }[]>([]);

  // Coordinate transforms
  // Time (minutes 0 to 1440) -> X [-16, +16]
  const mapTimeToX = (min: number) => (Math.max(0, Math.min(1440, min)) / 1440 - 0.5) * 32;
  // Distance (km 0 to 440) -> Y [+8, -8]
  const mapKmToY = (km: number) => (0.5 - Math.max(0, Math.min(440, km)) / 440) * 16;
  // Line Direction -> Z
  const mapLineToZ = (dir: string) => (dir === "UP" ? 2.5 : dir === "DN" ? -2.5 : 0);

  // Filter trajectories
  const filteredTrajectories = useMemo(() => {
    if (selectedDirection === "ALL") return trajectories;
    return trajectories.filter((t) => t.direction === selectedDirection);
  }, [trajectories, selectedDirection]);

  // Create text sprite helper for station and time labels
  const createTextSprite = (text: string, color: string = "#94a3b8", fontSize: number = 28) => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.Object3D();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${fontSize}px "SF Pro Display", -apple-system, monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(3.5, 0.9, 1);
    return sprite;
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x030712, 0.015);

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
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(20, 30, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.8);
    dirLight2.position.set(-20, -10, -20);
    scene.add(dirLight2);

    // 5. Grid Infrastructure
    interactiveMeshesRef.current = [];

    // Track Plane Ribbons (Transparent holographic floors for UP and DN lines)
    const floorGeo = new THREE.PlaneGeometry(32, 16);
    const upFloorMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
    });
    const upFloor = new THREE.Mesh(floorGeo, upFloorMat);
    upFloor.position.set(0, 0, 2.5);
    scene.add(upFloor);

    const dnFloorMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
    });
    const dnFloor = new THREE.Mesh(floorGeo, dnFloorMat);
    dnFloor.position.set(0, 0, -2.5);
    scene.add(dnFloor);

    // Track Guideline Edges
    const trackLineMat = new THREE.LineDashedMaterial({
      color: 0x334155,
      dashSize: 0.8,
      gapSize: 0.4,
      transparent: true,
      opacity: 0.5,
    });

    [-2.5, 2.5].forEach((z) => {
      const linePts = [
        new THREE.Vector3(-16, mapKmToY(0), z),
        new THREE.Vector3(16, mapKmToY(0), z),
        new THREE.Vector3(16, mapKmToY(440), z),
        new THREE.Vector3(-16, mapKmToY(440), z),
        new THREE.Vector3(-16, mapKmToY(0), z),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const trackOutline = new THREE.Line(lineGeo, trackLineMat);
      trackOutline.computeLineDistances();
      scene.add(trackOutline);
    });

    // Station Slabs and Labels
    STATIONS.forEach((stn) => {
      const y = mapKmToY(stn.km);

      [-2.5, 2.5].forEach((z) => {
        const stationLineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-16, y, z),
          new THREE.Vector3(16, y, z),
        ]);
        const stationLineMat = new THREE.LineBasicMaterial({
          color: stn.code === "GZB" || stn.code === "CNB" ? 0x06b6d4 : 0x1e293b,
          transparent: true,
          opacity: 0.8,
        });
        scene.add(new THREE.Line(stationLineGeo, stationLineMat));
      });

      const sprite = createTextSprite(`${stn.code} (${stn.km}k)`, "#38bdf8", 26);
      sprite.position.set(-17.5, y, 0);
      scene.add(sprite);
    });

    // Time Ticks (Every 2 hours: 00:00, 02:00, ... 24:00)
    for (let hour = 0; hour <= 24; hour += 2) {
      const x = mapTimeToX(hour * 60);
      const timeStr = `${hour.toString().padStart(2, "0")}:00`;

      [-2.5, 2.5].forEach((z) => {
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

      const timeSprite = createTextSprite(timeStr, "#94a3b8", 22);
      timeSprite.position.set(x, mapKmToY(440) - 1.0, 0);
      scene.add(timeSprite);
    }

    // Current Time "Red Laser Curtain"
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const currentX = mapTimeToX(currentMin);

    const curtainGeo = new THREE.PlaneGeometry(0.1, 16);
    const curtainMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const curtain = new THREE.Mesh(curtainGeo, curtainMat);
    curtain.position.set(currentX, 0, 0);
    curtain.scale.set(1, 1, 6);
    curtain.rotation.y = Math.PI / 2;
    scene.add(curtain);

    const liveBadge = createTextSprite("🔴 LIVE NOW", "#ef4444", 24);
    liveBadge.position.set(currentX, mapKmToY(0) + 1.2, 0);
    scene.add(liveBadge);

    // 6. Volumetric 3D Maintenance Blocks (Possession Prisms)
    blocks.forEach((block) => {
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
      const y2 = mapKmToY(block.end_km || block.start_km + 10);
      const z = mapLineToZ(block.line);

      const width = Math.max(0.6, Math.abs(x2 - x1));
      const height = Math.max(0.4, Math.abs(y2 - y1));
      const depth = 1.4;

      const posX = (x1 + x2) / 2;
      const posY = (y1 + y2) / 2;
      const posZ = z;

      const isJoint = block.is_joint_bundle || (block.bundled_departments && block.bundled_departments.includes(","));
      const blockColor = isJoint ? 0x6366f1 : 0x10b981;

      // 3D Glass Prism
      const boxGeo = new THREE.BoxGeometry(width, height, depth);
      const boxMat = new THREE.MeshStandardMaterial({
        color: blockColor,
        transparent: true,
        opacity: 0.45,
        roughness: 0.2,
        metalness: 0.5,
        emissive: blockColor,
        emissiveIntensity: 0.25,
      });
      const prism = new THREE.Mesh(boxGeo, boxMat);
      prism.position.set(posX, posY, posZ);
      scene.add(prism);

      // Neon Wireframe Outlines
      const wireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({ color: isJoint ? 0x818cf8 : 0x34d399, linewidth: 2 })
      );
      wireframe.position.set(posX, posY, posZ);
      scene.add(wireframe);

      // Block Label
      const label = createTextSprite(
        `${isJoint ? "★ JOINT" : block.primary_department} (${block.duration_minutes}m)`,
        isJoint ? "#a5b4fc" : "#6ee7b7",
        20
      );
      label.position.set(posX, posY, posZ + depth / 2 + 0.4);
      scene.add(label);

      interactiveMeshesRef.current.push({ mesh: prism, data: block, type: "BLOCK" });
    });

    // 7. 3D Train Trajectories (Illuminated 3D Laser Tubes)
    filteredTrajectories.forEach((train) => {
      const pts = train.points;
      if (pts.length < 2) return;

      const z = mapLineToZ(train.direction);
      const v3Points = pts.map((p) => new THREE.Vector3(mapTimeToX(p.minute), mapKmToY(p.km), z));

      // Build 3D Curve
      const curve = new THREE.CatmullRomCurve3(v3Points, false, "catmullrom", 0.1);
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.08, 8, false);

      const trainColor = new THREE.Color(train.color || (train.direction === "UP" ? 0x06b6d4 : 0xf43f5e));
      const tubeMat = new THREE.MeshStandardMaterial({
        color: trainColor,
        emissive: trainColor,
        emissiveIntensity: showConflictsOnly ? 0.3 : 0.8,
        roughness: 0.3,
        metalness: 0.7,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tube);

      // Train Head Pulsing Orb
      const headPos = v3Points[v3Points.length - 1];
      const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
      const headMat = new THREE.MeshBasicMaterial({ color: trainColor });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.copy(headPos);
      scene.add(head);

      // Train Number Badge
      const trainBadge = createTextSprite(`${train.train_id}`, "#ffffff", 20);
      trainBadge.position.set(v3Points[0].x + 0.6, v3Points[0].y + (train.direction === "DN" ? -0.4 : 0.4), z);
      scene.add(trainBadge);

      interactiveMeshesRef.current.push({ mesh: tube, data: train, type: "TRAIN" });
    });

    // 7.5 3D Conflict Danger Nodes
    conflicts.forEach((conf, idx) => {
      const cx = mapTimeToX(480 + idx * 55);
      const cy = mapKmToY(conf.location_km || 126);
      const cz = 0;

      const confGeo = new THREE.OctahedronGeometry(0.35);
      const confMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.9,
      });
      const confMesh = new THREE.Mesh(confGeo, confMat);
      confMesh.position.set(cx, cy, cz);
      scene.add(confMesh);

      interactiveMeshesRef.current.push({ mesh: confMesh, data: conf, type: "CONFLICT" });
    });

    // 8. Animation & Render Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (autoRotate) {
        cameraAngleRef.current.theta += 0.004;
        updateCameraPosition();
      }

      const elapsed = clock.getElapsedTime();
      // Pulsing effect on live lights
      dirLight1.intensity = 1.0 + Math.sin(elapsed * 2) * 0.2;

      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 10. Raycasting / Hover Detection
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
  }, [filteredTrajectories, blocks, conflicts, selectedDirection, showConflictsOnly, autoRotate]);

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
      cameraAngleRef.current.theta -= dx * 0.008;
      cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.008));
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
    cameraAngleRef.current.radius = Math.max(10, Math.min(60, cameraAngleRef.current.radius + e.deltaY * 0.03));
    updateCameraPosition();
  };

  // Presets
  const setPresetView = (view: "ISO" | "TOP" | "TRACK") => {
    setCameraView(view);
    cameraTargetRef.current.set(0, 0, 0);
    if (view === "ISO") {
      cameraAngleRef.current = { theta: Math.PI / 4, phi: Math.PI / 3.2, radius: 34 };
    } else if (view === "TOP") {
      cameraAngleRef.current = { theta: 0, phi: 0.01, radius: 32 };
    } else if (view === "TRACK") {
      cameraAngleRef.current = { theta: 0, phi: Math.PI / 2.3, radius: 26 };
    }
    updateCameraPosition();
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden bg-gray-950 border border-gray-800">
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

      {/* Top 3D Control Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        <div className="flex items-center gap-2 pointer-events-auto bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-800 text-xs shadow-lg">
          <Rotate3d className="h-4 w-4 text-cyan-400" />
          <span className="font-bold text-white">3D Space-Time Matrix</span>
          <Badge variant="outline" className="text-[10px] bg-cyan-950/60 border-cyan-800 text-cyan-300 font-mono">
            WEBGL VOLUMETRIC
          </Badge>
        </div>

        {/* Camera Preset Actions */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-gray-900/90 backdrop-blur-md p-1 rounded-lg border border-gray-800 text-xs shadow-lg">
          <button
            onClick={() => setPresetView("ISO")}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              cameraView === "ISO" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            📐 Isometric 3D
          </button>
          <button
            onClick={() => setPresetView("TOP")}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              cameraView === "TOP" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            🛰️ Top-Down 2D
          </button>
          <button
            onClick={() => setPresetView("TRACK")}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              cameraView === "TRACK" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            🚆 Corridor Eye
          </button>
          <div className="h-4 w-[1px] bg-gray-700 mx-1" />
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded text-xs flex items-center gap-1 ${
              autoRotate ? "bg-amber-600 text-black font-bold" : "text-gray-400 hover:text-white"
            }`}
            title="Toggle Holographic Turntable Auto-Rotation"
          >
            {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>Turntable</span>
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend & Navigation Tips */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 pointer-events-none z-10 text-[11px] text-gray-400 bg-gray-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-800">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-cyan-400"></span> UP Line Track (+Z)
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500"></span> DN Line Track (-Z)
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-indigo-500"></span> Possession Prisms
        </span>
        <span className="text-gray-500 text-[10px] ml-2 font-mono">
          [Left Click: Orbit | Right Click: Pan | Scroll: Zoom]
        </span>
      </div>

      {/* Floating 3D Tooltip for Hovered Train */}
      {hoveredTrain && (
        <div className="absolute top-14 right-4 p-3 rounded-lg border border-cyan-700 bg-gray-900/95 backdrop-blur-md shadow-2xl text-xs space-y-1 z-20 min-w-[220px]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hoveredTrain.color }}></span>
              {hoveredTrain.train_id} {hoveredTrain.name}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-cyan-600 text-cyan-300">
              Priority: {hoveredTrain.weight}/10
            </Badge>
          </div>
          <div className="text-gray-400 text-[11px]">
            Direction: <strong className="text-cyan-200">{hoveredTrain.direction === "DN" ? "DN Line (GZB➔CNB)" : "UP Line (CNB➔GZB)"}</strong>
          </div>
          <div className="text-gray-400 text-[11px]">
            Entry: <span className="font-mono text-cyan-300">{hoveredTrain.points[0]?.time_str}</span> • Exit:{" "}
            <span className="font-mono text-cyan-300">{hoveredTrain.points[hoveredTrain.points.length - 1]?.time_str}</span>
          </div>
        </div>
      )}

      {/* Floating 3D Tooltip for Hovered Block Prism */}
      {hoveredBlock && (
        <div className="absolute top-14 left-4 p-3 rounded-lg border border-indigo-700 bg-gray-900/95 backdrop-blur-md shadow-2xl text-xs space-y-1.5 z-20 min-w-[240px]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-300 flex items-center gap-1">
              <ShieldAlert className="h-4 w-4 text-indigo-400" />
              {hoveredBlock.block_code}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono bg-indigo-950/60 border-indigo-700 text-indigo-300">
              {hoveredBlock.status}
            </Badge>
          </div>
          <p className="text-white font-medium text-[11px]">{hoveredBlock.title}</p>
          <div className="text-gray-400 text-[11px] flex justify-between">
            <span>Span: <strong className="text-gray-200">Km {hoveredBlock.start_km} - {hoveredBlock.end_km}</strong></span>
            <span>Duration: <strong className="text-emerald-400">{hoveredBlock.duration_minutes}m</strong></span>
          </div>
          {onOpenGrantModal && (
            <Button
              size="sm"
              className="w-full mt-1 text-[10px] h-6 bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={() => onOpenGrantModal(hoveredBlock)}
            >
              Inspect Possession Prism
            </Button>
          )}
        </div>
      )}

      {/* Floating 3D Tooltip for Hovered Conflict Node */}
      {hoveredConflict && (
        <div className="absolute bottom-14 right-4 p-3 rounded-lg border border-red-700 bg-red-950/95 backdrop-blur-md shadow-2xl text-xs space-y-1 z-20 max-w-[280px]">
          <div className="flex items-center space-x-1.5 text-red-300 font-bold">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span>{hoveredConflict.title}</span>
          </div>
          <p className="text-gray-300 text-[11px]">{hoveredConflict.message}</p>
          <p className="text-amber-300 text-[10px] font-mono">
            Action: {hoveredConflict.recommended_action}
          </p>
        </div>
      )}
    </div>
  );
};
