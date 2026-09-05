import React, { useState, useEffect, useRef, useMemo } from "react";
import { TrainTelemetry, MaintenanceBlock, ConflictItem } from "@/types/railway";
import {
  Train,
  Clock,
  MapPin,
  Activity,
  Radio,
  Layers,
} from "lucide-react";

interface Enhanced2DViewProps {
  trains?: TrainTelemetry[];
  blocks?: MaintenanceBlock[];
  conflicts?: ConflictItem[];
  currentTime: string;
  activeScenario: "NONE" | "CP_SAT" | "REROUTE" | "SPEED_RESTRICTION";
  conflictZoneResolved: boolean;
  highlightConflicts: boolean;
  selectedDirection: "ALL" | "DN" | "UP";
  onTriggerSolver: () => void;
  onTriggerReroute: () => void;
  onTriggerSpeedSim: () => void;
  onSelectTrain?: (train: TrainTelemetry) => void;
}

interface StationInfo {
  code: string;
  name: string;
  km: number;
  y: number; // SVG Y position
}

const STATIONS: StationInfo[] = [
  { code: "GZB", name: "Ghaziabad Jn", km: 0, y: 35 },
  { code: "DER", name: "Dadri", km: 37, y: 64 },
  { code: "ALJN", name: "Aligarh Jn", km: 106, y: 117 },
  { code: "HRS", name: "Hathras Jn", km: 156, y: 156 },
  { code: "TDL", name: "Tundla Jn", km: 205, y: 194 },
  { code: "SKB", name: "Shikohabad", km: 240, y: 221 },
  { code: "ETW", name: "Etawah Jn", km: 297, y: 265 },
  { code: "PHD", name: "Phaphund", km: 352, y: 308 },
  { code: "RURA", name: "Rura", km: 394, y: 340 },
  { code: "CNB", name: "Kanpur Central", km: 440, y: 375 },
];

// Time slots from 00:00 to 12:00
const TIME_SLOTS = [
  { label: "00:00", minute: 0, x: 110 },
  { label: "02:00", minute: 120, x: 245 },
  { label: "04:00", minute: 240, x: 380 },
  { label: "06:00", minute: 360, x: 515 },
  { label: "08:00", minute: 480, x: 650 },
  { label: "10:00", minute: 600, x: 785 },
  { label: "12:00", minute: 720, x: 920 },
];

export const Enhanced2DView: React.FC<Enhanced2DViewProps> = ({
  trains: _trains = [],
  blocks: _blocks = [],
  conflicts: _conflicts = [],
  currentTime,
  activeScenario,
  conflictZoneResolved,
  highlightConflicts,
  selectedDirection = "ALL",
  onTriggerSolver,
  onTriggerReroute,
  onTriggerSpeedSim,
}) => {
  // Sub-view toggle: Marey Space-Time vs Synoptic Track Schematic
  const [subView, setSubView] = useState<"MAREY" | "SCHEMATIC">("MAREY");
  const [selectedTrainId, setSelectedTrainId] = useState<string | null>("12424");
  const [hoveredTrainId, setHoveredTrainId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; timeStr: string; kmStr: string } | null>(null);
  const [isLiveRunning, setIsLiveRunning] = useState<boolean>(true);
  const [animClock, setAnimClock] = useState<number>(0);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Smooth animation clock for continuous train gliding
  useEffect(() => {
    if (!isLiveRunning) return;
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      setAnimClock((prev) => (prev + dt * 0.08) % 1);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLiveRunning]);

  // Handle mouse move over SVG to produce laser crosshairs
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 960;
    const svgY = ((e.clientY - rect.top) / rect.height) * 420;

    // Convert SVG X (110 - 920) to Time (00:00 - 12:00)
    const clampedX = Math.max(110, Math.min(920, svgX));
    const totalMinutes = ((clampedX - 110) / (920 - 110)) * 720;
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    const timeStr = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")} IST`;

    // Convert SVG Y (35 - 375) to Distance (0 - 440 km)
    const clampedY = Math.max(35, Math.min(375, svgY));
    const km = Math.round(((clampedY - 35) / (375 - 35)) * 440);
    
    // Find nearest station
    const nearest = STATIONS.reduce((prev, curr) =>
      Math.abs(curr.km - km) < Math.abs(prev.km - km) ? curr : prev
    );
    const kmStr = `Km ${km} (${nearest.code} ±${Math.abs(km - nearest.km)}km)`;

    setHoverPos({ x: svgX, y: svgY, timeStr, kmStr });
  };

  const handleMouseLeave = () => {
    setHoverPos(null);
  };

  // Helper to interpolate position along polyline
  const interpolatePath = (points: [number, number][], progress: number) => {
    if (points.length === 0) return { x: 0, y: 0 };
    if (points.length === 1) return { x: points[0][0], y: points[0][1] };

    // Calculate total length
    let totalLength = 0;
    const segLengths: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1][0] - points[i][0];
      const dy = points[i + 1][1] - points[i][1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      segLengths.push(dist);
      totalLength += dist;
    }

    const targetDist = (progress % 1) * totalLength;
    let accumulated = 0;

    for (let i = 0; i < segLengths.length; i++) {
      if (accumulated + segLengths[i] >= targetDist) {
        const segProgress = (targetDist - accumulated) / segLengths[i];
        const x = points[i][0] + (points[i + 1][0] - points[i][0]) * segProgress;
        const y = points[i][1] + (points[i + 1][1] - points[i][1]) * segProgress;
        return { x, y };
      }
      accumulated += segLengths[i];
    }
    const last = points[points.length - 1];
    return { x: last[0], y: last[1] };
  };

  // Define train trajectories coordinates
  // 1. Train 12424 Dibrugarh Rajdhani
  const rajdhaniPoints: [number, number][] = useMemo(() => {
    if (activeScenario === "REROUTE") {
      return [
        [194, 35],
        [305, 117],
        [370, 165],
        [430, 225],
        [480, 265],
        [545, 375],
      ];
    }
    if (activeScenario === "SPEED_RESTRICTION") {
      return [
        [194, 35],
        [305, 117],
        [370, 165],
        [450, 245],
        [500, 265],
        [565, 375],
      ];
    }
    return [
      [194, 35],
      [305, 117],
      [398, 194],
      [470, 265],
      [550, 375],
    ];
  }, [activeScenario]);

  // 2. Train 12004 Shatabdi Express
  const shatabdiPoints: [number, number][] = [
    [515, 35],
    [600, 117],
    [680, 194],
    [750, 265],
    [825, 375],
  ];

  // 3. Train 22436 Vande Bharat Express (DN Line - moving Kanpur to Ghaziabad)
  const vandeBharatPoints: [number, number][] = [
    [245, 375],
    [320, 265],
    [415, 194],
    [485, 117],
    [545, 35],
  ];

  // 4. Train 12301 Howrah Rajdhani (DN Line)
  const howrahRajPoints: [number, number][] = [
    [590, 375],
    [665, 265],
    [750, 194],
    [830, 117],
    [895, 35],
  ];

  // 5. Freight BCNHL-640 (Slow goods)
  const freightPoints: [number, number][] = [
    [130, 35],
    [290, 117],
    [490, 194],
    [700, 265],
    [900, 375],
  ];

  // Live interpolated positions
  const rajHead = interpolatePath(rajdhaniPoints, (animClock + 0.35) % 1);
  const shatabdiHead = interpolatePath(shatabdiPoints, (animClock + 0.7) % 1);
  const vbHead = interpolatePath(vandeBharatPoints, (animClock + 0.15) % 1);
  const howrahHead = interpolatePath(howrahRajPoints, (animClock + 0.5) % 1);
  const freightHead = interpolatePath(freightPoints, (animClock * 0.5 + 0.2) % 1);

  // Active highlighted train info
  const selectedTrainData = useMemo(() => {
    if (selectedTrainId === "12424") {
      return {
        id: "12424",
        name: "Dibrugarh Rajdhani Express",
        type: "Premium Superfast",
        route: "NDLS ➔ DBRG (UP Main)",
        speed: activeScenario === "SPEED_RESTRICTION" ? "30 km/h (TSR Restriced)" : "130 km/h",
        loco: "WAP-7 #30412 (Ghaziabad Shed)",
        kavachStatus: "ACTIVE • SIL-4 HEADWAY LOCKED",
        color: activeScenario === "REROUTE" ? "#10b981" : activeScenario === "SPEED_RESTRICTION" ? "#f59e0b" : "#00f0ff",
        status: conflictZoneResolved
          ? "SAFE RUNNING • 0 CONFLICTS"
          : "HEADWAY CONFLICT C-04 AT TDL OUTER (km 194)",
      };
    }
    if (selectedTrainId === "22436") {
      return {
        id: "22436",
        name: "Vande Bharat Express",
        type: "Semi-High Speed 16-Car Trainset",
        route: "BSB ➔ NDLS (DN Fast)",
        speed: "130 km/h",
        loco: "Self-Propelled EMU (Train 18)",
        kavachStatus: "ACTIVE • FULL CAB SIGNALING",
        color: "#ffb95f",
        status: "ON-TIME • NOMINAL HEADWAY",
      };
    }
    if (selectedTrainId === "12004") {
      return {
        id: "12004",
        name: "Lucknow Shatabdi Express",
        type: "Intercity High Priority",
        route: "NDLS ➔ LKO (UP Line)",
        speed: "120 km/h",
        loco: "WAP-7 #30255",
        kavachStatus: "ACTIVE • DYNAMIC BRAKE CURVE",
        color: "#38bdf8",
        status: "RUNNING 4m ADVANCE OF SCHEDULE",
      };
    }
    return {
      id: "BCNHL-640",
      name: "BCNHL Industrial Freight Goods",
      type: "Heavy Haul 58-Wagon Coal/Steel",
      route: "DER ➔ MGS (Loop Bypass)",
      speed: "55 km/h",
      loco: "WAG-9 Twin Consist",
      kavachStatus: "TRACKING • RADIO TELEMETRY",
      color: "#94a3b8",
      status: "REGULATED FOR EXPRESS PRECEDENCE",
    };
  }, [selectedTrainId, activeScenario, conflictZoneResolved]);

  return (
    <div className="relative w-full rounded-xl bg-surface-container-lowest overflow-hidden border border-surface-container-high shadow-2xl flex flex-col">
      {/* ─── TOP TACTICAL CONTROL BAR ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-surface-container border-b border-surface-container-high select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-lowest border border-primary/30">
            <Radio className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="font-mono text-[11px] font-bold text-on-surface tracking-wider">
              2D DISPATCH VISUALIZER
            </span>
          </div>

          {/* Sub-mode Switcher: Marey Space-Time vs Synoptic Track Radar */}
          <div className="flex rounded-lg bg-surface-container-lowest p-0.5 border border-surface-container-high">
            <button
              onClick={() => setSubView("MAREY")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-[10px] font-bold transition-all cursor-pointer ${
                subView === "MAREY"
                  ? "bg-primary text-on-primary shadow-[0_0_10px_rgba(76,215,246,0.3)]"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Activity className="h-3 w-3" />
              <span>MAREY SPACE-TIME (TRAJECTORIES)</span>
            </button>
            <button
              onClick={() => setSubView("SCHEMATIC")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-[10px] font-bold transition-all cursor-pointer ${
                subView === "SCHEMATIC"
                  ? "bg-primary text-on-primary shadow-[0_0_10px_rgba(76,215,246,0.3)]"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Layers className="h-3 w-3" />
              <span>SYNOPTIC TRACK RADAR (PHYSICAL TRACKS)</span>
            </button>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-low border border-surface-container-high font-mono text-[10px]">
            <span className="text-on-surface-variant">LINE:</span>
            <span className="text-secondary font-bold">{selectedDirection}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-low border border-surface-container-high font-mono text-[10px]">
            <Clock className="h-3 w-3 text-secondary" />
            <span className="text-on-surface-variant">CORRIDOR CLOCK:</span>
            <span className="text-primary font-bold">{currentTime.slice(0, 5)} IST</span>
          </div>

          <button
            onClick={() => setIsLiveRunning(!isLiveRunning)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-all border cursor-pointer ${
              isLiveRunning
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isLiveRunning ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
            <span>{isLiveRunning ? "LIVE MOTION ACTIVE" : "MOTION PAUSED"}</span>
          </button>
        </div>
      </div>

      {/* ─── VIEW A: ENHANCED MAREY SPACE-TIME DIAGRAM ────────────────────── */}
      {subView === "MAREY" ? (
        <div className="relative flex flex-col w-full">
          {/* Time Header Grid Coordinates */}
          <div className="grid grid-cols-7 pl-28 pr-10 py-1.5 bg-surface-container-low text-on-surface-variant font-mono text-[10px] font-semibold border-b border-surface-container-high tracking-wider">
            {TIME_SLOTS.map((t, idx) => (
              <div key={t.label} className={idx === TIME_SLOTS.length - 1 ? "text-right" : ""}>
                {t.label}
              </div>
            ))}
          </div>

          <div className="relative flex w-full h-[430px]">
            {/* Left Y-Axis Station Track Elevation Rail */}
            <div className="w-28 flex flex-col justify-between py-3 px-2.5 bg-surface-container-low font-mono text-[11px] text-on-surface-variant select-none border-r border-surface-container-high z-10">
              {STATIONS.map((stn) => (
                <div key={stn.code} className="flex flex-col group cursor-default">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-bold transition-colors ${
                        stn.code === "GZB" || stn.code === "CNB"
                          ? "text-primary"
                          : stn.code === "TDL"
                          ? "text-amber-400"
                          : "text-on-surface"
                      }`}
                    >
                      {stn.code}
                    </span>
                    <span className="text-[9px] text-outline font-mono">{stn.km}km</span>
                  </div>
                  <span className="text-[8px] text-outline truncate">{stn.name}</span>
                </div>
              ))}
            </div>

            {/* Interactive SVG Canvas */}
            <div className="relative flex-1 h-full bg-surface-container-lowest overflow-hidden">
              <svg
                ref={svgRef}
                className="w-full h-full cursor-crosshair select-none"
                viewBox="0 0 960 420"
                preserveAspectRatio="none"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  {/* Cyberpunk Neon Glow Filters */}
                  <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#00f0ff" floodOpacity="0.8" />
                    <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#00f0ff" floodOpacity="0.3" />
                  </filter>
                  <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#10b981" floodOpacity="0.8" />
                    <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#10b981" floodOpacity="0.3" />
                  </filter>
                  <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#f59e0b" floodOpacity="0.8" />
                    <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#f59e0b" floodOpacity="0.3" />
                  </filter>
                  <filter id="glow-conflict" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ff4d4f" floodOpacity="0.9" />
                  </filter>

                  {/* Grid Pattern with 15-minute sub-divisions */}
                  <pattern id="marey-subgrid" width="67.5" height="34" patternUnits="userSpaceOnUse">
                    <rect width="67.5" height="34" fill="none" />
                    <line x1="67.5" y1="0" x2="67.5" y2="34" stroke="#161922" strokeWidth="0.8" />
                    <line x1="0" y1="34" x2="67.5" y2="34" stroke="#161922" strokeWidth="0.8" strokeDasharray="1 3" />
                  </pattern>

                  {/* Shading pattern for Bundled Maintenance Block */}
                  <pattern id="possession-stripe-2" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="10" stroke="#f59e0b" strokeWidth="2.5" opacity="0.55" />
                  </pattern>
                  <pattern id="possession-stripe-green" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="10" stroke="#10b981" strokeWidth="2.5" opacity="0.55" />
                  </pattern>

                  <radialGradient id="conflict-pulse" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff4d4f" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#cf1322" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ff4d4f" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Background Grid Layer */}
                <rect x="110" y="20" width="810" height="370" fill="url(#marey-subgrid)" />

                {/* Major Time Meridian Vertical Lines (every 2 hours) */}
                {TIME_SLOTS.map((t) => (
                  <line key={`vert-${t.minute}`} x1={t.x} y1="20" x2={t.x} y2="390" stroke="#222736" strokeWidth="1.2" />
                ))}

                {/* Station Horizontal Track Lines with Station Tick Marks */}
                {STATIONS.map((stn) => (
                  <g key={`track-line-${stn.code}`}>
                    <line
                      x1="110"
                      y1={stn.y}
                      x2="920"
                      y2={stn.y}
                      stroke={stn.code === "GZB" || stn.code === "CNB" ? "#3b82f6" : "#262b3d"}
                      strokeWidth={stn.code === "GZB" || stn.code === "CNB" ? "1.5" : "1"}
                    />
                    <circle cx="110" cy={stn.y} r="2.5" fill="#4cd7f6" />
                  </g>
                ))}

                {/* BUNDLED POSSESSION BLOCK: Block A-14 (ALJN-TDL km 112-140, Time 02:30 to 05:00) */}
                <g id="block-a14" className="cursor-pointer">
                  <rect x="278" y="122" width="170" height="42" rx="3" fill="url(#possession-stripe-2)" />
                  <rect x="278" y="122" width="170" height="42" rx="3" fill="#f59e0b" fillOpacity="0.12" stroke="#f59e0b" strokeWidth="1.5" />
                  <rect x="282" y="126" width="162" height="15" rx="2" fill="#1e1302" fillOpacity="0.85" />
                  <text x="286" y="137" fill="#fbbf24" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700">
                    BLOCK A-14: TMS+TDMS BUNDLED
                  </text>
                  <text x="286" y="156" fill="#fde68a" fontFamily="JetBrains Mono" fontSize="8">
                    02:30 - 05:00 | BCM DEEP SCREEN + OHE
                  </text>
                </g>

                {/* BUNDLED POSSESSION BLOCK 2: Block B-09 (TDL Outer km 205-218, Time 07:30 to 09:45) */}
                <g id="block-b09" className="cursor-pointer">
                  <rect x="618" y="190" width="152" height="34" rx="3" fill="url(#possession-stripe-green)" />
                  <rect x="618" y="190" width="152" height="34" rx="3" fill="#10b981" fillOpacity="0.1" stroke="#10b981" strokeWidth="1.5" />
                  <rect x="622" y="194" width="144" height="14" rx="2" fill="#021c14" fillOpacity="0.85" />
                  <text x="626" y="204" fill="#34d399" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700">
                    BLOCK B-09: POINT MACHINE
                  </text>
                  <text x="626" y="218" fill="#a7f3d0" fontFamily="JetBrains Mono" fontSize="8">
                    07:30 - 09:45 | TDL INTERLOCK
                  </text>
                </g>

                {/* CONFLICT ZONE C-04: TMS Rail Renewal clashing with Rajdhani */}
                {highlightConflicts && (
                  <g className="cursor-pointer" id="conflict-zone-04" onClick={onTriggerSolver}>
                    {conflictZoneResolved ? (
                      activeScenario === "REROUTE" ? (
                        <>
                          <rect x="370" y="160" width="95" height="42" fill="#022c22" fillOpacity="0.9" stroke="#10b981" strokeWidth="1.5" rx="4" />
                          <text x="417" y="177" fill="#34d399" fontSize="8.5" fontFamily="JetBrains Mono" fontWeight="700" textAnchor="middle">3RD LINE DIVERSION</text>
                          <text x="417" y="192" fill="#10b981" fontSize="7.5" fontFamily="JetBrains Mono" textAnchor="middle">+3m NET HEADWAY</text>
                        </>
                      ) : activeScenario === "SPEED_RESTRICTION" ? (
                        <>
                          <rect x="370" y="160" width="95" height="42" fill="#451a03" fillOpacity="0.9" stroke="#f59e0b" strokeWidth="1.5" rx="4" />
                          <text x="417" y="177" fill="#fbbf24" fontSize="8.5" fontFamily="JetBrains Mono" fontWeight="700" textAnchor="middle">TSR 30 KM/H ORDER</text>
                          <text x="417" y="192" fill="#f59e0b" fontSize="7.5" fontFamily="JetBrains Mono" textAnchor="middle">SAFE APPROACH</text>
                        </>
                      ) : (
                        <>
                          <rect x="380" y="170" width="75" height="38" fill="#005236" fillOpacity="0.85" stroke="#4edea3" strokeWidth="1.5" rx="4" />
                          <text x="417" y="193" fill="#4edea3" fontSize="9" fontFamily="JetBrains Mono" fontWeight="700" textAnchor="middle">CP-SAT RESOLVED</text>
                        </>
                      )
                    ) : (
                      <>
                        <rect x="375" y="168" width="80" height="42" rx="4" fill="#93000a" fillOpacity="0.3" stroke="#ff4d4f" strokeWidth="1.5" strokeDasharray="3 2" />
                        <circle cx="415" cy="189" r="20" fill="url(#conflict-pulse)" filter="url(#glow-conflict)" />
                        <circle cx="415" cy="189" r="6" fill="#ff4d4f" />
                        <text x="415" y="205" fill="#ff7875" fontSize="7.5" fontFamily="JetBrains Mono" fontWeight="700" textAnchor="middle">CLASH C-04</text>
                      </>
                    )}
                  </g>
                )}

                {/* ─── TRAIN TRAJECTORY STRINGS ───────────────────────────── */}
                {/* 1. Train 12424 Dibrugarh Rajdhani Express (UP Main) */}
                <g
                  onClick={() => setSelectedTrainId("12424")}
                  onMouseEnter={() => setHoveredTrainId("12424")}
                  onMouseLeave={() => setHoveredTrainId(null)}
                  className="cursor-pointer"
                  opacity={hoveredTrainId && hoveredTrainId !== "12424" ? 0.45 : 1}
                >
                  {activeScenario === "REROUTE" ? (
                    <>
                      <polyline
                        points={rajdhaniPoints.map((p) => p.join(",")).join(" ")}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={selectedTrainId === "12424" ? "4.5" : "3.5"}
                        filter="url(#glow-emerald)"
                        strokeLinecap="round"
                      />
                      {/* Diversion bypass arc dash */}
                      <line x1="370" y1="165" x2="430" y2="225" stroke="#34d399" strokeWidth="4" strokeDasharray="4 3" />
                    </>
                  ) : activeScenario === "SPEED_RESTRICTION" ? (
                    <polyline
                      points={rajdhaniPoints.map((p) => p.join(",")).join(" ")}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={selectedTrainId === "12424" ? "4.5" : "3.5"}
                      filter="url(#glow-amber)"
                      strokeLinecap="round"
                    />
                  ) : (
                    <>
                      <polyline
                        points={rajdhaniPoints.map((p) => p.join(",")).join(" ")}
                        fill="none"
                        stroke={activeScenario === "CP_SAT" ? "#00f0ff" : "#38bdf8"}
                        strokeWidth={selectedTrainId === "12424" ? "4.5" : "3.5"}
                        filter="url(#glow-cyan)"
                        strokeLinecap="round"
                      />
                      {!conflictZoneResolved && (
                        <line x1="398" y1="194" x2="570" y2="375" stroke="#ff4d4f" strokeWidth="2.5" strokeDasharray="4 3" opacity="0.8" />
                      )}
                    </>
                  )}

                  {/* Animated Moving Train Head 12424 */}
                  {isLiveRunning && (
                    <g transform={`translate(${rajHead.x}, ${rajHead.y})`}>
                      <circle r="12" fill={activeScenario === "REROUTE" ? "#10b981" : "#00f0ff"} fillOpacity="0.25" className="animate-ping" />
                      <circle r="6" fill={activeScenario === "REROUTE" ? "#10b981" : activeScenario === "SPEED_RESTRICTION" ? "#f59e0b" : "#00f0ff"} stroke="#ffffff" strokeWidth="1.5" />
                      <g transform="translate(-40, -22)">
                        <rect x="0" y="0" width="80" height="15" rx="3" fill="#021c24" stroke={activeScenario === "REROUTE" ? "#10b981" : "#00f0ff"} strokeWidth="1" />
                        <text x="40" y="11" fill="#e0f2fe" fontSize="8" fontFamily="JetBrains Mono" fontWeight="700" textAnchor="middle">
                          12424 RAJ • {activeScenario === "SPEED_RESTRICTION" ? "30k" : "130k"}
                        </text>
                      </g>
                    </g>
                  )}
                </g>

                {/* 2. Train 12004 Lucknow Shatabdi Express (UP Fast) */}
                <g
                  onClick={() => setSelectedTrainId("12004")}
                  onMouseEnter={() => setHoveredTrainId("12004")}
                  onMouseLeave={() => setHoveredTrainId(null)}
                  className="cursor-pointer"
                  opacity={hoveredTrainId && hoveredTrainId !== "12004" ? 0.45 : 1}
                >
                  <polyline
                    points={shatabdiPoints.map((p) => p.join(",")).join(" ")}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={selectedTrainId === "12004" ? "4" : "2.8"}
                    strokeLinecap="round"
                  />
                  {isLiveRunning && (
                    <g transform={`translate(${shatabdiHead.x}, ${shatabdiHead.y})`}>
                      <circle r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                      <g transform="translate(-35, -20)">
                        <rect x="0" y="0" width="70" height="14" rx="2" fill="#031828" stroke="#38bdf8" strokeWidth="1" />
                        <text x="35" y="10" fill="#bae6fd" fontSize="7.5" fontFamily="JetBrains Mono" fontWeight="700" textAnchor="middle">
                          12004 SHT • 120k
                        </text>
                      </g>
                    </g>
                  )}
                </g>

                {/* 3. Train 22436 Vande Bharat Express (DN Line - Opposing Trajectory) */}
                <g
                  onClick={() => setSelectedTrainId("22436")}
                  onMouseEnter={() => setHoveredTrainId("22436")}
                  onMouseLeave={() => setHoveredTrainId(null)}
                  className="cursor-pointer"
                  opacity={hoveredTrainId && hoveredTrainId !== "22436" ? 0.45 : 1}
                >
                  <polyline
                    points={vandeBharatPoints.map((p) => p.join(",")).join(" ")}
                    fill="none"
                    stroke="#ffb95f"
                    strokeWidth={selectedTrainId === "22436" ? "4.5" : "3"}
                    filter="url(#glow-amber)"
                    strokeLinecap="round"
                  />
                  {isLiveRunning && (
                    <g transform={`translate(${vbHead.x}, ${vbHead.y})`}>
                      <circle r="12" fill="#ffb95f" fillOpacity="0.25" className="animate-ping" />
                      <circle r="6" fill="#ffb95f" stroke="#ffffff" strokeWidth="1.5" />
                      <g transform="translate(-36, -22)">
                        <rect x="0" y="0" width="72" height="15" rx="3" fill="#2b1500" stroke="#ffb95f" strokeWidth="1" />
                        <text x="36" y="11" fill="#fed7aa" fontSize="8" fontFamily="JetBrains Mono" fontWeight="700" textAnchor="middle">
                          22436 VB • 130k
                        </text>
                      </g>
                    </g>
                  )}
                </g>

                {/* 4. Train 12301 Howrah Rajdhani Express (DN Line) */}
                <g opacity={hoveredTrainId && hoveredTrainId !== "12301" ? 0.45 : 1}>
                  <polyline
                    points={howrahRajPoints.map((p) => p.join(",")).join(" ")}
                    fill="none"
                    stroke="#93c5fd"
                    strokeWidth="2"
                    strokeDasharray="5 3"
                  />
                  {isLiveRunning && (
                    <g transform={`translate(${howrahHead.x}, ${howrahHead.y})`}>
                      <circle r="4" fill="#93c5fd" stroke="#ffffff" strokeWidth="1" />
                      <g transform="translate(-35, -18)">
                        <rect x="0" y="0" width="70" height="13" rx="2" fill="#0f172a" stroke="#93c5fd" strokeWidth="0.8" />
                        <text x="35" y="9.5" fill="#e2e8f0" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">
                          12301 HWH • 130k
                        </text>
                      </g>
                    </g>
                  )}
                </g>

                {/* 5. Freight Goods Container BCNHL-640 (Slow Freight - Shallow Angle) */}
                <g
                  onClick={() => setSelectedTrainId("BCNHL-640")}
                  onMouseEnter={() => setHoveredTrainId("BCNHL-640")}
                  onMouseLeave={() => setHoveredTrainId(null)}
                  className="cursor-pointer"
                  opacity={hoveredTrainId && hoveredTrainId !== "BCNHL-640" ? 0.45 : 1}
                >
                  <polyline
                    points={freightPoints.map((p) => p.join(",")).join(" ")}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth={selectedTrainId === "BCNHL-640" ? "3" : "2"}
                  />
                  {isLiveRunning && (
                    <g transform={`translate(${freightHead.x}, ${freightHead.y})`}>
                      <circle r="4" fill="#64748b" stroke="#ffffff" strokeWidth="1" />
                      <g transform="translate(-40, -18)">
                        <rect x="0" y="0" width="80" height="13" rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
                        <text x="40" y="9.5" fill="#cbd5e1" fontSize="7" fontFamily="JetBrains Mono" textAnchor="middle">
                          BCNHL-640 • 55k
                        </text>
                      </g>
                    </g>
                  )}
                </g>

                {/* Vertical Current Time Cursor Indicator */}
                <line x1="380" y1="20" x2="380" y2="390" stroke="#4cd7f6" strokeWidth="1.5" strokeDasharray="2 2" />
                <g transform="translate(380, 20)">
                  <polygon points="-6,-12 6,-12 0,0" fill="#4cd7f6" />
                  <rect x="-28" y="-24" width="56" height="13" rx="2" fill="#032533" stroke="#4cd7f6" strokeWidth="0.8" />
                  <text x="0" y="-14" fill="#e0f2fe" fontSize="8" fontFamily="JetBrains Mono" fontWeight="700" textAnchor="middle">
                    04:00 NOW
                  </text>
                </g>

                {/* Interactive Laser Crosshair Scrubber */}
                {hoverPos && (
                  <g pointerEvents="none">
                    {/* Vertical laser time line */}
                    <line x1={hoverPos.x} y1="20" x2={hoverPos.x} y2="390" stroke="#00f0ff" strokeWidth="1" strokeDasharray="3 3" opacity="0.75" />
                    {/* Horizontal laser km line */}
                    <line x1="110" y1={hoverPos.y} x2="920" y2={hoverPos.y} stroke="#00f0ff" strokeWidth="1" strokeDasharray="3 3" opacity="0.75" />
                    <circle cx={hoverPos.x} cy={hoverPos.y} r="4" fill="#00f0ff" />
                  </g>
                )}
              </svg>

              {/* Laser Coordinates Hover Badge */}
              {hoverPos && (
                <div
                  className="absolute pointer-events-none z-30 px-2.5 py-1.5 rounded bg-surface-container-highest/95 border border-primary/50 shadow-xl backdrop-blur-md font-mono text-[10px] text-on-surface"
                  style={{
                    left: `${Math.min(78, Math.max(15, (hoverPos.x / 960) * 100))}%`,
                    top: `${Math.min(75, Math.max(10, (hoverPos.y / 420) * 100))}%`,
                  }}
                >
                  <div className="flex items-center gap-1.5 text-primary font-bold">
                    <Clock className="h-3 w-3" />
                    <span>{hoverPos.timeStr}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-on-surface-variant text-[9px] mt-0.5">
                    <MapPin className="h-3 w-3 text-secondary" />
                    <span>{hoverPos.kmStr}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ─── VIEW B: SYNOPTIC TRACK RADAR (PHYSICAL TRACKS SCHEMATIC) ───── */
        <div className="relative flex flex-col w-full p-4 bg-surface-container-lowest min-h-[430px] justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-mono text-xs font-bold text-on-surface">
                PHYSICAL TRACK CORRIDOR SCHEMATIC (GHAZIABAD ➔ KANPUR CENTRAL • 440 KM)
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> CLEAR (130 km/h)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> CAUTION (TSR / APPROACH)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" /> OCCUPIED / RED ASPECT
              </span>
            </div>
          </div>

          {/* Linear Schematic Tracks Display */}
          <div className="relative my-4 py-8 px-6 bg-surface-container-low/70 rounded-lg border border-surface-container-high flex flex-col gap-9">
            {/* Station Mileposts Along Top */}
            <div className="relative w-full h-8 flex justify-between items-center px-4 select-none">
              {STATIONS.map((stn) => (
                <div key={stn.code} className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary/60 border border-primary mb-1" />
                  <span className="font-mono text-[10px] font-bold text-on-surface">{stn.code}</span>
                  <span className="font-mono text-[8px] text-outline">{stn.km}km</span>
                </div>
              ))}
            </div>

            {/* TRACK 01: UP MAIN LINE (Delhi ➔ Kanpur) */}
            <div className="relative w-full">
              <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant mb-1">
                <span className="text-primary font-bold">▶ TRACK 01: UP MAIN LINE (DELHI ➔ KANPUR • 130 km/h)</span>
                <span>AUTOMATIC BLOCK SIGNALING (ABS)</span>
              </div>
              <div className="relative w-full h-3 bg-surface-container-highest rounded-full border border-surface-container overflow-hidden">
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none">
                  <div className="w-full h-0.5 bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30" />
                </div>

                {/* Maintenance Block Exclusion Zone at TDL Outer */}
                <div
                  className="absolute top-0 bottom-0 left-[44%] w-[8%] bg-amber-500/30 border-x-2 border-amber-400 flex items-center justify-center cursor-pointer"
                  title="Block A-14 BCM Deep Screening"
                >
                  <span className="font-mono text-[7px] text-amber-300 font-bold tracking-tighter">BLOCK A-14</span>
                </div>

                {/* Live Train: 12424 Dibrugarh Rajdhani */}
                <div
                  className={`absolute top-0 bottom-0 transform -translate-x-1/2 flex items-center transition-all duration-300 ${
                    activeScenario === "REROUTE" ? "opacity-30" : "opacity-100"
                  }`}
                  style={{ left: `${(rajHead.y / 420) * 100}%` }}
                >
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500 text-gray-950 font-mono text-[9px] font-bold shadow-[0_0_12px_#00f0ff] animate-pulse">
                    <Train className="h-2.5 w-2.5" />
                    <span>12424 RAJ</span>
                  </div>
                </div>

                {/* Live Train: 12004 Shatabdi */}
                <div
                  className="absolute top-0 bottom-0 transform -translate-x-1/2 flex items-center"
                  style={{ left: `${(shatabdiHead.y / 420) * 100}%` }}
                >
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500 text-white font-mono text-[9px] font-bold shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                    <Train className="h-2.5 w-2.5" />
                    <span>12004 SHT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TRACK 02: DN MAIN LINE (Kanpur ➔ Delhi) */}
            <div className="relative w-full">
              <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant mb-1">
                <span className="text-secondary font-bold">◀ TRACK 02: DN MAIN LINE (KANPUR ➔ DELHI • 130 km/h)</span>
                <span>KAVACH SIL-4 INTERLOCKED</span>
              </div>
              <div className="relative w-full h-3 bg-surface-container-highest rounded-full border border-surface-container overflow-hidden">
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none">
                  <div className="w-full h-0.5 bg-gradient-to-r from-secondary/30 via-secondary/50 to-secondary/30" />
                </div>

                {/* Live Train: 22436 Vande Bharat */}
                <div
                  className="absolute top-0 bottom-0 transform -translate-x-1/2 flex items-center"
                  style={{ left: `${(vbHead.y / 420) * 100}%` }}
                >
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-gray-950 font-mono text-[9px] font-bold shadow-[0_0_12px_#f59e0b] animate-pulse">
                    <Train className="h-2.5 w-2.5" />
                    <span>22436 VB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TRACK 03: TUNDLA BYPASS / 3RD LINE LOOP */}
            <div className="relative w-full">
              <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant mb-1">
                <span className="text-emerald-400 font-bold">↔ TRACK 03: TUNDLA BYPASS & LOOP LINE (50 km/h)</span>
                <span>ACTIVE DIVERSION PATH</span>
              </div>
              <div className="relative w-full h-3 bg-surface-container-highest rounded-full border border-surface-container overflow-hidden">
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none">
                  <div className="w-full h-0.5 bg-emerald-500/30" />
                </div>

                {/* Rerouted Train: 12424 Rajdhani on Track 03 */}
                {activeScenario === "REROUTE" && (
                  <div
                    className="absolute top-0 bottom-0 transform -translate-x-1/2 flex items-center"
                    style={{ left: `${(rajHead.y / 420) * 100}%` }}
                  >
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400 text-gray-950 font-mono text-[9px] font-bold shadow-[0_0_12px_#10b981] animate-pulse">
                      <Train className="h-2.5 w-2.5" />
                      <span>12424 RAJ (3RD LINE LOOP)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── BOTTOM TELEMETRY HUD & ACTION FOOTER ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 bg-surface-container-low border-t border-surface-container-high select-none">
        {/* Selected Train Telemetry Card */}
        <div className="lg:col-span-8 flex flex-col justify-between p-2.5 rounded-lg bg-surface-container border border-surface-container-high">
          <div className="flex items-center justify-between pb-1.5 border-b border-surface-container-highest">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedTrainData.color }} />
              <span className="font-mono text-xs font-bold text-on-surface">
                TRAIN {selectedTrainData.id}: {selectedTrainData.name}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-[9px] font-mono text-on-surface-variant">
                {selectedTrainData.type}
              </span>
            </div>
            <span className="font-mono text-[10px] font-semibold text-primary">
              {selectedTrainData.kavachStatus}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 font-mono text-[10px]">
            <div>
              <span className="text-outline block text-[9px]">CORRIDOR ROUTE</span>
              <span className="text-on-surface font-semibold">{selectedTrainData.route}</span>
            </div>
            <div>
              <span className="text-outline block text-[9px]">CURRENT SPEED</span>
              <span className="font-bold" style={{ color: selectedTrainData.color }}>
                {selectedTrainData.speed}
              </span>
            </div>
            <div>
              <span className="text-outline block text-[9px]">TRACTION & CONSIST</span>
              <span className="text-on-surface truncate block">{selectedTrainData.loco}</span>
            </div>
            <div>
              <span className="text-outline block text-[9px]">HEADWAY STATUS</span>
              <span className={conflictZoneResolved ? "text-emerald-400 font-bold" : "text-amber-400 font-bold truncate block"}>
                {selectedTrainData.status}
              </span>
            </div>
          </div>
        </div>

        {/* Tactical Scenario Quick Trigger */}
        <div className="lg:col-span-4 flex flex-col justify-between p-2.5 rounded-lg bg-surface-container border border-surface-container-high">
          <span className="font-mono text-[10px] font-bold text-outline">
            CONFLICT C-04 QUICK MITIGATION:
          </span>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            <button
              onClick={onTriggerSolver}
              className={`px-1.5 py-1.5 rounded font-mono text-[9px] font-bold transition-all text-center cursor-pointer ${
                activeScenario === "CP_SAT"
                  ? "bg-primary text-on-primary shadow"
                  : "bg-surface-container-highest text-on-surface hover:bg-surface-bright"
              }`}
            >
              CP-SAT SOLVE
            </button>
            <button
              onClick={onTriggerReroute}
              className={`px-1.5 py-1.5 rounded font-mono text-[9px] font-bold transition-all text-center cursor-pointer ${
                activeScenario === "REROUTE"
                  ? "bg-emerald-500 text-gray-950 shadow"
                  : "bg-surface-container-highest text-on-surface hover:bg-surface-bright"
              }`}
            >
              3RD LINE
            </button>
            <button
              onClick={onTriggerSpeedSim}
              className={`px-1.5 py-1.5 rounded font-mono text-[9px] font-bold transition-all text-center cursor-pointer ${
                activeScenario === "SPEED_RESTRICTION"
                  ? "bg-amber-500 text-gray-950 shadow"
                  : "bg-surface-container-highest text-on-surface hover:bg-surface-bright"
              }`}
            >
              TSR 30
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
