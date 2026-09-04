import { useState, useEffect } from "react";
import { MaintenanceBlock } from "@/types/railway";
import { RailwayAPI } from "@/services/api";
import { ShieldAlert, Clock, ArrowRight, Key, AlertTriangle, XCircle, Zap, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActiveBlocksCardProps {
  blocks: MaintenanceBlock[];
  onRefresh: () => void;
}

const PROTOCOL_STEPS = [
  "0. Demand Logged",
  "1. Caution Order Issued",
  "2. Traffic Halted & SM Concurred",
  "3. OHE Power Isolated",
  "4. Work In Progress",
  "5. Track Reconnected & Cleared",
];

export const ActiveBlocksCard: React.FC<ActiveBlocksCardProps> = ({ blocks, onRefresh }) => {
  const activeAndApproved = blocks.filter(
    (b) =>
      b.status === "APPROVED" ||
      b.status === "CONTROLLER_APPROVED" ||
      b.status === "STATION_MASTER_CONCURRED" ||
      b.status === "IN_PROGRESS" ||
      b.status === "BURSTED" ||
      b.status === "SAFETY_TIMEOUT_SUSPENDED" ||
      b.status === "MACHINE_STRANDED_OBSTRUCTION" ||
      b.status === "EMERGENCY_REVOKED"
  );

  const [countdowns, setCountdowns] = useState<{ [id: string]: number }>({});
  const [selectedBlockForSM, setSelectedBlockForSM] = useState<MaintenanceBlock | null>(null);
  const [smStation, setSmStation] = useState("ALJN");
  const [smPrivateNumber, setSmPrivateNumber] = useState(`PN-SM-ALJN-${Math.floor(1000 + Math.random() * 9000)}`);

  const [selectedBlockForRevoke, setSelectedBlockForRevoke] = useState<MaintenanceBlock | null>(null);
  const [revokeReason, setRevokeReason] = useState("Approaching Medical Relief Van (MRV) on Priority 1 Corridor");
  const [pncNumber, setPncNumber] = useState(`PNC-SC-${Math.floor(1000 + Math.random() * 9000)}`);

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

  const handleStationMasterConcur = async () => {
    if (!selectedBlockForSM) return;
    try {
      await RailwayAPI.concurBlockByStationMaster(
        selectedBlockForSM.id,
        smPrivateNumber,
        smStation,
        `Point interlocked & route isolated at ${smStation} station.`
      );
      setSelectedBlockForSM(null);
      onRefresh();
    } catch (err) {
      console.error("Failed SM concurrence:", err);
    }
  };

  const handleEmergencyRevoke = async () => {
    if (!selectedBlockForRevoke) return;
    try {
      await RailwayAPI.emergencyRevokeBlock(selectedBlockForRevoke.id, revokeReason, pncNumber);
      setSelectedBlockForRevoke(null);
      onRefresh();
    } catch (err) {
      console.error("Failed emergency revocation:", err);
    }
  };

  const handleReportBreakdown = async (block: MaintenanceBlock) => {
    const machine = block.machinery_assigned?.split(",")[0]?.trim() || "CSM_02";
    const km = block.start_km + 1.2;
    try {
      await RailwayAPI.reportMachineIncident(
        block.id,
        machine,
        km,
        `Hydraulic line pressure loss on unit ${machine} at Km ${km.toFixed(1)}.`
      );
      onRefresh();
    } catch (err) {
      console.error("Failed to report machine breakdown:", err);
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
          <h3 className="text-sm font-bold text-white">Active Block Execution & G&SR Safety Handshake</h3>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {activeAndApproved.length} Monitored Blocks
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
            const isRevoked = block.status === "EMERGENCY_REVOKED";
            const isSuspended = block.status === "SAFETY_TIMEOUT_SUSPENDED";
            const isObstructed = block.status === "MACHINE_STRANDED_OBSTRUCTION";

            const controllerPN = block.controller_private_number || block.private_number;
            const smPN = block.station_master_private_number;

            return (
              <div
                key={block.id}
                className={`p-4 rounded-lg border transition-all ${
                  isRevoked || isObstructed
                    ? "border-red-600 bg-red-950/50"
                    : isSuspended
                    ? "border-amber-600 bg-amber-950/50 animate-pulse"
                    : isBurst
                    ? "border-red-600 bg-red-950/40 animate-pulse"
                    : isNearExpiry
                    ? "border-amber-600 bg-amber-950/30"
                    : "border-gray-800 bg-gray-950/80"
                }`}
              >
                {/* Top Row: Title & Countdown */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-xs mr-1">{block.title}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {block.block_code}
                    </Badge>
                    {isRevoked && (
                      <Badge className="bg-red-600 text-white text-[10px]">
                        EMERGENCY REVOKED (PNC)
                      </Badge>
                    )}
                    {isSuspended && (
                      <Badge className="bg-amber-600 text-black text-[10px] font-bold">
                        SAFETY TIMEOUT SUSPENDED (TTL)
                      </Badge>
                    )}
                    {isObstructed && (
                      <Badge className="bg-rose-700 text-white text-[10px] font-bold">
                        MACHINE STRANDED (OBSTRUCTION)
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                        isRevoked
                          ? "bg-red-900 text-red-200 border border-red-700"
                          : isBurst
                          ? "bg-red-600 text-white"
                          : isNearExpiry
                          ? "bg-amber-500 text-black"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {isRevoked ? "CANCELLED" : formatCountdown(secRemaining)}
                    </span>
                  </div>
                </div>

                {/* Info Bar & Dual Handshake Badges */}
                <div className="text-[11px] text-gray-400 flex flex-wrap gap-2 mb-3 items-center">
                  <span>Territory: <strong className="text-white">Km {block.start_km} - {block.end_km}</strong></span>
                  <span>•</span>
                  <span>Bundled: <strong className="text-cyan-300">{block.bundled_departments}</strong></span>
                  {block.elementary_section_id && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80 font-mono text-[10px]">
                        <Zap className="h-2.5 w-2.5 text-amber-400" />
                        ES: {block.elementary_section_id}
                      </span>
                    </>
                  )}
                </div>

                {/* Dual-Key Handshake Verification Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 rounded bg-gray-900/90 border border-gray-800 mb-3 text-[11px]">
                  {/* Key 1: Section Controller */}
                  <div className="flex items-center justify-between border-b md:border-b-0 md:border-r border-gray-800 pb-1 md:pb-0 md:pr-2">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Key className="h-3 w-3 text-emerald-400" />
                      1. Section Controller:
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {controllerPN ? controllerPN : "PENDING"}
                    </span>
                  </div>

                  {/* Key 2: Station Master Concurrence */}
                  <div className="flex items-center justify-between md:pl-2">
                    <span className="text-gray-400 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-cyan-400" />
                      2. Station Master:
                    </span>
                    {smPN ? (
                      <span className="font-mono text-cyan-300 font-bold">
                        {smPN} ({block.station_master_station || "ALJN"})
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedBlockForSM(block);
                          setSmPrivateNumber(`PN-SM-ALJN-${Math.floor(1000 + Math.random() * 9000)}`);
                        }}
                        className="bg-amber-600 hover:bg-amber-500 text-black font-bold text-[10px] h-5 px-2"
                      >
                        Concur (Dual-Key)
                      </Button>
                    )}
                  </div>
                </div>

                {/* Emergency Regulation Order Banner */}
                {block.traffic_regulation_order && (
                  <div className="mb-3 p-2 rounded bg-amber-950/40 border border-amber-700/80 flex items-center gap-2 text-xs text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    <div>
                      <strong>Emergency Freight Regulation:</strong> Held{" "}
                      <code className="text-white font-mono">{block.traffic_regulation_order.train_held}</code> in{" "}
                      <strong className="text-white">{block.traffic_regulation_order.loop_station}</strong> Loop line
                      ({block.traffic_regulation_order.delay_incurred_mins} min delay incurred) to carve block window.
                    </div>
                  </div>
                )}

                {/* Offline Safety Lease Verification Pill */}
                {block.safety_lease_token && (
                  <div className="mb-3 flex items-center justify-between text-[10px] font-mono p-1.5 rounded bg-emerald-950/30 border border-emerald-800/50 text-emerald-300">
                    <span className="flex items-center gap-1">
                      <Key className="h-3 w-3 text-emerald-400" />
                      HMAC Offline Lease: <strong className="text-white">{block.safety_lease_token.slice(0, 16)}...</strong>
                    </span>
                    <span className="text-emerald-400">
                      TTL Grace: 10 min | {isSuspended ? "EXPIRED" : "VALID"}
                    </span>
                  </div>
                )}

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

                {/* Action Toolbar */}
                <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                  <div className="flex gap-2">
                    {!isRevoked && (
                      <Button
                        onClick={() => {
                          setSelectedBlockForRevoke(block);
                          setPncNumber(`PNC-SC-${Math.floor(1000 + Math.random() * 9000)}`);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-red-800 text-red-400 hover:bg-red-950/80 hover:text-white text-[11px] h-7 gap-1"
                      >
                        <XCircle className="h-3 w-3" />
                        Emergency Revoke
                      </Button>
                    )}

                    {!isObstructed && (
                      <Button
                        onClick={() => handleReportBreakdown(block)}
                        variant="outline"
                        size="sm"
                        className="border-amber-800 text-amber-400 hover:bg-amber-950/80 text-[11px] h-7 gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Report Stalled Machine
                      </Button>
                    )}
                  </div>

                  {block.protocol_step < 5 && !isRevoked && (
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

      {/* Station Master Concurrence Modal */}
      {selectedBlockForSM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-950 p-5 shadow-2xl text-white">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-2 text-cyan-300">
              <ShieldCheck className="h-4 w-4" />
              Station Master Concurrence (Dual-Key)
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              Confirm route isolation and signal clamp before granting permission for{" "}
              <strong>{selectedBlockForSM.block_code}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Station ID:</label>
                <input
                  type="text"
                  value={smStation}
                  onChange={(e) => setSmStation(e.target.value.toUpperCase())}
                  className="w-full h-8 rounded border border-gray-800 bg-gray-900 px-2 font-mono text-cyan-400"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">SM Private Number:</label>
                <input
                  type="text"
                  value={smPrivateNumber}
                  onChange={(e) => setSmPrivateNumber(e.target.value)}
                  className="w-full h-8 rounded border border-gray-800 bg-gray-900 px-2 font-mono text-emerald-400 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBlockForSM(null)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleStationMasterConcur}
                className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs h-8"
              >
                Issue Concurrence & HMAC Lease
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Revocation Modal */}
      {selectedBlockForRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-red-800 bg-gray-950 p-5 shadow-2xl text-white">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-2 text-red-400">
              <XCircle className="h-4 w-4" />
              Emergency Block Revocation (G&SR)
            </h4>
            <p className="text-xs text-gray-400 mb-3">
              Unilaterally cancel track possession for <strong>{selectedBlockForRevoke.block_code}</strong>.
              Immediately invalidates the field safety lease token.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Revocation Reason (SOS / Relief):</label>
                <textarea
                  rows={2}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full rounded border border-gray-800 bg-gray-900 p-2 text-xs text-red-200"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Private Number Cancellation (PNC):</label>
                <input
                  type="text"
                  value={pncNumber}
                  onChange={(e) => setPncNumber(e.target.value)}
                  className="w-full h-8 rounded border border-gray-800 bg-gray-900 px-2 font-mono text-red-400 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBlockForRevoke(null)}
                className="text-xs h-8"
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                onClick={handleEmergencyRevoke}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs h-8"
              >
                Confirm Revocation & PNC
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
