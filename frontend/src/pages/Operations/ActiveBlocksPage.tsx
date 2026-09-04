import { useState, useEffect } from "react";
import PageMeta from "@/components/common/PageMeta";
import { ActiveBlocksCard } from "@/components/dashboard/ActiveBlocksCard";
import { BlockGrantModal } from "@/components/dashboard/BlockGrantModal";
import { BlockRequestModal } from "@/components/dashboard/BlockRequestModal";
import { RailwayAPI } from "@/services/api";
import { MaintenanceBlock } from "@/types/railway";
import { Box, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ActiveBlocksPage() {
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [grantModalOpen, setGrantModalOpen] = useState<boolean>(false);
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
  const [selectedBlockForGrant, setSelectedBlockForGrant] = useState<MaintenanceBlock | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await RailwayAPI.getBlocks();
      if (data) setBlocks(data);
    } catch (err) {
      console.error("Error loading active blocks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <PageMeta
        title="Active Blocks & Possession Cockpit | Samanvay-AI"
        description="Live Railway Maintenance Possession Control, Shadow Block Bundling, and Private Number Authorization."
      />

      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded bg-surface-container-lowest border border-surface-container-high text-on-surface">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-primary" />
              <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>ACTIVE MAINTENANCE POSSESSIONS</span>
                <span className="text-zinc-600">//</span>
                <span className="text-primary font-mono text-xs">TMS • SMMS • TDMS COCKPIT</span>
              </h1>
            </div>
            <p className="font-mono text-xs text-on-surface-variant">
              MULTI-DEPARTMENT SHADOW BLOCK ALLOCATION & SECTION CONTROLLER AUTHORIZATION
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setRequestModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-on-primary font-mono text-xs font-bold gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>REQUEST NEW BLOCK</span>
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

        {/* Executive Summary Telemetry Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-wider">
              ACTIVE GRANTED BLOCKS
            </span>
            <div className="text-3xl font-black font-mono text-white">
              {blocks.filter((b) => b.status === "APPROVED" || b.status === "CONTROLLER_APPROVED" || b.status === "IN_PROGRESS").length}
            </div>
            <p className="text-[11px] text-on-surface-variant font-mono">Live possession on trunk lines</p>
          </Card>

          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-secondary uppercase font-bold tracking-wider">
              PENDING SECTION CONTROLLER PN
            </span>
            <div className="text-3xl font-black font-mono text-secondary">
              {blocks.filter((b) => b.status === "REQUESTED" || b.status === "PENDING" || b.status === "DRAFT").length}
            </div>
            <p className="text-[11px] text-on-surface-variant font-mono">Requires Private Number exchange</p>
          </Card>

          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-tertiary uppercase font-bold tracking-wider">
              SHADOW BUNDLED HOURS
            </span>
            <div className="text-3xl font-black font-mono text-tertiary">
              18.5 HRS
            </div>
            <p className="text-[11px] text-on-surface-variant font-mono">Unused timetable margin captured</p>
          </Card>

          <Card className="bg-surface-container-low border-surface-container-high text-on-surface p-4 flex flex-col gap-1">
            <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-wider">
              BURST AVOIDANCE RATE
            </span>
            <div className="text-3xl font-black font-mono text-white">
              99.2%
            </div>
            <p className="text-[11px] text-on-surface-variant font-mono">Predictive ML duration safety margin</p>
          </Card>
        </div>

        {/* Primary Active Blocks Table Card */}
        <div className="rounded bg-surface-container-low border border-surface-container-high shadow-xl p-1">
          <ActiveBlocksCard
            blocks={blocks}
            onRefresh={loadData}
          />
        </div>
      </div>

      {/* Grant Modal */}
      {selectedBlockForGrant && (
        <BlockGrantModal
          block={selectedBlockForGrant}
          open={grantModalOpen}
          onOpenChange={(open) => {
            setGrantModalOpen(open);
            if (!open) {
              setSelectedBlockForGrant(null);
            }
          }}
          onBlockGranted={() => {
            setGrantModalOpen(false);
            setSelectedBlockForGrant(null);
            loadData();
          }}
        />
      )}

      {/* Request Modal */}
      <BlockRequestModal
        open={requestModalOpen}
        onOpenChange={(open) => {
          setRequestModalOpen(open);
          if (!open) {
            loadData();
          }
        }}
        onBlockCreated={() => {
          setRequestModalOpen(false);
          loadData();
        }}
      />
    </>
  );
}

