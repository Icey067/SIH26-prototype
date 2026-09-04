import axios from "axios";
import {
  Defect,
  MaintenanceBlock,
  WeatherReport,
  AIParsedDefectResponse,
  DurationPredictionPayload,
  DurationPredictionResponse,
  ConflictReport,
  CorridorGraphResponse,
  TrainTrajectory,
  OptimizationBundleResponse,
} from "@/types/railway";

const API_BASE_URL = "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const RailwayAPI = {
  // Defects
  async getDefects(params?: { system?: string; department?: string; severity?: string; status?: string }): Promise<Defect[]> {
    const res = await api.get("/defects", { params });
    return res.data;
  },

  async parseDefectWithAI(rawText: string, autoCreate: boolean = false): Promise<AIParsedDefectResponse> {
    const res = await api.post("/defects/ai-parse", {
      raw_text: rawText,
      track_section_id: "NCR-GZB-TDL-UP",
      auto_create: autoCreate,
      reported_by: "DISPATCHER_VOICE_CONSOLE",
    });
    return res.data;
  },

  // Maintenance Blocks
  async getBlocks(status?: string): Promise<MaintenanceBlock[]> {
    const res = await api.get("/blocks", { params: { status } });
    return res.data;
  },

  async createBlock(blockPayload: Partial<MaintenanceBlock>): Promise<MaintenanceBlock> {
    const res = await api.post("/blocks", blockPayload);
    return res.data;
  },

  async approveBlock(blockId: string, privateNumber: string, remarks?: string): Promise<MaintenanceBlock> {
    const res = await api.post(`/blocks/${blockId}/approve`, {
      private_number: privateNumber,
      controller_remarks: remarks || "Granted via Control Room Console",
      caution_order_issued: true,
      ohe_power_isolated: true,
    });
    return res.data;
  },

  async concurBlockByStationMaster(blockId: string, smPrivateNumber: string, stationId: string, remarks?: string): Promise<MaintenanceBlock> {
    const res = await api.post(`/blocks/${blockId}/station-master-concur`, {
      station_master_private_number: smPrivateNumber,
      station_id: stationId,
      station_master_remarks: remarks || "Point interlocked & route isolated.",
    });
    return res.data;
  },

  async emergencyRevokeBlock(blockId: string, reason: string, pncNumber: string): Promise<MaintenanceBlock> {
    const res = await api.post(`/blocks/${blockId}/emergency-revoke`, {
      revocation_reason: reason,
      private_number_cancellation: pncNumber,
      order_caution_on_adjacent: true,
    });
    return res.data;
  },

  async reportMachineIncident(blockId: string, machineId: string, km: number, details?: string): Promise<MaintenanceBlock> {
    const res = await api.post(`/blocks/${blockId}/report-incident`, {
      machinery_id: machineId,
      incident_type: "MACHINE_BREAKDOWN",
      current_km: km,
      track_obstructed: true,
      relief_loco_required: true,
      details: details || "Mid-transit machinery engine failure reported.",
    });
    return res.data;
  },

  async updateProtocolStep(blockId: string, step: number, status?: string): Promise<MaintenanceBlock> {
    const res = await api.post(`/blocks/${blockId}/protocol`, {
      protocol_step: step,
      status: status,
    });
    return res.data;
  },

  async runBlockOptimization(trackSectionId = "NCR-GZB-TDL-UP", line = "UP", saveToDb = false): Promise<MaintenanceBlock[]> {
    const res = await api.post("/blocks/optimize/generate", null, {
      params: { track_section_id: trackSectionId, line, save_to_db: saveToDb },
    });
    return res.data;
  },

  async runOptimizationBundle(trackSectionId = "NCR-GZB-TDL-UP", line = "UP"): Promise<OptimizationBundleResponse> {
    const res = await api.post("/blocks/optimize/bundle", null, {
      params: { track_section_id: trackSectionId, line },
    });
    return res.data;
  },

  // Module 1: Network Graph & Trajectories
  async getCorridorGraph(): Promise<CorridorGraphResponse> {
    const res = await api.get("/network/graph");
    return res.data;
  },

  async getTrainTrajectories(): Promise<TrainTrajectory[]> {
    const res = await api.get("/network/trajectories");
    return res.data.trajectories || [];
  },

  // Module 2: Scikit-Learn Predictive Duration & Overrun Risk
  async predictDurationAndRisk(payload: DurationPredictionPayload): Promise<DurationPredictionResponse> {
    const res = await api.post("/predict/duration-and-risk", payload);
    return res.data;
  },

  // Module 3: Conflict Detection
  async detectConflicts(blocks: any[]): Promise<ConflictReport> {
    const res = await api.post("/conflicts/detect", { blocks });
    return res.data;
  },

  async getActiveConflicts(): Promise<ConflictReport> {
    const res = await api.get("/conflicts/active");
    return res.data;
  },

  // Live Telemetry & Weather
  async getLiveTelemetry() {
    const res = await api.get("/live/telemetry");
    return res.data;
  },

  async getLiveWeather(): Promise<WeatherReport> {
    const res = await api.get("/live/weather");
    return res.data;
  },

  // Timetable
  async getTimetableGaps(sectionId = "NCR-GZB-TDL-UP", line = "UP") {
    const res = await api.get("/timetable/gaps", {
      params: { track_section_id: sectionId, line, min_gap_minutes: 60 },
    });
    return res.data;
  },
};
