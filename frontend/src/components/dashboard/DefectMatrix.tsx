import { useState } from "react";
import { Defect } from "@/types/railway";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DefectMatrixProps {
  defects: Defect[];
  onOpenAIModal: () => void;
}

export const DefectMatrix: React.FC<DefectMatrixProps> = ({ defects, onOpenAIModal }) => {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredDefects = defects.filter((d) => {
    const matchesTab =
      activeTab === "ALL" ||
      (activeTab === "TMS" && d.system === "TMS") ||
      (activeTab === "SMMS" && d.system === "SMMS") ||
      (activeTab === "TDMS" && d.system === "TDMS");

    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.km_marker.toString().includes(searchQuery);

    return matchesTab && matchesSearch;
  });

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-5 shadow-xl backdrop-blur-md">
      {/* Header & Department Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Wrench className="h-4 w-4 text-blue-400" />
            Unified Defect Triage & Maintenance Backlog
          </h3>
          <p className="text-xs text-gray-400">
            Ingested records from legacy Indian Railways TMS, SMMS, and TDMS databases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search defects, Km, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 px-3 rounded-md bg-gray-950 border border-gray-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <Button
            onClick={onOpenAIModal}
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Log via AI
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
        <TabsList className="bg-gray-950 border border-gray-800">
          <TabsTrigger value="ALL">All Departments ({defects.length})</TabsTrigger>
          <TabsTrigger value="TMS" className="text-blue-400">
            TMS Track ({defects.filter((d) => d.system === "TMS").length})
          </TabsTrigger>
          <TabsTrigger value="SMMS" className="text-emerald-400">
            SMMS Signals ({defects.filter((d) => d.system === "SMMS").length})
          </TabsTrigger>
          <TabsTrigger value="TDMS" className="text-purple-400">
            TDMS Traction ({defects.filter((d) => d.system === "TDMS").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-lg border border-gray-800 bg-gray-950 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Defect Description</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>TSR (Speed Limit)</TableHead>
              <TableHead>Machinery</TableHead>
              <TableHead className="text-right">Risk Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDefects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-gray-500 text-xs">
                  No maintenance defects found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredDefects.map((defect) => {
                const isCritical = defect.severity === "CRITICAL";
                const isTms = defect.system === "TMS";
                const isSmms = defect.system === "SMMS";

                return (
                  <TableRow key={defect.id} className={isCritical ? "bg-red-950/20" : ""}>
                    <TableCell className="font-mono text-xs font-bold text-gray-300">
                      {defect.id}
                    </TableCell>

                    <TableCell>
                      <div className="font-medium text-xs text-white line-clamp-1">{defect.title}</div>
                      <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{defect.description}</div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={isTms ? "tms" : isSmms ? "smms" : "tdms"}>
                        {defect.system}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs text-gray-300 font-mono">
                      Km {defect.km_marker.toFixed(1)} ({defect.line})
                    </TableCell>

                    <TableCell>
                      <Badge variant={isCritical ? "critical" : defect.severity === "MAJOR" ? "warning" : "secondary"}>
                        {defect.severity}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs">
                      {defect.speed_restriction_kmph ? (
                        <span className="font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800 text-[11px]">
                          {defect.speed_restriction_kmph} km/h
                        </span>
                      ) : (
                        <span className="text-gray-500 text-[11px]">Normal</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-gray-400">
                      {defect.machinery_required || "Manual Gang"}
                    </TableCell>

                    <TableCell className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-black font-mono ${
                        defect.criticality_score >= 80
                          ? "bg-red-900/60 text-red-300 border border-red-700"
                          : defect.criticality_score >= 60
                          ? "bg-amber-900/60 text-amber-300 border border-amber-700"
                          : "bg-gray-800 text-gray-300"
                      }`}>
                        {defect.criticality_score.toFixed(0)}/100
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
