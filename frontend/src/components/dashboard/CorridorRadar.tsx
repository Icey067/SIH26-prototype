import React from "react";
import { TrainTelemetry, MaintenanceBlock } from "@/types/railway";
import { Train, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CorridorRadarProps {
  trains: TrainTelemetry[];
  blocks: MaintenanceBlock[];
}

const STATIONS = [
  { code: "GZB", name: "Ghaziabad", km: 15.0 },
  { code: "KRJ", name: "Khurja Jn", km: 50.0 },
  { code: "ALJN", name: "Aligarh Jn", km: 86.0 },
  { code: "HRS", name: "Hathras Jn", km: 125.0 },
  { code: "TDL", name: "Tundla Jn", km: 205.0 },
  { code: "ETW", name: "Etawah Jn", km: 300.0 },
  { code: "CNB", name: "Kanpur Central", km: 440.0 },
];

export const CorridorRadar: React.FC<CorridorRadarProps> = ({
  trains,
  blocks,
}) => {
  const [selectedItem, setSelectedItem] = React.useState<{ type: 'train' | 'block'; data: any } | null>(null);

  // Corridor display bounds (Km 10 to Km 450)
  const minKm = 10.0;
  const maxKm = 450.0;
  const kmToPercent = (km: number) => {
    return Math.min(98, Math.max(2, ((km - minKm) / (maxKm - minKm)) * 100));
  };

  const activeBlocks = blocks.filter(b => b.status === "APPROVED" || b.status === "IN_PROGRESS");

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 shadow-xl backdrop-blur-md">
      {/* Title & Legend Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-800/80">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Live Corridor Schematic Radar
            <Badge variant="outline" className="ml-1 text-[10px] font-mono border-gray-700">
              Prayagraj Trunk Corridor (440 Km)
            </Badge>
          </h2>
          <p className="text-xs text-gray-400">
            Real-time track occupancy, moving train positions, speed restrictions (TSR), and possession zones.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
            VIP Express (VB/Rajdhani)
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Superfast / Mail
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            Delayed Train
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="h-2 w-4 rounded bg-red-600/80 border border-red-500" />
            Active Track Block
          </span>
        </div>
      </div>

      {/* Schematic Track Layout Canvas */}
      <div className="relative py-8 px-4 bg-gray-950/90 rounded-lg border border-gray-800 overflow-x-auto min-w-[700px]">
        {/* Stations Markers Line */}
        <div className="relative h-6 mb-6">
          {STATIONS.map((stn) => (
            <div
              key={stn.code}
              className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${kmToPercent(stn.km)}%` }}
            >
              <div className="h-2 w-2 rounded-full bg-gray-500 border border-gray-900" />
              <span className="text-[10px] font-bold text-gray-300 mt-1">{stn.code}</span>
              <span className="text-[9px] text-gray-500 font-mono">Km {stn.km}</span>
            </div>
          ))}
        </div>

        {/* UP MAIN TRACK */}
        <div className="relative mb-10">
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5 px-1">
            <span className="text-cyan-400 font-semibold flex items-center gap-1">
              ▶ UP MAIN LINE (Delhi ➔ Howrah) • 130 km/h Automatic Block Section
            </span>
            <span>25kV AC Traction</span>
          </div>

          {/* Track Railway Line */}
          <div className="relative h-3 w-full bg-gray-800 rounded-full border border-gray-700 flex items-center overflow-visible">
            {/* Railroad sleepers pattern */}
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,#fff,#fff_2px,transparent_2px,transparent_12px)]" />

            {/* Active Maintenance Blocks Highlight Zone */}
            {activeBlocks.map((block) => {
              const leftPercent = kmToPercent(block.start_km);
              const rightPercent = kmToPercent(block.end_km);
              const widthPercent = Math.max(3, rightPercent - leftPercent);

              return (
                <div
                  key={block.id}
                  onClick={() => setSelectedItem({ type: 'block', data: block })}
                  className="absolute h-6 -top-1.5 rounded bg-red-600/30 border-2 border-dashed border-red-500 z-10 cursor-pointer hover:bg-red-600/50 flex items-center justify-center transition-all shadow-lg shadow-red-900/40"
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  title={`Block ${block.block_code} (Km ${block.start_km} - ${block.end_km})`}
                >
                  <span className="text-[9px] font-bold text-red-200 px-1 truncate flex items-center gap-0.5">
                    <ShieldAlert className="h-3 w-3 text-red-400 shrink-0" />
                    BLOCK {block.start_km.toFixed(0)}-{block.end_km.toFixed(0)}K
                  </span>
                </div>
              );
            })}

            {/* Live Moving Trains along UP Main Line */}
            {trains
              .filter((t) => t.line === "UP")
              .map((train) => {
                const leftPos = kmToPercent(train.current_km);
                const isVIP = train.train_type === "VANDE_BHARAT" || train.train_type === "RAJDHANI";
                const isDelayed = train.delay_minutes > 10;

                const markerColor = isDelayed
                  ? "bg-amber-500 text-black border-amber-300"
                  : isVIP
                  ? "bg-cyan-500 text-black border-cyan-300 shadow-cyan-500/50"
                  : "bg-blue-600 text-white border-blue-400";

                return (
                  <div
                    key={train.train_number}
                    onClick={() => setSelectedItem({ type: 'train', data: train })}
                    className={`absolute -top-3 transform -translate-x-1/2 z-20 cursor-pointer transition-all duration-700 ease-out hover:scale-125`}
                    style={{ left: `${leftPos}%` }}
                  >
                    <div
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border shadow-md ${markerColor}`}
                    >
                      <Train className="h-3 w-3 shrink-0" />
                      <span className="text-[10px] font-bold font-mono">{train.train_number}</span>
                      {train.delay_minutes > 0 && (
                        <span className="text-[8px] font-bold px-1 bg-black/40 rounded text-amber-200">
                          +{train.delay_minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* DOWN MAIN TRACK */}
        <div className="relative">
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5 px-1">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              ◀ DOWN MAIN LINE (Howrah ➔ Delhi) • 130 km/h Automatic Block Section
            </span>
            <span>25kV AC Traction</span>
          </div>

          <div className="relative h-3 w-full bg-gray-800 rounded-full border border-gray-700 flex items-center overflow-visible">
            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,#fff,#fff_2px,transparent_2px,transparent_12px)]" />

            {/* Live Moving Trains along DOWN Main Line */}
            {trains
              .filter((t) => t.line === "DOWN")
              .map((train) => {
                const leftPos = kmToPercent(train.current_km);
                return (
                  <div
                    key={train.train_number}
                    onClick={() => setSelectedItem({ type: 'train', data: train })}
                    className="absolute -top-3 transform -translate-x-1/2 z-20 cursor-pointer transition-all duration-700 hover:scale-125"
                    style={{ left: `${leftPos}%` }}
                  >
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-emerald-400 bg-emerald-600 text-white shadow-md">
                      <Train className="h-3 w-3 shrink-0" />
                      <span className="text-[10px] font-bold font-mono">{train.train_number}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Selected Item Inspector Panel */}
      {selectedItem && (
        <div className="mt-4 p-3.5 bg-gray-950 rounded-lg border border-gray-800 text-xs flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
          {selectedItem.type === 'train' ? (
            <>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-blue-900/60 border border-blue-700 flex items-center justify-center">
                  <Train className="h-4 w-4 text-cyan-300" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">
                    {selectedItem.data.train_number} • {selectedItem.data.train_name}
                  </div>
                  <div className="text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>Priority: {selectedItem.data.priority}</span>
                    <span>•</span>
                    <span>Speed: <strong className="text-white">{selectedItem.data.speed_kmph} km/h</strong></span>
                    <span>•</span>
                    <span>Position: <strong className="text-cyan-300">Km {selectedItem.data.current_km.toFixed(1)}</strong> ({selectedItem.data.current_station})</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={selectedItem.data.delay_minutes > 15 ? "destructive" : "success"}>
                  {selectedItem.data.delay_minutes > 0 ? `Delayed by ${selectedItem.data.delay_minutes} min` : "Right Time"}
                </Badge>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-500 hover:text-white px-2 py-1 text-xs"
                >
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-red-900/60 border border-red-700 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4 text-red-300" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">
                    {selectedItem.data.title} ({selectedItem.data.block_code})
                  </div>
                  <div className="text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>Possession: <strong className="text-white">{selectedItem.data.start_km} - {selectedItem.data.end_km} Km</strong></span>
                    <span>•</span>
                    <span>Bundled Depts: <strong className="text-amber-300">{selectedItem.data.bundled_departments}</strong></span>
                    <span>•</span>
                    <span>Private No: <strong className="text-emerald-400">{selectedItem.data.private_number || "Awaiting Grant"}</strong></span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-500 hover:text-white px-2 py-1 text-xs"
              >
                Close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
