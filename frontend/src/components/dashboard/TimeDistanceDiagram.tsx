import React, { useState, useMemo } from "react";
import { TrainTrajectory, MaintenanceBlock, ConflictItem } from "@/types/railway";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Train, AlertTriangle, ShieldAlert, Rotate3d, Layers } from "lucide-react";
import { Marey3DView } from "./Marey3DView";

interface TimeDistanceDiagramProps {
  trajectories: TrainTrajectory[];
  blocks: MaintenanceBlock[];
  conflicts: ConflictItem[];
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

export const TimeDistanceDiagram: React.FC<TimeDistanceDiagramProps> = ({
  trajectories,
  blocks,
  conflicts,
  onOpenGrantModal,
}) => {
  const [viewMode, setViewMode] = useState<"3D" | "2D">("3D");
  const [selectedDirection, setSelectedDirection] = useState<"ALL" | "DN" | "UP">("ALL");
  const [hoveredTrain, setHoveredTrain] = useState<TrainTrajectory | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<MaintenanceBlock | null>(null);
  const [hoveredConflict, setHoveredConflict] = useState<ConflictItem | null>(null);
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);

  // Dimensions
  const SVG_WIDTH = 1050;
  const SVG_HEIGHT = 460;
  const PADDING_LEFT = 75;
  const PADDING_RIGHT = 30;
  const PADDING_TOP = 25;
  const PADDING_BOTTOM = 40;

  const PLOT_WIDTH = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const PLOT_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  // Scales
  // X: 0 to 1440 minutes (24 hours)
  const scaleX = (minute: number) => PADDING_LEFT + (Math.max(0, Math.min(1440, minute)) / 1440) * PLOT_WIDTH;
  // Y: 0 to 440 km (GZB to CNB)
  const scaleY = (km: number) => PADDING_TOP + (Math.max(0, Math.min(440, km)) / 440) * PLOT_HEIGHT;

  // Filter trajectories by direction
  const filteredTrajectories = useMemo(() => {
    if (selectedDirection === "ALL") return trajectories;
    return trajectories.filter((t) => t.direction === selectedDirection);
  }, [trajectories, selectedDirection]);

  // Current time minute for vertical indicator
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();

  return (
    <Card className="border-gray-800 bg-gray-950 text-white shadow-xl">
      <CardHeader className="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CardTitle className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <Train className="h-5 w-5 text-cyan-400" />
              Trajectory String Chart • Marey Distance-Time Dynamic Matrix
            </CardTitle>
            <Badge variant="outline" className="bg-cyan-950/60 border-cyan-700 text-cyan-300 text-[10px] font-mono">
              {viewMode === "3D" ? "3D VOLUMETRIC HOLOGRAPHIC" : "2D CLASSICAL STRING CHART"}
            </Badge>
          </div>
          <CardDescription className="text-xs text-gray-400 mt-0.5">
            {viewMode === "3D"
              ? "Volumetric 3D space-time: Time (X: 00:00-24:00), Distance (Y: 0-440 Km), Track Line Depth (Z: UP vs DOWN). Blocks rendered as 3D possession prisms."
              : "2D space-time trajectories: Distance (Y: 0-440 Km) vs Time (X: 00:00-24:00). Shaded rectangles indicate track possession exclusion zones."}
          </CardDescription>
        </div>

        {/* Controls, View Toggle & Direction Toggles */}
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {/* 2D vs 3D Mode Toggle */}
          <div className="flex items-center rounded-lg bg-gray-900 border border-gray-800 p-0.5 text-xs shadow-inner">
            <button
              onClick={() => setViewMode("3D")}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-all ${
                viewMode === "3D"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Rotate3d className="h-3.5 w-3.5 text-cyan-200" />
              <span>3D Holographic</span>
            </button>
            <button
              onClick={() => setViewMode("2D")}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-all ${
                viewMode === "2D" ? "bg-gray-800 text-white font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-gray-400" />
              <span>2D Classic</span>
            </button>
          </div>

          <div className="flex items-center rounded-lg bg-gray-900 border border-gray-800 p-0.5 text-xs">
            <button
              onClick={() => setSelectedDirection("ALL")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                selectedDirection === "ALL" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              All Lines
            </button>
            <button
              onClick={() => setSelectedDirection("DN")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                selectedDirection === "DN" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              DN (GZB➔CNB)
            </button>
            <button
              onClick={() => setSelectedDirection("UP")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                selectedDirection === "UP" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              UP (CNB➔GZB)
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowConflictsOnly(!showConflictsOnly)}
            className={`text-xs h-7 border-amber-800 ${
              showConflictsOnly ? "bg-amber-950 text-amber-300" : "text-gray-400"
            }`}
          >
            <AlertTriangle className="h-3 w-3 mr-1 text-amber-400" />
            {showConflictsOnly ? "Showing Conflicts" : "Highlight Conflicts"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 relative overflow-x-auto">
        {viewMode === "3D" ? (
          <Marey3DView
            trajectories={trajectories}
            blocks={blocks}
            conflicts={conflicts}
            selectedDirection={selectedDirection}
            showConflictsOnly={showConflictsOnly}
            onOpenGrantModal={onOpenGrantModal}
          />
        ) : (
          /* 2D SVG Drawing Canvas */
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full h-auto min-w-[850px] font-sans select-none"
          >
            {/* Background Grid */}
            <rect
              x={PADDING_LEFT}
              y={PADDING_TOP}
              width={PLOT_WIDTH}
              height={PLOT_HEIGHT}
            fill="#030712"
            stroke="#1f2937"
            strokeWidth="1"
          />

          {/* Horizontal Station Grid Lines */}
          {STATIONS.map((stn) => {
            const y = scaleY(stn.km);
            return (
              <g key={stn.code}>
                <line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={SVG_WIDTH - PADDING_RIGHT}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray={stn.code === "GZB" || stn.code === "CNB" ? "none" : "2,2"}
                />
                <text
                  x={PADDING_LEFT - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-gray-400 text-[10px] font-mono font-medium"
                >
                  {stn.code} ({stn.km}k)
                </text>
              </g>
            );
          })}

          {/* Vertical Hourly Time Grid Lines */}
          {Array.from({ length: 13 }, (_, i) => i * 2).map((hour) => {
            const min = hour * 60;
            const x = scaleX(min);
            const timeStr = `${hour.toString().padStart(2, "0")}:00`;
            return (
              <g key={hour}>
                <line
                  x1={x}
                  y1={PADDING_TOP}
                  x2={x}
                  y2={SVG_HEIGHT - PADDING_BOTTOM}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray={hour % 6 === 0 ? "none" : "3,3"}
                />
                <text
                  x={x}
                  y={SVG_HEIGHT - PADDING_BOTTOM + 16}
                  textAnchor="middle"
                  className="fill-gray-400 text-[10px] font-mono"
                >
                  {timeStr}
                </text>
              </g>
            );
          })}

          {/* Current Time Indicator Line */}
          {currentMinute >= 0 && currentMinute <= 1440 && (
            <g>
              <line
                x1={scaleX(currentMinute)}
                y1={PADDING_TOP}
                x2={scaleX(currentMinute)}
                y2={SVG_HEIGHT - PADDING_BOTTOM}
                stroke="#ef4444"
                strokeWidth="1.5"
                strokeDasharray="4,3"
              />
              <circle cx={scaleX(currentMinute)} cy={PADDING_TOP} r="3" fill="#ef4444" />
              <text
                x={scaleX(currentMinute)}
                y={PADDING_TOP - 6}
                textAnchor="middle"
                className="fill-red-400 text-[9px] font-mono font-bold"
              >
                LIVE NOW
              </text>
            </g>
          )}

          {/* 1. Shaded Maintenance Blocks (Rectangular Exclusion Zones) */}
          {blocks.map((block) => {
            // Compute start & end minutes from time_window or defaults
            let startMin = 600;
            let endMin = startMin + (block.duration_minutes || 120);

            if (block.time_window_start) {
              const dt = new Date(block.time_window_start);
              if (!isNaN(dt.getTime())) {
                startMin = dt.getHours() * 60 + dt.getMinutes();
                endMin = startMin + block.duration_minutes;
              }
            }

            const bx1 = scaleX(startMin);
            const bx2 = scaleX(endMin);
            const by1 = scaleY(block.start_km);
            const by2 = scaleY(block.end_km || block.start_km + 10);

            const bWidth = Math.max(12, bx2 - bx1);
            const bHeight = Math.max(10, Math.abs(by2 - by1));
            const bY = Math.min(by1, by2);

            const isJoint = block.is_joint_bundle || (block.bundled_departments && block.bundled_departments.includes(","));
            const fillColor = isJoint ? "rgba(99, 102, 241, 0.25)" : "rgba(16, 185, 129, 0.20)";
            const strokeColor = isJoint ? "#6366f1" : "#10b981";

            return (
              <g
                key={block.id}
                onMouseEnter={() => setHoveredBlock(block)}
                onMouseLeave={() => setHoveredBlock(null)}
                className="cursor-pointer transition-opacity"
              >
                <rect
                  x={bx1}
                  y={bY}
                  width={bWidth}
                  height={bHeight}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  strokeDasharray={block.status === "APPROVED" ? "none" : "3,2"}
                  rx="3"
                />
                <text
                  x={bx1 + 4}
                  y={bY + 12}
                  className="fill-cyan-200 text-[9px] font-mono font-bold pointer-events-none"
                >
                  {isJoint ? "★ MEGA BUNDLE" : block.primary_department}
                </text>
                <text
                  x={bx1 + 4}
                  y={bY + 22}
                  className="fill-gray-300 text-[8px] font-mono pointer-events-none"
                >
                  {block.duration_minutes}m
                </text>
              </g>
            );
          })}

          {/* 2. Scheduled Train Trajectories (Diagonal Space-Time Lines) */}
          {filteredTrajectories.map((train) => {
            const isHovered = hoveredTrain?.train_id === train.train_id;
            const pts = train.points;
            if (pts.length < 2) return null;

            // Build path d attribute
            let pathD = `M ${scaleX(pts[0].minute)} ${scaleY(pts[0].km)}`;
            for (let i = 1; i < pts.length; i++) {
              pathD += ` L ${scaleX(pts[i].minute)} ${scaleY(pts[i].km)}`;
            }

            return (
              <g
                key={train.train_id}
                onMouseEnter={() => setHoveredTrain(train)}
                onMouseLeave={() => setHoveredTrain(null)}
                className="cursor-pointer group"
              >
                {/* Thick Invisible Line for easy mouse hover */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                />
                {/* Visible Trajectory Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={train.color || "#06b6d4"}
                  strokeWidth={isHovered ? "3.5" : "1.8"}
                  strokeOpacity={isHovered ? 1.0 : 0.85}
                  className="transition-all duration-150"
                />
                {/* Train Markers at Origin & Destination */}
                <circle
                  cx={scaleX(pts[0].minute)}
                  cy={scaleY(pts[0].km)}
                  r={isHovered ? 4 : 2.5}
                  fill={train.color}
                />
                <circle
                  cx={scaleX(pts[pts.length - 1].minute)}
                  cy={scaleY(pts[pts.length - 1].km)}
                  r={isHovered ? 4 : 2.5}
                  fill={train.color}
                />
                {/* Label near departure */}
                <text
                  x={scaleX(pts[0].minute) + 4}
                  y={scaleY(pts[0].km) + (train.direction === "DN" ? -4 : 10)}
                  className={`text-[8px] font-mono font-bold ${
                    isHovered ? "fill-white" : "fill-gray-400"
                  }`}
                >
                  {train.train_id}
                </text>
              </g>
            );
          })}

          {/* 3. Conflict Intersection Markers */}
          {conflicts.map((conf, idx) => {
            const cx = scaleX(500 + idx * 40); // Approximate position
            const cy = scaleY(conf.location_km || 126);

            return (
              <g
                key={conf.id}
                onMouseEnter={() => setHoveredConflict(conf)}
                onMouseLeave={() => setHoveredConflict(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r="7"
                  fill="#ef4444"
                  fillOpacity="0.3"
                  className="animate-ping"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill="#ef4444"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </svg>
        )}

        {/* Floating Tooltips */}
        {hoveredTrain && (
          <div className="absolute top-6 right-6 p-3 rounded-lg border border-cyan-800 bg-gray-900/95 backdrop-blur-md shadow-2xl text-xs space-y-1 z-20 min-w-[200px]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hoveredTrain.color }}></span>
                {hoveredTrain.train_id} {hoveredTrain.name}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-cyan-700 text-cyan-300">
                Priority: {hoveredTrain.weight}/10
              </Badge>
            </div>
            <div className="text-gray-400 text-[11px]">
              Direction: <strong className="text-gray-200">{hoveredTrain.direction === "DN" ? "Down Line (GZB➔CNB)" : "Up Line (CNB➔GZB)"}</strong>
            </div>
            <div className="text-gray-400 text-[11px]">
              Entry: <span className="font-mono text-cyan-300">{hoveredTrain.points[0]?.time_str}</span> • Exit: <span className="font-mono text-cyan-300">{hoveredTrain.points[hoveredTrain.points.length - 1]?.time_str}</span>
            </div>
          </div>
        )}

        {hoveredBlock && (
          <div className="absolute top-6 left-24 p-3 rounded-lg border border-indigo-800 bg-gray-900/95 backdrop-blur-md shadow-2xl text-xs space-y-1.5 z-20 min-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-300 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-400" />
                {hoveredBlock.block_code}
              </span>
              <Badge variant="outline" className="text-[10px] font-mono bg-indigo-950/60 border-indigo-700 text-indigo-300">
                {hoveredBlock.status}
              </Badge>
            </div>
            <p className="text-white font-medium text-[11px]">{hoveredBlock.title}</p>
            <div className="text-gray-400 text-[11px] flex justify-between">
              <span>Span: <strong className="text-gray-200">{hoveredBlock.start_km} - {hoveredBlock.end_km} Km</strong></span>
              <span>Window: <strong className="text-emerald-400">{hoveredBlock.duration_minutes} mins</strong></span>
            </div>
            {hoveredBlock.predicted_duration_mins && (
              <div className="text-[10px] text-cyan-300 font-mono">
                ML Predicted Duration: {hoveredBlock.predicted_duration_mins}m
              </div>
            )}
            {onOpenGrantModal && (
              <Button
                size="sm"
                className="w-full mt-1 text-[10px] h-6 bg-indigo-600 hover:bg-indigo-500 text-white"
                onClick={() => onOpenGrantModal(hoveredBlock)}
              >
                Inspect Block Details
              </Button>
            )}
          </div>
        )}

        {hoveredConflict && (
          <div className="absolute bottom-12 right-8 p-3 rounded-lg border border-red-800 bg-red-950/95 backdrop-blur-md shadow-2xl text-xs space-y-1 z-20 max-w-[280px]">
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
      </CardContent>
    </Card>
  );
};
