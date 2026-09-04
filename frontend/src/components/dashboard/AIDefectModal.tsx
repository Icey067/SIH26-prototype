import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RailwayAPI } from "@/services/api";
import { AIParsedDefectResponse } from "@/types/railway";
import { Sparkles, Bot, ShieldCheck, Check, Loader2 } from "lucide-react";

interface AIDefectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDefectCreated?: () => void;
}

const SAMPLE_PROMPTS = [
  "Aligarh yard ke paas switch point 204 me relay flutter ho rahi hai aur contact wire loose hai. 30 ka TSR lagana padega.",
  "USFD testing found IMR rail flaw at Km 88/14 near Hathras. Emergency clamp applied, immediate rail renewal required.",
  "Cantilever insulator flashing at Km 91/14 Daud Khan during morning fog. OHE power tripping."
];

export const AIDefectModal: React.FC<AIDefectModalProps> = ({
  open,
  onOpenChange,
  onDefectCreated
}) => {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIParsedDefectResponse | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleParse = async (autoSave: boolean = false) => {
    if (!inputText.trim()) return;
    setLoading(true);
    setSavedSuccess(false);

    try {
      const res = await RailwayAPI.parseDefectWithAI(inputText, autoSave);
      setResult(res);
      if (autoSave) {
        setSavedSuccess(true);
        if (onDefectCreated) onDefectCreated();
      }
    } catch (err) {
      console.error("AI parse failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToBacklog = async () => {
    if (!inputText.trim()) return;
    await handleParse(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-950 border-gray-800 text-gray-100">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-purple-950/80 border border-purple-800">
              <Bot className="h-5 w-5 text-purple-300" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Autonomous AI Defect Triage Engine
                <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-purple-900/60 border border-purple-700 text-purple-300">
                  Multilingual NLP
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                Paste noisy field engineer notes or voice transcripts in English, Hindi, or Hinglish.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Input Section */}
        <div className="space-y-3 mt-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={4}
            placeholder="Type or paste field report... (e.g. 'Aligarh yard me point machine current high le rahi hai aur 30 ka TSR zaroori hai')"
            className="w-full rounded-lg border border-gray-800 bg-gray-900 p-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
          />

          {/* Quick sample chips */}
          <div>
            <span className="text-[11px] text-gray-500 block mb-1.5 font-mono">Sample Field Notes:</span>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInputText(prompt)}
                  className="text-left text-[11px] text-gray-400 bg-gray-900/80 hover:bg-gray-800 p-2 rounded border border-gray-800 hover:border-gray-700 truncate transition-all"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>

          {/* Analyze Action */}
          <div className="flex justify-end">
            <Button
              onClick={() => handleParse(false)}
              disabled={loading || !inputText.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading ? "Analyzing field telemetry..." : "Extract & Classify Defect"}
            </Button>
          </div>
        </div>

        {/* AI Structured Result Preview */}
        {result && (
          <div className="mt-4 p-4 rounded-xl border border-gray-800 bg-gray-900/90 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Structured Extraction
              </span>
              <span className="text-[10px] font-mono text-purple-300">
                Engine: Samanvay Neural Core v4.2
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-gray-950 border border-gray-800">
                <span className="text-gray-500 block text-[10px]">Legacy System</span>
                <Badge variant={result.structured_data.system === 'TMS' ? 'tms' : result.structured_data.system === 'SMMS' ? 'smms' : 'tdms'} className="mt-1">
                  {result.structured_data.system}
                </Badge>
              </div>

              <div className="p-2 rounded bg-gray-950 border border-gray-800">
                <span className="text-gray-500 block text-[10px]">Severity Rank</span>
                <Badge variant={result.structured_data.severity === 'CRITICAL' ? 'critical' : 'warning'} className="mt-1">
                  {result.structured_data.severity}
                </Badge>
              </div>

              <div className="p-2 rounded bg-gray-950 border border-gray-800">
                <span className="text-gray-500 block text-[10px]">Location</span>
                <strong className="text-white block mt-1">Km {result.structured_data.km_marker}</strong>
              </div>

              <div className="p-2 rounded bg-gray-950 border border-gray-800">
                <span className="text-gray-500 block text-[10px]">Recommended TSR</span>
                <strong className="text-amber-400 block mt-1">
                  {result.structured_data.speed_restriction_kmph ? `${result.structured_data.speed_restriction_kmph} km/h` : "None"}
                </strong>
              </div>
            </div>

            {/* Title & Machinery */}
            <div className="text-xs text-gray-300 space-y-1">
              <div><strong>Title:</strong> {result.structured_data.title}</div>
              <div><strong>Machinery Required:</strong> <span className="text-cyan-300">{result.structured_data.machinery_required}</span></div>
            </div>

            {/* Root Cause & Safety */}
            <div className="text-xs space-y-2 pt-2 border-t border-gray-800">
              <div className="p-2.5 rounded bg-blue-950/40 border border-blue-900/50 text-blue-200">
                <strong className="block text-[10px] text-blue-400 uppercase font-mono mb-0.5">AI Root-Cause Rationale:</strong>
                {result.structured_data.root_cause_analysis}
              </div>

              <div className="p-2.5 rounded bg-amber-950/40 border border-amber-900/50 text-amber-200">
                <strong className="block text-[10px] text-amber-400 uppercase font-mono mb-0.5">Mandatory Safety Checklist:</strong>
                {result.structured_data.safety_precaution}
              </div>
            </div>

            {savedSuccess ? (
              <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-1.5 font-semibold">
                <Check className="h-4 w-4" />
                Defect ticket successfully registered in TMS/SMMS backlog!
              </div>
            ) : (
              <Button
                onClick={handleSaveToBacklog}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs mt-2"
              >
                Register into Live Railway Backlog
              </Button>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
