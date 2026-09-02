import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import { Header } from "@/components/dashboard/Header";
import { CorridorRadar } from "@/components/dashboard/CorridorRadar";
import { DefectMatrix } from "@/components/dashboard/DefectMatrix";
import { GanttTimeline } from "@/components/dashboard/GanttTimeline";
import { WeatherThermalWidget } from "@/components/dashboard/WeatherThermalWidget";
import { ActiveBlocksCard } from "@/components/dashboard/ActiveBlocksCard";
import { AIDefectModal } from "@/components/dashboard/AIDefectModal";
import { BlockGrantModal } from "@/components/dashboard/BlockGrantModal";

import { RailwayAPI } from "@/services/api";
import { wsService } from "@/services/websocket";
import { TrainTelemetry, Defect, MaintenanceBlock, WeatherReport, ConflictAlert } from "@/types/railway";
import { Train, ShieldAlert, Thermometer, AlertTriangle } from "lucide-react";

export default function Home() {
  const [trains, setTrains] = useState<TrainTelemetry[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [conflicts, setConflicts] = useState<ConflictAlert[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // Modals
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [selectedBlockForGrant, setSelectedBlockForGrant] = useState<MaintenanceBlock | null>(null);

  // Fetch baseline data
  const fetchData = async () => {
    try {
      const [defectData, blockData, telemetryData] = await Promise.all([
        RailwayAPI.getDefects(),
        RailwayAPI.getBlocks(),
        RailwayAPI.getLiveTelemetry(),
      ]);

      setDefects(defectData);
      setBlocks(blockData);
      if (telemetryData.trains) setTrains(telemetryData.trains);
      if (telemetryData.weather) setWeather(telemetryData.weather);
      if (telemetryData.conflicts) setConflicts(telemetryData.conflicts);
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

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    try {
      const optimized = await RailwayAPI.runBlockOptimization("NCR-GZB-TDL-UP", "UP", false);
      if (optimized && optimized.length > 0) {
        // Merge or replace planned blocks
        setBlocks(optimized);
      }
    } catch (err) {
      console.error("OR-Tools solver failed:", err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleOpenGrant = (block: MaintenanceBlock) => {
    setSelectedBlockForGrant(block);
    setGrantModalOpen(true);
  };

  // KPIs
  const criticalDefectsCount = defects.filter((d) => d.severity === "CRITICAL").length;
  const delayedTrainsCount = trains.filter((t) => t.delay_minutes > 10).length;
  const activeBlocksCount = blocks.filter((b) => b.status === "APPROVED" || b.status === "IN_PROGRESS").length;

  return (
    <>
      <PageMeta
        title="Samanvay-AI | Indian Railways Automatic Block Planning Command Center"
        description="Unified Control Room Dashboard for Section Controllers (Prayagraj Division NCR)"
      />

      <div className="space-y-6">
        {/* Command Center Control Room Header */}
        <Header
          wsConnected={wsConnected}
          conflicts={conflicts}
          activeBlocksCount={activeBlocksCount}
          onOpenAIModal={() => setAiModalOpen(true)}
          onRunOptimizer={handleRunOptimizer}
          isOptimizing={isOptimizing}
        />

        {/* Quick Operational KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Active Possessions */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Active Track Blocks</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {activeBlocksCount} <span className="text-xs text-emerald-400 font-normal">Granted</span>
              </div>
              <span className="text-[11px] text-gray-500">Prayagraj Division (NCR)</span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
            </div>
          </div>

          {/* Card 2: Train Traffic & Delays */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Corridor Train Traffic</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {trains.length} <span className="text-xs text-amber-400 font-normal">({delayedTrainsCount} Delayed)</span>
              </div>
              <span className="text-[11px] text-gray-500">Live RapidAPI / GPS Feed</span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-950/80 border border-blue-800 flex items-center justify-center">
              <Train className="h-5 w-5 text-cyan-400" />
            </div>
          </div>

          {/* Card 3: Critical Safety Defects */}
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Critical P1 Defects</span>
              <div className="text-2xl font-bold font-mono text-red-400 mt-1">
                {criticalDefectsCount} <span className="text-xs text-gray-400 font-normal">/ {defects.length} Total</span>
              </div>
              <span className="text-[11px] text-gray-500">TMS • SMMS • TDMS</span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-red-950/80 border border-red-800 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
          </div>

          {/* Card 4: Rail-Head Temperature */}
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

        {/* Section 1: Live Corridor Schematic Radar */}
        <div id="radar">
          <CorridorRadar trains={trains} blocks={blocks} />
        </div>

        {/* Section 2: Active Blocks & Weather Thermal Risk side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="active-blocks">
          <div className="lg:col-span-7">
            <ActiveBlocksCard blocks={blocks} onRefresh={fetchData} />
          </div>
          <div className="lg:col-span-5" id="weather">
            <WeatherThermalWidget weather={weather} />
          </div>
        </div>

        {/* Section 3: AI Block Optimizer & Gantt View */}
        <div id="timeline">
          <GanttTimeline
            blocks={blocks}
            onOpenGrantModal={handleOpenGrant}
            onRunOptimizer={handleRunOptimizer}
            isOptimizing={isOptimizing}
          />
        </div>

        {/* Section 4: Multi-Department Defect Matrix */}
        <div id="defects">
          <DefectMatrix defects={defects} onOpenAIModal={() => setAiModalOpen(true)} />
        </div>
      </div>

      {/* AI Defect Logger Modal */}
      <AIDefectModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onDefectCreated={fetchData}
      />

      {/* Block Grant Modal */}
      <BlockGrantModal
        block={selectedBlockForGrant}
        open={grantModalOpen}
        onOpenChange={setGrantModalOpen}
        onBlockGranted={fetchData}
      />
    </>
  );
}
