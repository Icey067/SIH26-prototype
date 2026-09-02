import React from "react";
import { WeatherReport } from "@/types/railway";
import { Thermometer, Eye, Wind, Sun, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WeatherThermalWidgetProps {
  weather: WeatherReport | null;
}

export const WeatherThermalWidget: React.FC<WeatherThermalWidgetProps> = ({ weather }) => {
  if (!weather) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-1/3 mb-4" />
        <div className="h-20 bg-gray-800/50 rounded" />
      </div>
    );
  }

  const isBucklingRisk = weather.rail_hazards.track_buckling_risk === "HIGH_CRITICAL";
  const isModerateRisk = weather.rail_hazards.track_buckling_risk === "MODERATE";

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Thermometer className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Track Thermal & Weather Risk</h3>
        </div>
        <Badge variant={weather.is_live_source ? "success" : "secondary"} className="text-[10px]">
          {weather.is_live_source ? "OpenWeather LIVE" : "Corridor Sensor"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Rail-Head Temperature Gauge */}
        <div className={`p-3.5 rounded-lg border flex flex-col justify-between ${
          isBucklingRisk 
            ? "border-red-600 bg-red-950/40 text-red-200" 
            : isModerateRisk 
            ? "border-amber-600/60 bg-amber-950/30 text-amber-200" 
            : "border-gray-800 bg-gray-950/60 text-gray-200"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Rail-Head Temp</span>
            <Sun className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black font-mono">
              {weather.estimated_rail_temp_c}°C
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              Ambient: {weather.ambient_temp_c}°C (+18°C Solar)
            </span>
          </div>
        </div>

        {/* Track Buckling Hazard */}
        <div className="p-3.5 rounded-lg border border-gray-800 bg-gray-950/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Buckling Risk</span>
            {isBucklingRisk ? (
              <AlertTriangle className="h-4 w-4 text-red-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
          </div>
          <div className="mt-2">
            <span className={`text-base font-bold uppercase ${
              isBucklingRisk ? "text-red-400" : isModerateRisk ? "text-amber-400" : "text-emerald-400"
            }`}>
              {weather.rail_hazards.track_buckling_risk.replace("_", " ")}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              {isBucklingRisk ? "Issue 50 kmph TSR" : "LWR Expansion Normal"}
            </span>
          </div>
        </div>

        {/* Fog Visibility Headway */}
        <div className="p-3.5 rounded-lg border border-gray-800 bg-gray-950/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Fog Headway</span>
            <Eye className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-white">
              {(weather.visibility_meters / 1000).toFixed(1)} km
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              {weather.rail_hazards.fog_speed_restriction_active ? "Fog Caution Active" : "Clear Visibility"}
            </span>
          </div>
        </div>

        {/* OHE Wind / Sag Tension */}
        <div className="p-3.5 rounded-lg border border-gray-800 bg-gray-950/60 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">OHE Tension</span>
            <Wind className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-white">
              {weather.wind_speed_kmph} km/h
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              Catenary Sag: Normal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
