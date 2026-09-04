import { useState, useEffect } from "react";
import PageMeta from "@/components/common/PageMeta";
import { CorridorRadar } from "@/components/dashboard/CorridorRadar";
import { RailwayAPI } from "@/services/api";
import { wsService } from "@/services/websocket";
import { TrainTelemetry, MaintenanceBlock } from "@/types/railway";
import { Train, RefreshCw, AlertTriangle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CorridorRadarPage() {
  const [trains, setTrains] = useState<TrainTelemetry[]>([]);
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<"ALL" | "UP" | "DN">("ALL");
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [blockData, telemetryData] = await Promise.all([
        RailwayAPI.getBlocks(),
        RailwayAPI.getLiveTelemetry(),
      ]);
      if (blockData) setBlocks(blockData);
      if (telemetryData.trains) setTrains(telemetryData.trains);
    } catch (err) {
      console.error("Error loading corridor radar data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    wsService.connect();
    const unsub = wsService.subscribe((payload) => {
      if (payload.trains) setTrains(payload.trains);
    });
    return () => unsub();
  }, []);

  const filteredTrains = trains.filter((t) => {
    if (selectedDirection === "ALL") return true;
    const dir = t.line === "UP" ? "UP" : "DN";
    return dir === selectedDirection;
  });

  return (
    <>
      <PageMeta
        title="Corridor Radar | Samanvay-AI Rail Command"
        description="Dynamic Linear Synoptic Radar and Quad-Track Realtime Telemetry across NCR Prayagraj Division."
      />

      <div className="space-y-6">
        {/* Top Operational Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded bg-surface-container-lowest border border-surface-container-high text-on-surface">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-primary rounded-sm animate-pulse" />
              <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>CORRIDOR RADAR</span>
                <span className="text-zinc-600">//</span>
                <span className="text-primary font-mono text-xs">SYNOPTIC QUAD-TRACK TELEMETRY</span>
              </h1>
            </div>
            <p className="font-mono text-xs text-on-surface-variant">
              NCR PRAYAGRAJ DIVISION • GHAZIABAD (0 KM) ➔ KANPUR CENTRAL (440 KM)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded bg-surface-container p-0.5 border border-surface-container-high">
              <button
                onClick={() => setSelectedDirection("ALL")}
                className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all cursor-pointer ${
                  selectedDirection === "ALL"
                    ? "bg-primary text-on-primary shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                ALL TRACKS
              </button>
              <button
                onClick={() => setSelectedDirection("UP")}
                className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all cursor-pointer ${
                  selectedDirection === "UP"
                    ? "bg-primary text-on-primary shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                UP LINE
              </button>
              <button
                onClick={() => setSelectedDirection("DN")}
                className={`px-3 py-1 rounded font-mono text-xs font-bold transition-all cursor-pointer ${
                  selectedDirection === "DN"
                    ? "bg-primary text-on-primary shadow"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                DN LINE
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

        {/* Primary Schematic Radar Viewport */}
        <div className="rounded bg-surface-container-low border border-surface-container-high p-4 shadow-xl">
          <CorridorRadar trains={filteredTrains} blocks={blocks} />
        </div>

        {/* Live Train Positions & Telemetry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-8 bg-surface-container-low border-surface-container-high text-on-surface">
            <CardHeader className="p-4 border-b border-surface-container-high flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Train className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">
                  Active Train Fleet in Sector ({filteredTrains.length})
                </CardTitle>
              </div>
              <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary font-mono text-[10px]">
                KAVACH TCAS LOCKED
              </Badge>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-surface-container border-b border-surface-container-high text-on-surface-variant">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">TRAIN NUMBER</th>
                    <th className="py-2.5 px-4 font-semibold">TYPE</th>
                    <th className="py-2.5 px-4 font-semibold">DIRECTION</th>
                    <th className="py-2.5 px-4 font-semibold">SPEED</th>
                    <th className="py-2.5 px-4 font-semibold">CURRENT KM</th>
                    <th className="py-2.5 px-4 font-semibold">SIGNAL ASPECT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/60">
                  {filteredTrains.map((train) => (
                    <tr key={train.train_number} className="hover:bg-surface-container/50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        {train.train_name || train.train_number}
                      </td>
                      <td className="py-2.5 px-4 text-on-surface-variant">{train.train_type || "EXPRESS"}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            train.line === "UP"
                              ? "bg-cyan-950/80 text-cyan-400 border border-cyan-500/30"
                              : "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {train.line} LINE
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white">{train.speed_kmph} KM/H</td>
                      <td className="py-2.5 px-4 text-on-surface-variant">KM {train.current_km.toFixed(1)}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          PROCEED [GREEN]
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>

          </Card>

          {/* Speed Restrictions & Section Advisory Card */}
          <Card className="lg:col-span-4 bg-surface-container-low border-surface-container-high text-on-surface">
            <CardHeader className="p-4 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-secondary" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">
                  Active TSR Restrictions
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 rounded bg-surface-container border border-surface-container-high font-mono text-xs space-y-1.5">
                <div className="flex justify-between items-center text-secondary font-bold">
                  <span>TSR-ALJN-TDL // KM 142</span>
                  <span className="px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/30">30 KM/H</span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Ballast deep screening machine operating adjacent on UP Fast loop line.
                </p>
              </div>

              <div className="p-3 rounded bg-surface-container border border-surface-container-high font-mono text-xs space-y-1.5">
                <div className="flex justify-between items-center text-secondary font-bold">
                  <span>TSR-ETW-PHD // KM 312</span>
                  <span className="px-1.5 py-0.5 rounded bg-secondary/10 border border-secondary/30">45 KM/H</span>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  OHE mast realignment and contact wire tensioning gang on DN Fast track.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant border-t border-surface-container-high pt-2">
                  <span>TOTAL TSR DELAY:</span>
                  <span className="text-primary font-bold">+8.4 MIN BUFFER</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
