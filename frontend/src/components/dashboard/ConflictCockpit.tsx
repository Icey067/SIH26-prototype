import React from "react";
import { ConflictReport, OptimizationBundleResponse } from "@/types/railway";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap,
  CheckCircle2,
  GitMerge,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface ConflictCockpitProps {
  report: ConflictReport | null;
  onRunOptimizer: () => void;
  isOptimizing: boolean;
  optimizationResult: OptimizationBundleResponse | null;
}

export const ConflictCockpit: React.FC<ConflictCockpitProps> = ({
  report,
  onRunOptimizer,
  isOptimizing,
  optimizationResult,
}) => {
  const summary = report?.summary || {
    total_conflicts: 2,
    critical_conflicts: 1,
    total_delay_exposure_mins: 38.5,
    bundling_opportunities_count: 1,
  };

  const conflicts = report?.conflicts || [];

  return (
    <Card className="border-gray-800 bg-gray-950 text-white shadow-xl">
      <CardHeader className="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CardTitle className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              Dynamic Spatial-Temporal Conflict Cockpit
            </CardTitle>
            <Badge variant="outline" className="bg-amber-950/60 border-amber-700 text-amber-300 text-[10px] font-mono">
              COLLISION & SYNERGY MONITOR
            </Badge>
          </div>
          <CardDescription className="text-xs text-gray-400 mt-0.5">
            Continuous detection of train starvation hazards, block bursts, and multi-department co-location synergies (&le; 5 Km).
          </CardDescription>
        </div>

        {/* Global Action Trigger: Run Constraint Bundler */}
        <Button
          onClick={onRunOptimizer}
          disabled={isOptimizing}
          className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs h-9 px-4 shadow-lg shadow-cyan-900/30 transition-all cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4 mr-1.5 text-cyan-200 animate-pulse" />
          <span>{isOptimizing ? "Solving Constraint Matrix..." : "Run Constraint Bundler"}</span>
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/60">
            <span className="text-[11px] text-gray-400">Total Conflicts</span>
            <div className="text-xl font-bold font-mono text-white mt-0.5">
              {summary.total_conflicts}
            </div>
            <span className="text-[10px] text-red-400">{summary.critical_conflicts} Critical</span>
          </div>

          <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/60">
            <span className="text-[11px] text-gray-400">Delay Exposure</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
              {summary.total_delay_exposure_mins}m
            </div>
            <span className="text-[10px] text-gray-500">Passenger Trains</span>
          </div>

          <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/60">
            <span className="text-[11px] text-gray-400">Bundling Synergies</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {summary.bundling_opportunities_count}
            </div>
            <span className="text-[10px] text-emerald-500/90">&le; 5 Km Proximity</span>
          </div>

          <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/60">
            <span className="text-[11px] text-gray-400">Downtime Target</span>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
              -62%
            </div>
            <span className="text-[10px] text-gray-500">Via Mega-Bundling</span>
          </div>
        </div>

        {/* Quantified Optimization Results Banner (if optimizer ran) */}
        {optimizationResult && (
          <div className="p-3.5 rounded-xl border border-emerald-800/80 bg-emerald-950/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  OR-Tools CP-SAT Optimal Schedule Discovered
                  <Badge variant="outline" className="text-[9px] font-mono bg-emerald-900/50 border-emerald-700 text-emerald-200">
                    ZERO TRAIN DELAYS
                  </Badge>
                </span>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  Fusing separate departmental requests into {optimizationResult.blocks.length} synchronized shadow windows.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block">Downtime Reduced</span>
                <strong className="text-emerald-400 text-sm font-bold">
                  {optimizationResult.metrics.downtime_reduction_pct}%
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block">Time Saved</span>
                <strong className="text-cyan-400 text-sm font-bold">
                  {optimizationResult.metrics.saved_track_downtime_mins} mins
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Itemized Conflict & Opportunity Feed */}
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
          {conflicts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mx-auto mb-2" />
              No active collision or block starvation conflicts detected on this corridor.
            </div>
          ) : (
            conflicts.map((conf) => {
              const isCritical = conf.severity === "CRITICAL";
              const isOpportunity = conf.severity === "OPPORTUNITY";

              const borderColor = isCritical
                ? "border-red-900/80 bg-red-950/20"
                : isOpportunity
                ? "border-indigo-900/80 bg-indigo-950/20"
                : "border-amber-900/80 bg-amber-950/20";

              return (
                <div
                  key={conf.id}
                  className={`p-3 rounded-lg border ${borderColor} flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-mono uppercase font-bold ${
                          isCritical
                            ? "bg-red-950 border-red-700 text-red-300"
                            : isOpportunity
                            ? "bg-indigo-950 border-indigo-700 text-indigo-300"
                            : "bg-amber-950 border-amber-700 text-amber-300"
                        }`}
                      >
                        {conf.type.replace(/_/g, " ")}
                      </Badge>
                      <span className="font-semibold text-white">{conf.title}</span>
                      <span className="text-gray-500 font-mono text-[10px]">
                        Km {conf.location_km} - {conf.end_km}
                      </span>
                    </div>

                    <p className="text-gray-300 text-[11px] leading-relaxed">{conf.message}</p>

                    <div className="text-[10px] text-gray-400 flex items-center gap-1.5 pt-0.5">
                      <ArrowRight className="h-3 w-3 text-cyan-400 shrink-0" />
                      <span>Action: <strong className="text-gray-200">{conf.recommended_action}</strong></span>
                    </div>
                  </div>

                  {conf.estimated_delay_mins > 0 && (
                    <div className="shrink-0 text-right md:border-l md:border-gray-800 md:pl-4">
                      <span className="text-[10px] text-gray-500 block">Delay Risk</span>
                      <span className="text-sm font-bold font-mono text-red-400">
                        +{conf.estimated_delay_mins}m
                      </span>
                    </div>
                  )}

                  {isOpportunity && (
                    <div className="shrink-0 text-right md:border-l md:border-gray-800 md:pl-4">
                      <Button
                        size="sm"
                        onClick={onRunOptimizer}
                        className="text-[10px] h-7 bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                      >
                        <GitMerge className="h-3 w-3 mr-1" />
                        Bundle Now
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};
