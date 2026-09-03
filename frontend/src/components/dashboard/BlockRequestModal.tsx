import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DurationPredictionResponse } from "@/types/railway";
import { RailwayAPI } from "@/services/api";
import {
  Wrench,
  Cpu,
  Send,
  Loader2,
} from "lucide-react";

interface BlockRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDepartment?: string;
  onBlockCreated?: () => void;
}

export const BlockRequestModal: React.FC<BlockRequestModalProps> = ({
  open,
  onOpenChange,
  defaultDepartment = "TMS",
  onBlockCreated,
}) => {
  const [department, setDepartment] = useState(defaultDepartment);
  const [activityType, setActivityType] = useState("TAMPING");
  const [trackLine, setTrackLine] = useState("UP_MAIN");
  const [startKm, setStartKm] = useState(126.0);
  const [endKm, setEndKm] = useState(131.0);
  const [machinery, setMachinery] = useState("CSM");
  const [trackType, setTrackType] = useState("MAIN_LINE");
  const [weather, setWeather] = useState("CLEAR");
  const [requestedDuration, setRequestedDuration] = useState(90);

  // Prediction state
  const [prediction, setPrediction] = useState<DurationPredictionResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync defaultDepartment
  useEffect(() => {
    if (defaultDepartment) setDepartment(defaultDepartment);
  }, [defaultDepartment]);

  // Activity defaults per department
  useEffect(() => {
    if (department === "TMS") {
      setActivityType("TAMPING");
      setMachinery("CSM");
    } else if (department === "SMMS") {
      setActivityType("POINT_OVERHAUL");
      setMachinery("MANUAL_GANG");
    } else {
      setActivityType("OHE_INSPECTION");
      setMachinery("TOWER_WAGON");
    }
  }, [department]);

  // Live ML Duration & Risk Prediction
  const runPrediction = async () => {
    setIsPredicting(true);
    try {
      const res = await RailwayAPI.predictDurationAndRisk({
        department,
        activity_type: activityType,
        track_type: trackType,
        machinery_deployed: machinery,
        weather_condition: weather,
        requested_duration_mins: requestedDuration,
      });
      setPrediction(res);
    } catch (err) {
      console.error("ML Prediction error:", err);
    } finally {
      setIsPredicting(false);
    }
  };

  useEffect(() => {
    if (open) {
      runPrediction();
    }
  }, [open, department, activityType, trackType, machinery, weather, requestedDuration]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const endTime = new Date(startTime.getTime() + requestedDuration * 60 * 1000);

      await RailwayAPI.createBlock({
        block_code: `REQ-${department}-${now.getHours()}${now.getMinutes()}`,
        title: `${department} ${activityType.replace(/_/g, " ")} (${startKm} - ${endKm} Km)`,
        track_section_id: "NCR-GZB-TDL-UP",
        line: trackLine,
        division: "Prayagraj (NCR)",
        start_km: startKm,
        end_km: endKm,
        time_window_start: startTime.toISOString(),
        time_window_end: endTime.toISOString(),
        duration_minutes: requestedDuration,
        primary_department: department,
        bundled_departments: department,
        machinery_assigned: machinery,
        status: "PENDING",
        optimization_score: 90.0,
      });

      if (onBlockCreated) onBlockCreated();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to submit block request:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const riskPercent = prediction ? Math.round(prediction.overrun_risk_score * 100) : 45;
  const isHighRisk = prediction?.risk_level === "CRITICAL";
  const isModerateRisk = prediction?.risk_level === "MODERATE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-gray-950 border-gray-800 text-white shadow-2xl">
        <DialogHeader className="border-b border-gray-800 pb-3">
          <div className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-cyan-400" />
            <DialogTitle className="text-base font-bold text-white">
              Departmental Track Possession Request
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-gray-400">
            Submit maintenance block demand with real-time Scikit-Learn empirical duration & block burst risk verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Department Selection */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "TMS", label: "Track (TMS)", color: "border-emerald-700 text-emerald-400" },
              { id: "SMMS", label: "Signals (SMMS)", color: "border-blue-700 text-blue-400" },
              { id: "TDMS", label: "Traction (TDMS)", color: "border-amber-700 text-amber-400" },
            ].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDepartment(d.id)}
                className={`p-2 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                  department === d.id
                    ? "bg-gray-800 border-cyan-500 text-white shadow-md shadow-cyan-900/30"
                    : "bg-gray-900/60 border-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Activity & Machinery */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Activity Type</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none"
              >
                {department === "TMS" && (
                  <>
                    <option value="TAMPING">Track Tamping (CSM)</option>
                    <option value="DEEP_SCREENING">Ballast Deep Screening (BCM)</option>
                    <option value="RAIL_RENEWAL">Complete Rail Renewal (CRR)</option>
                    <option value="TURNOUT_REPLACEMENT">Turnout Replacement</option>
                  </>
                )}
                {department === "SMMS" && (
                  <>
                    <option value="POINT_OVERHAUL">Switch Point Machine Overhaul</option>
                    <option value="CABLE_TESTING">Signal Relay & Cable Testing</option>
                    <option value="ROUTINE_INSPECTION">Axle Counter & Circuit Check</option>
                  </>
                )}
                {department === "TDMS" && (
                  <>
                    <option value="OHE_INSPECTION">25kV OHE Catenary Inspection</option>
                    <option value="CATENARY_MAST_REPAIR">Catenary Mast & Tensioner Repair</option>
                    <option value="ROUTINE_INSPECTION">TSS Power Substation Check</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Machinery Deployed</label>
              <select
                value={machinery}
                onChange={(e) => setMachinery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none"
              >
                <option value="CSM">CSM (Continuous Tamping Machine)</option>
                <option value="BCM">BCM (Ballast Cleaning Machine)</option>
                <option value="TOWER_WAGON">OHE Tower Wagon (Self-Propelled)</option>
                <option value="UNIMAT">UNIMAT Turnout Machine</option>
                <option value="MANUAL_GANG">Manual P-Way Labor Gang</option>
              </select>
            </div>
          </div>

          {/* Line & Kilometer Markers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Track Line</label>
              <select
                value={trackLine}
                onChange={(e) => setTrackLine(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none"
              >
                <option value="UP_MAIN">UP Main (towards GZB)</option>
                <option value="DN_MAIN">DN Main (towards CNB)</option>
                <option value="LOOP_1">Loop Line 1 (Junction)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Start Km</label>
              <input
                type="number"
                step="0.5"
                value={startKm}
                onChange={(e) => setStartKm(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white font-mono outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">End Km</label>
              <input
                type="number"
                step="0.5"
                value={endKm}
                onChange={(e) => setEndKm(parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white font-mono outline-none"
              />
            </div>
          </div>

          {/* Track Type & Weather Condition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Track Type</label>
              <select
                value={trackType}
                onChange={(e) => setTrackType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none"
              >
                <option value="MAIN_LINE">Main Line (130 Km/h)</option>
                <option value="LOOP_LINE">Loop Line (30 Km/h)</option>
                <option value="YARD">Station Yard / Siding</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">Weather Condition</label>
              <select
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white focus:border-cyan-500 outline-none"
              >
                <option value="CLEAR">Clear Weather (Standard)</option>
                <option value="EXTREME_HEAT">Extreme Solar Heat (&gt;42°C)</option>
                <option value="FOG">Winter Fog / Low Visibility</option>
                <option value="HEAVY_RAIN">Heavy Monsoonal Rain</option>
              </select>
            </div>
          </div>

            {/* Requested Duration Slider */}
          <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/60">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] text-gray-400">Requested Window</label>
              <span className="font-mono text-cyan-300 font-bold">{requestedDuration} mins</span>
            </div>
            <input
              type="range"
              min="30"
              max="360"
              step="15"
              value={requestedDuration}
              onChange={(e) => setRequestedDuration(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Predictive ML Comparison & Overrun Risk Box */}
          <div className="p-3.5 rounded-xl border border-gray-800 bg-gray-900/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-purple-400" />
                <span className="font-bold text-white text-xs">Scikit-Learn Predictive Model</span>
              </div>
              {isPredicting && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Inching...
                </span>
              )}
            </div>

            {prediction && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                {/* Duration Comparison */}
                <div>
                  <span className="text-[10px] text-gray-400 block">Requested vs ML Predicted</span>
                  <div className="flex items-baseline space-x-2 mt-0.5">
                    <span className="text-sm font-mono line-through text-gray-500">{prediction.requested_duration_mins}m</span>
                    <span className="text-base font-mono font-bold text-cyan-400">{prediction.predicted_duration_mins}m</span>
                  </div>
                  <span className={`text-[10px] font-mono ${prediction.duration_discrepancy_mins > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {prediction.duration_discrepancy_mins > 0 ? `+${prediction.duration_discrepancy_mins}m buffer needed` : "Within time envelope"}
                  </span>
                </div>

                {/* Overrun Risk Gauge */}
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400">Block Burst Risk</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono font-bold ${
                        isHighRisk
                          ? "bg-red-950 border-red-700 text-red-300"
                          : isModerateRisk
                          ? "bg-amber-950 border-amber-700 text-amber-300"
                          : "bg-emerald-950 border-emerald-700 text-emerald-300"
                      }`}
                    >
                      {prediction.risk_level}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-800 h-2 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isHighRisk ? "bg-red-500" : isModerateRisk ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${riskPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 mt-1 block text-right">
                    {riskPercent}% Probability
                  </span>
                </div>
              </div>
            )}

            {prediction && (
              <p className="text-[11px] text-gray-300 bg-gray-950/60 p-2 rounded-lg border border-gray-800">
                <strong>Empirical Recommendation:</strong> {prediction.recommendation}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-gray-800 pt-3 flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-gray-800 text-gray-400 hover:text-white text-xs"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4"
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
            <span>Submit Possession Demand</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
