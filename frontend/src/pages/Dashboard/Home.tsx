import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Header } from "@/components/dashboard/Header";
import { TimeDistanceDiagram } from "@/components/dashboard/TimeDistanceDiagram";
import { ThreeDStringChart } from "@/components/dashboard/3DStringChart";
import { ConflictCockpit } from "@/components/dashboard/ConflictCockpit";
import { CorridorRadar } from "@/components/dashboard/CorridorRadar";
import { DefectMatrix } from "@/components/dashboard/DefectMatrix";
import { GanttTimeline } from "@/components/dashboard/GanttTimeline";
import { WeatherThermalWidget } from "@/components/dashboard/WeatherThermalWidget";
import { ActiveBlocksCard } from "@/components/dashboard/ActiveBlocksCard";
import { AIDefectModal } from "@/components/dashboard/AIDefectModal";
import { BlockGrantModal } from "@/components/dashboard/BlockGrantModal";
import { BlockRequestModal } from "@/components/dashboard/BlockRequestModal";

import { RailwayAPI } from "@/services/api";
import { wsService } from "@/services/websocket";
import {
  TrainTelemetry,
  Defect,
  MaintenanceBlock,
  WeatherReport,
  ConflictAlert,
  ConflictReport,
  TrainTrajectory,
  OptimizationBundleResponse,
  UserRole,
} from "@/types/railway";
import {
  ShieldAlert,
  Thermometer,
  Clock,
  Activity,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [currentRole, setCurrentRole] = useState<UserRole>("CHIEF_CONTROLLER");

  const [trains, setTrains] = useState<TrainTelemetry[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [conflicts, setConflicts] = useState<ConflictAlert[]>([]);
  const [trajectories, setTrajectories] = useState<TrainTrajectory[]>([]);
  const [conflictReport, setConflictReport] = useState<ConflictReport | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationBundleResponse | null>(null);

  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [stringChartView, setStringChartView] = useState<"3D" | "2D">("3D");

  // Modals
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedBlockForGrant, setSelectedBlockForGrant] = useState<MaintenanceBlock | null>(null);

  // Fetch baseline data
  const fetchData = async () => {
    try {
      const [defectData, blockData, telemetryData, trajectoryData, conflictData] = await Promise.all([
        RailwayAPI.getDefects(),
        RailwayAPI.getBlocks(),
        RailwayAPI.getLiveTelemetry(),
        RailwayAPI.getTrainTrajectories(),
        RailwayAPI.getActiveConflicts(),
      ]);

      setDefects(defectData);
      setBlocks(blockData);
      if (telemetryData.trains) setTrains(telemetryData.trains);
      if (telemetryData.weather) setWeather(telemetryData.weather);
      if (telemetryData.conflicts) setConflicts(telemetryData.conflicts);
      if (trajectoryData) setTrajectories(trajectoryData);
      if (conflictData) setConflictReport(conflictData);
    } catch (err) {
      console.error("Failed to load live data:", err);
    }
  };

  useEffect(() => {
    fetchData();

    // Connect WebSocket
    wsService.connect();
    setWsConnected(wsService.getConnectedStatus());

    const unsubscribe = wsService.subscribe((payload) => {
      setWsConnected(true);
      if (payload.trains) setTrains(payload.trains);
      if (payload.conflicts) setConflicts(payload.conflicts);
      if (payload.weather) setWeather(payload.weather);
    });

    const statusInterval = setInterval(() => {
      setWsConnected(wsService.getConnectedStatus());
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);

  // Run Google OR-Tools Constraint Bundler
  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      const bundleRes = await RailwayAPI.runOptimizationBundle("NCR-GZB-TDL-UP", "UP");
      setOptimizationResult(bundleRes);
      if (bundleRes.blocks && bundleRes.blocks.length > 0) {
        setBlocks(bundleRes.blocks);
      }
      // Re-fetch conflicts after optimization
      const updatedConflicts = await RailwayAPI.getActiveConflicts();
      setConflictReport(updatedConflicts);
    } catch (err) {
      console.error("OR-Tools optimization failed:", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleOpenGrant = (block: MaintenanceBlock) => {
    setSelectedBlockForGrant(block);
    setGrantModalOpen(true);
  };

  // KPIs
  const activeBlocksCount = blocks.filter((b) => b.status === "APPROVED" || b.status === "IN_PROGRESS").length;

  // Department filter for engineer roles
  const activeDeptCode =
    currentRole === "TMS_ENGINEER"
      ? "TMS"
      : currentRole === "SMMS_ENGINEER"
      ? "SMMS"
      : currentRole === "TDMS_ENGINEER"
      ? "TDMS"
      : undefined;

  const displayedDefects = activeDeptCode
    ? defects.filter((d) => d.system === activeDeptCode)
    : defects;

  return (
    <>
      <PageMeta
        title="Samanvay-AI | Indian Railways Autonomous Block Planning & Command Center"
        description="Unified Operations Research & Predictive ML Decision Platform for Indian Railways (Prayagraj Division NCR)"
      />

      <div className="space-y-6">
        {/* Command Center Control Room Header with Role Switcher */}
        <Header
          wsConnected={wsConnected}
          conflicts={conflicts}
          activeBlocksCount={activeBlocksCount}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          onOpenAIModal={() => setAiModalOpen(true)}
          onOpenRequestModal={() => setRequestModalOpen(true)}
          onRunOptimizer={handleRunOptimizer}
          isOptimizing={isOptimizing}
        />

        {/* Role Context Notification Banner (when in Departmental Engineer view) */}
        {currentRole !== "CHIEF_CONTROLLER" && (
          <div className="p-3 rounded-xl border border-cyan-800 bg-cyan-950/40 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  Departmental Engineer Workspace:{" "}
                  <strong className="text-cyan-300">
                    {currentRole === "TMS_ENGINEER"
                      ? "Track Management (TMS - Civil)"
                      : currentRole === "SMMS_ENGINEER"
                      ? "Signal & Telecom (SMMS - S&T)"
                      : "Traction Distribution (TDMS - 25kV Electrical)"}
                  </strong>
                </span>
                <p className="text-[11px] text-gray-400">
                  Submit track possession requests, inspect Scikit-Learn predicted empirical durations, and verify block burst risk before submission.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setRequestModalOpen(true)}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs h-8 px-3.5 shadow-md shadow-cyan-900/30"
            >
              <Wrench className="h-3.5 w-3.5 mr-1" />
              New Possession Request
            </Button>
          </div>
        )}

        {/* Asset Availability & Corridor Telemetry Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Corridor Throughput */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Corridor Throughput</span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                22 <span className="text-xs text-gray-400 font-normal">Trains/Hr</span>
              </div>
              <span className="text-[11px] text-gray-500">Prayagraj Trunk (440 Km)</span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-cyan-950/80 border border-cyan-800 flex items-center justify-center">
              <Activity className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          {/* Card 2: Track Asset Availability */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Track Asset Availability</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                94.8% <span className="text-xs text-emerald-400 font-normal">(+5.4%)</span>
              </div>
              <span className="text-[11px] text-gray-500">Optimized by Mega-Bundling</span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
            </div>
          </div>

          {/* Card 3: Prevented Train Delay Minutes */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Prevented Delay Minutes</span>
              <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
                184m <span className="text-xs text-purple-300 font-normal">Saved</span>
              </div>
              <span className="text-[11px] text-gray-500">Zero Encroachment Delays</span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-950/80 border border-purple-800 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-400" />
            </div>
          </div>

          {/* Card 4: Rail-Head Solar Thermal Monitor */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Rail-Head Temp (Solar)</span>
              <div className="text-2xl font-bold font-mono text-amber-300 mt-1">
                {weather ? `${weather.estimated_rail_temp_c}°C` : "--"}
              </div>
              <span className="text-[11px] text-gray-500">
                {weather?.rail_hazards.track_buckling_risk === "LOW" ? "Buckling Risk Normal" : "Caution Enforced"}
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-950/80 border border-amber-800 flex items-center justify-center">
              <Thermometer className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Module 3: Dynamic Spatial-Temporal Conflict Cockpit */}
        <div id="conflicts">
          <ConflictCockpit
            report={conflictReport}
            onRunOptimizer={handleRunOptimizer}
            isOptimizing={isOptimizing}
            optimizationResult={optimizationResult}
          />
        </div>

        {/* Module 1: Space-Time Rail Matrix (3D WebGL Cube / 2D Mares-Chauveau Diagram) */}
        <div id="string-chart" className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-400 font-bold uppercase tracking-wider">
                CHART VIEWPORT:
              </span>
              <div className="flex items-center bg-zinc-900/90 border border-zinc-800 p-0.5 rounded">
                <button
                  onClick={() => setStringChartView("3D")}
                  className={`px-3 py-1 font-mono text-xs font-bold rounded transition-all cursor-pointer ${
                    stringChartView === "3D"
                      ? "bg-cyan-500 text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  3D SPACE-TIME MATRIX
                </button>
                <button
                  onClick={() => setStringChartView("2D")}
                  className={`px-3 py-1 font-mono text-xs font-bold rounded transition-all cursor-pointer ${
                    stringChartView === "2D"
                      ? "bg-cyan-500 text-black shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  2D STRING CHART
                </button>
              </div>
            </div>
            <span className="hidden sm:inline font-mono text-[11px] text-zinc-500">
              {stringChartView === "3D" ? "THREE.JS + R3F MULTI-PLANE VIEW" : "MARES-CHAUVEAU 2D PROJECTION"}
            </span>
          </div>

          {stringChartView === "3D" ? (
            <ThreeDStringChart />
          ) : (
            <TimeDistanceDiagram
              trajectories={trajectories}
              blocks={blocks}
              conflicts={conflictReport?.conflicts || []}
              onOpenGrantModal={handleOpenGrant}
            />
          )}
        </div>

        {/* Section: Live Corridor Schematic Radar */}
        <div id="radar">
          <CorridorRadar trains={trains} blocks={blocks} />
        </div>

        {/* Section: Active Blocks & Weather Thermal Risk side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="active-blocks">
          <div className="lg:col-span-7">
            <ActiveBlocksCard blocks={blocks} onRefresh={fetchData} />
          </div>
          <div className="lg:col-span-5" id="weather">
            <WeatherThermalWidget weather={weather} />
          </div>
        </div>

        {/* Section: AI Block Optimizer & Gantt View */}
        <div id="timeline">
          <GanttTimeline
            blocks={blocks}
            onOpenGrantModal={handleOpenGrant}
            onRunOptimizer={handleRunOptimizer}
            isOptimizing={isOptimizing}
          />
        </div>

        {/* Section: Multi-Department Defect Matrix */}
        <div id="defects">
          <DefectMatrix defects={displayedDefects} onOpenAIModal={() => setAiModalOpen(true)} />
        </div>
      </div>

      {/* AI Defect Logger Modal */}
      <AIDefectModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onDefectCreated={fetchData}
      />

      {/* Section Controller Block Grant Modal */}
      <BlockGrantModal
        block={selectedBlockForGrant}
        open={grantModalOpen}
        onOpenChange={setGrantModalOpen}
        onBlockGranted={fetchData}
      />

      {/* Departmental Engineer Block Request Modal */}
      <BlockRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        defaultDepartment={activeDeptCode || "TMS"}
        onBlockCreated={fetchData}
      />
    </>
  );
}
