import { useState, useEffect } from "react";
import { MaintenanceBlock } from "@/types/railway";
import { RailwayAPI } from "@/services/api";
import { ShieldAlert, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActiveBlocksCardProps {
  blocks: MaintenanceBlock[];
  onRefresh: () => void;
}

const PROTOCOL_STEPS = [
  "0. Demand Logged",
  "1. Caution Order Issued",
  "2. Traffic Halted",
  "3. OHE Power Isolated",
  "4. Work In Progress",
  "5. Track Reconnected & Cleared",
];

export const ActiveBlocksCard: React.FC<ActiveBlocksCardProps> = ({ blocks, onRefresh }) => {
  const activeAndApproved = blocks.filter(
    (b) => b.status === "APPROVED" || b.status === "IN_PROGRESS" || b.status === "BURSTED"
  );

  const [countdowns, setCountdowns] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    const timer = setInterval(() => {
      const updated: { [id: string]: number } = {};
      activeAndApproved.forEach((b) => {
        const endDt = new Date(b.time_window_end).getTime();
        const now = Date.now();
        updated[b.id] = Math.floor((endDt - now) / 1000);
      });
      setCountdowns(updated);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAndApproved]);

  const handleAdvanceStep = async (block: MaintenanceBlock) => {
    const nextStep = Math.min(5, block.protocol_step + 1);
    const newStatus = nextStep === 4 ? "IN_PROGRESS" : nextStep === 5 ? "COMPLETED" : block.status;
    try {
      await RailwayAPI.updateProtocolStep(block.id, nextStep, newStatus);
      onRefresh();
    } catch (err) {
      console.error("Failed to advance protocol step:", err);
    }
  };

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return `BURST: +${Math.abs(Math.floor(seconds / 60))}m overdue`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s remaining`;
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Active Block Execution & Safety Handshake</h3>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {activeAndApproved.length} Active Possessions
        </Badge>
      </div>

      {activeAndApproved.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-xs">
          No maintenance blocks currently active on the corridor.
        </div>
      ) : (
        <div className="space-y-3">
          {activeAndApproved.map((block) => {
            const secRemaining = countdowns[block.id] ?? block.duration_minutes * 60;
            const isBurst = secRemaining <= 0;
            const isNearExpiry = secRemaining > 0 && secRemaining <= 600;

            return (
              <div
                key={block.id}
                className={`p-4 rounded-lg border transition-all ${
                  isBurst
                    ? "border-red-600 bg-red-950/40 animate-pulse"
                    : isNearExpiry
                    ? "border-amber-600 bg-amber-950/30"
                    : "border-gray-800 bg-gray-950/80"
                }`}
              >
                {/* Top Row: Title & Countdown */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="font-bold text-white text-xs mr-2">{block.title}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {block.block_code}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                        isBurst
                          ? "bg-red-600 text-white"
                          : isNearExpiry
                          ? "bg-amber-500 text-black"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {formatCountdown(secRemaining)}
                    </span>
                  </div>
                </div>

                {/* Info Bar */}
                <div className="text-[11px] text-gray-400 flex flex-wrap gap-2 mb-3">
                  <span>Territory: <strong className="text-white">Km {block.start_km} - {block.end_km}</strong></span>
                  <span>•</span>
                  <span>Bundled: <strong className="text-cyan-300">{block.bundled_departments}</strong></span>
                  <span>•</span>
                  <span>Private No: <strong className="text-emerald-400 font-mono">{block.private_number || "None"}</strong></span>
                </div>

                {/* Protocol Step Tracker */}
                <div className="bg-gray-900 p-2.5 rounded border border-gray-800 mb-3">
                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-1">
                    <span>SAFETY PROTOCOL STATUS:</span>
                    <span className="text-emerald-400 font-bold">
                      {PROTOCOL_STEPS[block.protocol_step]}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden flex">
                    {[0, 1, 2, 3, 4, 5].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 border-r border-gray-950 ${
                          step <= block.protocol_step ? "bg-emerald-500" : "bg-gray-800"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2">
                  {block.protocol_step < 5 && (
                    <Button
                      onClick={() => handleAdvanceStep(block)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-7 gap-1"
                    >
                      <span>Advance to: {PROTOCOL_STEPS[block.protocol_step + 1].split(". ")[1]}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
