import React, { useState, useEffect } from "react";
import PageMeta from "@/components/common/PageMeta";
import { DefectMatrix } from "@/components/dashboard/DefectMatrix";
import { AIDefectModal } from "@/components/dashboard/AIDefectModal";
import { RailwayAPI } from "@/services/api";
import { Defect } from "@/types/railway";
import { List, Sparkles, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DefectTriagePage() {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await RailwayAPI.getDefects();
      if (data) setDefects(data);
    } catch (err) {
      console.error("Error loading defects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const criticalCount = defects.filter((d) => d.severity === "CRITICAL").length;
  const majorCount = defects.filter((d) => d.severity === "MAJOR").length;
  const minorCount = defects.filter((d) => d.severity === "MINOR").length;

  return (
    <>
      <PageMeta
        title="Defect Triage Matrix | Samanvay-AI"
        description="Multilingual AI Track Defect Triage, Ultrasonic Rail Flaw Detection, and Urgent Maintenance Allocation."
      />

      <div className="space-y-6">
        {/* Top Operational Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded bg-surface-container-lowest border border-surface-container-high text-on-surface">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-primary" />
              <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>DEFECT TRIAGE MATRIX</span>
                <span className="text-zinc-600">//</span>
                <span className="text-primary font-mono text-xs">GEMINI MULTILINGUAL REASONING</span>
              </h1>
            </div>
            <p className="font-mono text-xs text-on-surface-variant">
              ACOUSTIC, VISUAL & GEOMETRY RAIL DEFECT DETECTIONS ACROSS 440 KM TRUNK CORRIDOR
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setAiModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-on-primary font-mono text-xs font-bold gap-1.5 cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>GEMINI AI TRIAGE DEFECT</span>
            </Button>

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

        {/* Severity Metrics Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-error uppercase font-bold tracking-wider">
              CRITICAL FRACTURES (TSR 30)
            </span>
            <div className="text-3xl font-black font-mono text-error">{criticalCount}</div>
            <p className="text-[11px] text-on-surface-variant font-mono">Immediate emergency block required</p>
          </Card>

          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-secondary uppercase font-bold tracking-wider">
              MAJOR DEFECTS (48H WINDOW)
            </span>
            <div className="text-3xl font-black font-mono text-secondary">{majorCount}</div>
            <p className="text-[11px] text-on-surface-variant font-mono">Scheduled for bundled shadow blocks</p>
          </Card>

          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-tertiary uppercase font-bold tracking-wider">
              MINOR / ROUTINE REPAIRS
            </span>
            <div className="text-3xl font-black font-mono text-tertiary">{minorCount}</div>
            <p className="text-[11px] text-on-surface-variant font-mono">Routine track maintenance queue</p>
          </Card>

          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-wider">
              AI NLP AUTO-PARSED LOGS
            </span>
            <div className="text-3xl font-black font-mono text-white">100%</div>
            <p className="text-[11px] text-on-surface-variant font-mono">Hindi/English voice reports triaged</p>
          </Card>
        </div>

        {/* Defect Matrix Primary Table Card */}
        <div className="rounded bg-surface-container-low border border-surface-container-high shadow-xl p-1">
          <DefectMatrix
            defects={defects}
            onOpenAIModal={() => setAiModalOpen(true)}
            onRefresh={loadData}
          />
        </div>
      </div>

      {/* Gemini AI Defect Modal */}
      <AIDefectModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onDefectLogged={loadData}
      />
    </>
  );
}
