export type LegacySystem = 'TMS' | 'SMMS' | 'TDMS';
export type Department = 'ENGINEERING' | 'SIGNAL_TELECOM' | 'TRACTION_DISTRIBUTION';
export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR';
export type BlockStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'BURSTED' | 'CANCELLED';
export type UserRole = 'CHIEF_CONTROLLER' | 'TMS_ENGINEER' | 'SMMS_ENGINEER' | 'TDMS_ENGINEER';

export interface TrainTelemetry {
  train_number: string;
  train_name: string;
  train_type: 'RAJDHANI' | 'VANDE_BHARAT' | 'SUPERFAST' | 'FREIGHT' | string;
  priority: number;
  section_id: string;
  line: 'UP' | 'DOWN';
  current_km: number;
  latitude: number;
  longitude: number;
  speed_kmph: number;
  current_station: string;
  delay_minutes: number;
  status: 'ON_TIME' | 'DELAYED' | 'CRITICAL_DELAY';
  updated_at: string;
}

export interface Defect {
  id: string;
  title: string;
  system: LegacySystem;
  department: Department;
  severity: Severity;
  status: 'OPEN' | 'SCHEDULED' | 'IN_PROGRESS' | 'RESOLVED';
  track_section_id: string;
  km_marker: number;
  line: string;
  latitude?: number;
  longitude?: number;
  description: string;
  speed_restriction_kmph?: number;
  estimated_repair_minutes: number;
  machinery_required?: string;
  criticality_score: number;
  has_photo: boolean;
  photo_path?: string;
  created_at: string;
}

export interface MaintenanceBlock {
  id: string;
  block_code: string;
  title: string;
  track_section_id: string;
  line: string;
  division: string;
  start_km: number;
  end_km: number;
  time_window_start: string;
  time_window_end: string;
  duration_minutes: number;
  primary_department: string;
  bundled_departments: string;
  machinery_assigned?: string;
  status: BlockStatus;
  private_number?: string;
  private_number_cancellation?: string;
  protocol_step: number;
  caution_order_issued: boolean;
  ohe_power_isolated: boolean;
  actual_start_time?: string;
  actual_end_time?: string;
  affected_trains?: string;
  optimization_score: number;
  controller_remarks?: string;
  is_joint_bundle?: boolean;
  predicted_duration_mins?: number;
  defects?: Array<{
    id: string;
    title: string;
    department: string;
    severity: string;
    km_marker: number;
  }>;
}

export interface WeatherReport {
  location: string;
  latitude: number;
  longitude: number;
  ambient_temp_c: number;
  estimated_rail_temp_c: number;
  humidity_percent: number;
  wind_speed_kmph: number;
  visibility_meters: number;
  weather_condition: string;
  is_live_source: boolean;
  rail_hazards: {
    track_buckling_risk: 'LOW' | 'MODERATE' | 'HIGH_CRITICAL';
    fog_speed_restriction_active: boolean;
    fog_risk_level: 'NORMAL' | 'MODERATE' | 'SEVERE';
    ohe_wire_sag_risk: 'NORMAL' | 'ELEVATED';
  };
}

export interface ConflictAlert {
  alert_id: string;
  level: 'CRITICAL_BURST' | 'WARNING_BURST_IMMINENT' | 'WARNING_ENCROACHMENT' | 'TIMETABLE_COMPRESSION';
  block_id: string;
  block_code: string;
  train_number?: string;
  train_name?: string;
  message: string;
  recommended_action: string;
  timestamp: string;
}

export interface AIParsedDefectResponse {
  raw_text: string;
  structured_data: {
    title: string;
    system: LegacySystem;
    department: Department;
    severity: Severity;
    km_marker: number;
    line: string;
    speed_restriction_kmph?: number;
    estimated_repair_minutes: number;
    machinery_required: string;
    root_cause_analysis: string;
    safety_precaution: string;
    ai_model_used: string;
  };
  created_defect?: Defect;
}

// Module 1: Network Graph & Trajectory Types
export interface CorridorNode {
  id: string;
  name: string;
  km: number;
  type: string;
  platforms: number;
}

export interface CorridorEdge {
  id: string;
  source: string;
  target: string;
  line_type: string;
  direction: 'UP' | 'DN';
  start_km: number;
  end_km: number;
  length_km: number;
  max_speed_kmh: number;
  status: string;
}

export interface CorridorGraphResponse {
  corridor: string;
  total_length_km: number;
  nodes: CorridorNode[];
  edges: CorridorEdge[];
}

export interface TrainTrajectoryPoint {
  km: number;
  minute: number;
  time_str: string;
  station: string;
}

export interface TrainTrajectory {
  train_id: string;
  name: string;
  direction: 'UP' | 'DN';
  priority: string;
  weight: number;
  color: string;
  points: TrainTrajectoryPoint[];
}

// Module 2: Scikit-Learn Predictive Duration Types
export interface DurationPredictionPayload {
  department: string;
  activity_type: string;
  track_type: string;
  machinery_deployed: string;
  weather_condition: string;
  requested_duration_mins: number;
}

export interface DurationPredictionResponse {
  requested_duration_mins: number;
  predicted_duration_mins: number;
  duration_discrepancy_mins: number;
  overrun_risk_score: number;
  risk_level: 'LOW' | 'MODERATE' | 'CRITICAL';
  recommendation: string;
}

// Module 3: Conflict Types
export interface ConflictItem {
  id: string;
  type: 'TRAIN_STARVATION' | 'INTER_DEPARTMENTAL_OVERLAP' | 'BLOCK_BURST_HAZARD';
  severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY';
  title: string;
  location_km: number;
  end_km: number;
  department: string;
  impacted_trains: string[];
  train_priority_weight?: number;
  estimated_delay_mins: number;
  message: string;
  recommended_action: string;
}

export interface ConflictReport {
  timestamp: string;
  summary: {
    total_conflicts: number;
    critical_conflicts: number;
    total_delay_exposure_mins: number;
    bundling_opportunities_count: number;
  };
  conflicts: ConflictItem[];
  bundling_opportunities: Array<{
    block_a_id: string;
    block_b_id: string;
    dept_a: string;
    dept_b: string;
    distance_km: number;
    time_gap_mins: number;
    synergy_type: string;
    potential_savings_mins: number;
  }>;
}

// Module 4: OR-Tools Optimization Bundle Response
export interface OptimizationBundleResponse {
  blocks: MaintenanceBlock[];
  metrics: {
    total_unbundled_requirement_mins: number;
    actual_bundled_possession_mins: number;
    saved_track_downtime_mins: number;
    downtime_reduction_pct: number;
    train_delay_minutes: number;
    asset_availability_gain_pct: number;
  };
}
