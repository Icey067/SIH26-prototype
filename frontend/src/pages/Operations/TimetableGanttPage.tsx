import { useState, useEffect } from "react";
import PageMeta from "@/components/common/PageMeta";
import { ThreeDStringChart } from "@/components/dashboard/3DStringChart";
import { TimeDistanceDiagram } from "@/components/dashboard/TimeDistanceDiagram";
import { GanttTimeline } from "@/components/dashboard/GanttTimeline";
import { BlockGrantModal } from "@/components/dashboard/BlockGrantModal";
import { RailwayAPI } from "@/services/api";
import { TrainTrajectory, MaintenanceBlock, ConflictItem } from "@/types/railway";
import { Calendar, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TimetableGanttPage() {
  const [trajectories, setTrajectories] = useState<TrainTrajectory[]>([]);
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [activeTab, setActiveTab] = useState<"3D" | "2D" | "GANTT">("3D");
  const [loading, setLoading] = useState<boolean>(true);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [selectedBlockForGrant, setSelectedBlockForGrant] = useState<MaintenanceBlock | null>(null);
  const [grantModalOpen, setGrantModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [trajData, blockData, conflictData] = await Promise.all([
        RailwayAPI.getTrainTrajectories(),
        RailwayAPI.getBlocks(),
        RailwayAPI.getActiveConflicts(),
      ]);
      if (trajData) setTrajectories(trajData);
      if (blockData) setBlocks(blockData);
      if (conflictData?.conflicts) setConflicts(conflictData.conflicts);
    } catch (err) {
      console.error("Error loading timetable data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      await RailwayAPI.runOptimizationBundle("NCR-GZB-TDL-UP", "UP");
      await loadData();
    } catch (err) {
      console.error("Error optimizing timetable:", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Timetable Gantt & 3D Rail Matrix | Samanvay-AI"
        description="Multi-Plane 3D Space-Time Rail Matrix and Mares-Chauveau String Chart for Railway Block Coordination."
      />

      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded bg-surface-container-lowest border border-surface-container-high text-on-surface">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>TIMETABLE GANTT & 3D MATRIX</span>
                <span className="text-zinc-600">//</span>
                <span className="text-primary font-mono text-xs">MAREY-CHAUVEAU COCKPIT</span>
              </h1>
            </div>
            <p className="font-mono text-xs text-on-surface-variant">
              NCR PRAYAGRAJ DIVISION • TIME-DISTANCE STRING CHART & MULTI-CORRIDOR OVERLAYS
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded bg-surface-container p-0.5 border border-surface-container-high">
              <button
                onClick={() => setActiveTab("3D")}
                className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "3D"
                    ? "bg-primary text-on-primary shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                3D WEBGL TWIN
              </button>
              <button
                onClick={() => setActiveTab("2D")}
                className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "2D"
                    ? "bg-primary text-on-primary shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                2D STRING CHART
              </button>
              <button
                onClick={() => setActiveTab("GANTT")}
                className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "GANTT"
                    ? "bg-primary text-on-primary shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                TIMETABLE GANTT
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="font-mono text-xs font-bold gap-1.5 bg-surface-container border-surface-container-high"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>REFRESH</span>
            </Button>
          </div>
        </div>

        {/* Dynamic Main Viewport */}
        {activeTab === "3D" && (
          <div className="rounded overflow-hidden shadow-2xl">
            <ThreeDStringChart />
          </div>
        )}

        {activeTab === "2D" && (
          <div className="rounded overflow-hidden shadow-xl">
            <TimeDistanceDiagram
              trajectories={trajectories}
              blocks={blocks}
              conflicts={conflicts}
            />
          </div>
        )}

        {activeTab === "GANTT" && (
          <div className="rounded bg-surface-container-low border border-surface-container-high p-4 shadow-xl">
            <GanttTimeline
              blocks={blocks}
              onOpenGrantModal={(block) => {
                setSelectedBlockForGrant(block);
                setGrantModalOpen(true);
              }}
              onRunOptimizer={handleRunOptimizer}
              isOptimizing={isOptimizing}
            />
          </div>
        )}

        {/* Headway & Safety Envelope Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-wider">
              MINIMUM HEADWAY SEPARATION
            </span>
            <div className="text-3xl font-black font-mono text-white">12.4 MIN</div>
            <p className="text-[11px] text-on-surface-variant font-mono">Signal spacing threshold: 10.0 min</p>
          </Card>

          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
              VIP OVERTAKE CLEARANCE
            </span>
            <div className="text-3xl font-black font-mono text-emerald-400">100% PROTECTED</div>
            <p className="text-[11px] text-on-surface-variant font-mono">Rajdhani & Vande Bharat priority slots</p>
          </Card>

          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-secondary uppercase font-bold tracking-wider">
              TOTAL DELAY MITIGATED
            </span>
            <div className="text-3xl font-black font-mono text-secondary">0 MIN</div>
            <p className="text-[11px] text-on-surface-variant font-mono">Predicted zero disruption envelope</p>
          </Card>
        </div>
      </div>

      {/* Grant Modal */}
      {selectedBlockForGrant && (
        <BlockGrantModal
          block={selectedBlockForGrant}
          open={grantModalOpen}
          onOpenChange={(open) => {
            setGrantModalOpen(open);
            if (!open) setSelectedBlockForGrant(null);
          }}
          onBlockGranted={() => {
            setGrantModalOpen(false);
            setSelectedBlockForGrant(null);
            loadData();
          }}
        />
      )}
    </>
  );
}
