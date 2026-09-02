import React from "react";
import { AlertTriangle, Radio, ShieldCheck, Clock, Train, Flame, Smartphone } from "lucide-react";
import { ConflictAlert } from "@/types/railway";

interface HeaderProps {
  wsConnected: boolean;
  conflicts: ConflictAlert[];
  activeBlocksCount: number;
  onOpenAIModal: () => void;
  onRunOptimizer: () => void;
  isOptimizing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  wsConnected,
  conflicts,
  activeBlocksCount,
  onOpenAIModal,
  onRunOptimizer,
  isOptimizing,
}) => {
  const [currentTime, setCurrentTime] = React.useState(new Date().toLocaleTimeString("en-IN"));

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-IN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const criticalConflict = conflicts.find((c) => c.level === "CRITICAL_BURST" || c.level === "WARNING_ENCROACHMENT");

  return (
    <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Critical Emergency Alert Bar */}
      {criticalConflict && (
        <div className="bg-red-950 border-b border-red-800 px-4 py-2 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-2 text-red-200 text-xs font-semibold">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
              {criticalConflict.level.replace("_", " ")}
            </span>
            <span>{criticalConflict.message}</span>
          </div>
          <span className="text-[11px] text-red-300 font-mono hidden md:inline">
            Action: {criticalConflict.recommended_action}
          </span>
        </div>
      )}

      {/* Main Bar */}
      <div className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Branding & Corridor Title */}
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <div className="h-full w-full bg-gray-950 rounded-[7px] flex items-center justify-center">
              <Train className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                SAMANVAY-AI
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-blue-900/60 border border-blue-700/50 text-blue-300">
                  SIH-26027
                </span>
              </h1>
            </div>
            <p className="text-xs text-gray-400">
              Prayagraj Division (NCR) • Ghaziabad - Tundla - Kanpur Trunk Line
            </p>
          </div>
        </div>

        {/* Center: System Status Indicators */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/80">
            <Radio className={`h-3.5 w-3.5 ${wsConnected ? "text-emerald-400 animate-pulse" : "text-amber-500"}`} />
            <span className="text-xs font-mono text-gray-300">
              {wsConnected ? "LIVE TELEMETRY" : "RECONNECTING"}
            </span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/80">
            <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs text-gray-300 hidden xl:inline">
              Field Mobile: <strong className="text-emerald-400 font-semibold">IronSentinel Online</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/80">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs text-gray-300">
              Active Blocks: <strong className="text-white font-semibold">{activeBlocksCount}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-gray-800 bg-gray-900/80">
            <Clock className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-mono text-purple-200">{currentTime} IST</span>
          </div>
        </div>

        {/* Right: Quick Operational Triggers */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenAIModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/30 transition-all cursor-pointer"
          >
            <Flame className="h-3.5 w-3.5 text-amber-300" />
            <span>AI Defect Triage</span>
          </button>

          <button
            onClick={onRunOptimizer}
            disabled={isOptimizing}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Train className="h-3.5 w-3.5" />
            <span>{isOptimizing ? "Solving Gaps..." : "OR-Tools Auto-Bundle"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
