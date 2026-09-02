import React from "react";
import { MaintenanceBlock } from "@/types/railway";
import { Calendar, CheckCircle2, Layers, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface GanttTimelineProps {
  blocks: MaintenanceBlock[];
  onOpenGrantModal: (block: MaintenanceBlock) => void;
  onRunOptimizer: () => void;
  isOptimizing: boolean;
}

// Scheduled Trains on the Corridor for Timetable Timeline Reference
const SCHEDULED_TIMETABLE = [
  { no: "22436", name: "Vande Bharat Express", startHour: 6.75, endHour: 8.33, color: "bg-cyan-500/80 text-black border-cyan-400" },
  { no: "12004", name: "Swarna Shatabdi", startHour: 8.75, endHour: 10.5, color: "bg-blue-500/80 text-white border-blue-400" },
  // 10:30 to 12:45 is natural maintenance window!
  { no: "12398", name: "Mahabodhi Exp", startHour: 12.75, endHour: 14.58, color: "bg-indigo-500/80 text-white border-indigo-400" },
  { no: "12424", name: "Dibrugarh Rajdhani", startHour: 16.5, endHour: 18.0, color: "bg-amber-500/80 text-black border-amber-400" },
  { no: "12302", name: "Howrah Rajdhani", startHour: 18.25, endHour: 19.75, color: "bg-amber-500/80 text-black border-amber-400" },
  { no: "12560", name: "Shiv Ganga Exp", startHour: 20.5, endHour: 22.25, color: "bg-blue-500/80 text-white border-blue-400" },
];

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  blocks,
  onOpenGrantModal,
  onRunOptimizer,
  isOptimizing,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            AI Block Optimizer & Timetable Bundling Timeline (Gantt View)
          </h3>
          <p className="text-xs text-gray-400">
            Google OR-Tools CP-SAT constraint solver maps multi-department shadow blocks into natural train timetable gaps.
          </p>
        </div>

        <Button
          onClick={onRunOptimizer}
          disabled={isOptimizing}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isOptimizing ? "Computing Optimal Windows..." : "Re-Calculate Shadow Blocks"}
        </Button>
      </div>

      {/* 24-Hour Timetable Grid */}
      <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 overflow-x-auto min-w-[800px]">
        {/* Hour Header */}
        <div className="grid grid-cols-24 border-b border-gray-800 pb-2 mb-3 text-[10px] font-mono text-gray-500">
          {hours.map((h) => (
            <div key={h} className="text-center">
              {h.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Row 1: COA Train Timetable Paths */}
        <div className="relative h-10 mb-4 bg-gray-900/40 rounded border border-gray-800/80 flex items-center">
          <span className="absolute left-2 text-[10px] font-bold text-gray-400 z-10">
            TRAIN TIMETABLE (COA)
          </span>

          {SCHEDULED_TIMETABLE.map((train) => {
            const left = (train.startHour / 24) * 100;
            const width = ((train.endHour - train.startHour) / 24) * 100;

            return (
              <div
                key={train.no}
                className={`absolute h-7 rounded border text-[10px] font-bold flex items-center justify-center px-1 truncate shadow ${train.color}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`${train.no} - ${train.name}`}
              >
                {train.no}
              </div>
            );
          })}
        </div>

        {/* Row 2: Bundled Maintenance Blocks (Samanvay-AI Shadow Windows) */}
        <div className="relative h-14 bg-gray-900/60 rounded border border-gray-800 flex items-center">
          <span className="absolute left-2 text-[10px] font-bold text-emerald-400 z-10 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            JOINT BUNDLED BLOCKS
          </span>

          {blocks.map((block) => {
            // Compute startHour and duration from time_window_start and end
            const startDt = new Date(block.time_window_start);
            const startHour = startDt.getHours() + startDt.getMinutes() / 60;
            const durationHours = block.duration_minutes / 60;
            const left = (startHour / 24) * 100;
            const width = Math.max(4, (durationHours / 24) * 100);

            const isApproved = block.status === "APPROVED" || block.status === "IN_PROGRESS";

            return (
              <div
                key={block.id}
                onClick={() => onOpenGrantModal(block)}
                className={`absolute h-10 rounded-lg border cursor-pointer p-1.5 flex flex-col justify-between shadow-lg transition-all hover:scale-105 ${
                  isApproved
                    ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
                    : "bg-indigo-950/80 border-dashed border-indigo-400 text-indigo-200"
                }`}
                style={{ left: `${left}%`, width: `${width}%` }}
              >
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="truncate">{block.block_code}</span>
                  <Badge variant={isApproved ? "success" : "secondary"} className="text-[8px] px-1 py-0">
                    {block.status}
                  </Badge>
                </div>
                <div className="text-[9px] text-gray-300 truncate">
                  Bundled: {block.bundled_departments} ({block.duration_minutes}m)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Planned Bundled Blocks Cards */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="p-3.5 rounded-lg border border-gray-800 bg-gray-950 flex items-center justify-between gap-3 text-xs"
          >
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>{block.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {block.block_code}
                </Badge>
              </div>
              <div className="text-gray-400 mt-1 flex flex-wrap gap-2 text-[11px]">
                <span>Possession: <strong className="text-white">Km {block.start_km} - {block.end_km}</strong></span>
                <span>•</span>
                <span>Window: <strong className="text-emerald-400">{block.duration_minutes} min</strong></span>
                <span>•</span>
                <span>Depts: <strong className="text-cyan-300">{block.bundled_departments}</strong></span>
              </div>
              {block.private_number && (
                <div className="mt-1 text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Granted Private No: {block.private_number}
                </div>
              )}
            </div>

            {block.status === "PENDING" && (
              <Button
                onClick={() => onOpenGrantModal(block)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs whitespace-nowrap"
              >
                Grant PTW
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
