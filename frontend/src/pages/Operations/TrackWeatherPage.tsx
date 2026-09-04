import { useState, useEffect } from "react";
import PageMeta from "@/components/common/PageMeta";
import { WeatherThermalWidget } from "@/components/dashboard/WeatherThermalWidget";
import { RailwayAPI } from "@/services/api";
import { wsService } from "@/services/websocket";
import { WeatherReport } from "@/types/railway";
import { Thermometer, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function TrackWeatherPage() {
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);


  const loadData = async () => {
    setLoading(true);
    try {
      const telemetryData = await RailwayAPI.getLiveTelemetry();
      if (telemetryData?.weather) setWeather(telemetryData.weather);
    } catch (err) {
      console.error("Error loading weather telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    wsService.connect();
    const unsub = wsService.subscribe((payload) => {
      if (payload.weather) setWeather(payload.weather);
    });
    return () => unsub();
  }, []);

  return (
    <>
      <PageMeta
        title="Track Weather & Rail Thermal Matrix | Samanvay-AI"
        description="Continuous Track Temperature Monitoring, Stress-Free Rail Temperature Indices, and Track Buckling Risk."
      />

      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded bg-surface-container-lowest border border-surface-container-high text-on-surface">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-primary" />
              <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>TRACK THERMAL & AMBIENT WEATHER TELEMETRY</span>
                <span className="text-zinc-600">//</span>
                <span className="text-primary font-mono text-xs">SUN-KINK / BUCKLING PREVENTION</span>
              </h1>
            </div>
            <p className="font-mono text-xs text-on-surface-variant">
              NCR PRAYAGRAJ DIVISION • 440 KM CONTINUOUS WELDED RAIL (CWR) THERMAL SENSOR NETWORK
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="font-mono text-xs font-bold gap-1.5 bg-surface-container border-surface-container-high"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>REFRESH SENSORS</span>
            </Button>
          </div>
        </div>

        {/* Primary Thermal Widget Card */}
        <div className="rounded bg-surface-container-low border border-surface-container-high p-4 shadow-xl">
          <WeatherThermalWidget weather={weather} />
        </div>

        {/* Sector Weather Stations Array Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { stn: "GZB (KM 0)", ambient: "31.2°C", rail: "42.8°C", humidity: "48%", risk: "NOMINAL", color: "text-emerald-400" },
            { stn: "ALJN (KM 126)", ambient: "34.5°C", rail: "48.2°C", humidity: "42%", risk: "MODERATE", color: "text-amber-400" },
            { stn: "TDL (KM 204)", ambient: "36.8°C", rail: "52.4°C", humidity: "38%", risk: "ELEVATED", color: "text-amber-400" },
            { stn: "CNB (KM 440)", ambient: "33.1°C", rail: "45.0°C", humidity: "51%", risk: "NOMINAL", color: "text-emerald-400" },
          ].map((sensor) => (
            <Card key={sensor.stn} className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-2 font-mono">
              <div className="flex justify-between items-center border-b border-surface-container-high pb-2">
                <span className="font-bold text-white text-xs">{sensor.stn}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-container border border-surface-container-high ${sensor.color}`}>
                  {sensor.risk}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-on-surface-variant block">RAIL TEMP:</span>
                  <span className="text-white font-bold text-sm">{sensor.rail}</span>
                </div>
                <div>
                  <span className="text-[10px] text-on-surface-variant block">AMBIENT:</span>
                  <span className="text-zinc-400">{sensor.ambient}</span>
                </div>
              </div>
              <div className="text-[10px] text-on-surface-variant flex justify-between pt-1">
                <span>HUMIDITY: {sensor.humidity}</span>
                <span>WIND: 14 KM/H</span>
              </div>
            </Card>
          ))}
        </div>

        {/* CWR Technical Safety Regulations Alert Card */}
        <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs font-mono">
              <h3 className="font-bold text-white uppercase text-sm">
                G&SR Continuous Welded Rail (CWR) Standard Operating Procedures
              </h3>
              <p className="text-on-surface-variant leading-relaxed">
                When rail temperature exceeds 58°C in NCR zone (Td + 20°C),
                hot-weather patrolling is automatically triggered. Maintenance blocks on curves &gt; 2°
                are suspended to prevent destressing and sun-kink rail expansion.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
