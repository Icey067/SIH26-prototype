import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MaintenanceBlock } from "@/types/railway";
import { RailwayAPI } from "@/services/api";
import { ShieldCheck } from "lucide-react";

interface BlockGrantModalProps {
  block: MaintenanceBlock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlockGranted: () => void;
}

export const BlockGrantModal: React.FC<BlockGrantModalProps> = ({
  block,
  open,
  onOpenChange,
  onBlockGranted,
}) => {
  if (!block) return null;

  // Auto-generate realistic Indian Railways Section Controller Private Number
  const [privateNumber, setPrivateNumber] = useState(
    block.private_number || `PN-NCR-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [remarks, setRemarks] = useState(
    block.controller_remarks || "Granted during natural gap between Shatabdi and Mahabodhi. Caution Order 30 kmph enforced on adjacent line."
  );
  const [cautionIssued, setCautionIssued] = useState(true);
  const [oheIsolated, setOheIsolated] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleGrant = async () => {
    setLoading(true);
    try {
      await RailwayAPI.approveBlock(block.id, privateNumber, remarks);
      onBlockGranted();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to grant block:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gray-950 border-gray-800 text-gray-100">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Section Controller Block Grant
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-400">
                Official permit to work (PTW) exchange for {block.block_code}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Block Summary Details */}
        <div className="space-y-3 mt-2 text-xs">
          <div className="p-3 rounded-lg bg-gray-900 border border-gray-800 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-400">Block Code:</span>
              <strong className="text-white font-mono">{block.block_code}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Track Territory:</span>
              <strong className="text-cyan-300">Km {block.start_km} - {block.end_km} ({block.line} Line)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Duration Granted:</span>
              <strong className="text-emerald-400">{block.duration_minutes} Minutes</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bundled Departments:</span>
              <strong className="text-amber-300">{block.bundled_departments}</strong>
            </div>
          </div>

          {/* Private Number Input */}
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">
              Official Private Number (PTW Exchange):
            </label>
            <input
              type="text"
              value={privateNumber}
              onChange={(e) => setPrivateNumber(e.target.value)}
              className="w-full h-9 rounded-lg border border-gray-800 bg-gray-900 px-3 text-sm font-mono text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Safety Protocols Checklist */}
          <div className="space-y-2 pt-2 border-t border-gray-800">
            <span className="text-[11px] font-bold text-white block">Mandatory Safety Protocols:</span>

            <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={cautionIssued}
                onChange={(e) => setCautionIssued(e.target.checked)}
                className="rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-0"
              />
              <span>Caution Order & Speed Restrictions (TSR) issued to adjacent stations</span>
            </label>

            <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={oheIsolated}
                onChange={(e) => setOheIsolated(e.target.checked)}
                className="rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-0"
              />
              <span>25kV OHE Power Block isolated with TPC (Traction Power Controller)</span>
            </label>
          </div>

          {/* Controller Remarks */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Controller Remarks / Train Regulations:</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 p-2 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleGrant}
            disabled={loading || !privateNumber.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5"
          >
            {loading ? "Granting Block..." : "Grant Block & Exchange PN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
