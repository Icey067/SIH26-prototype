export type LegacySystem = 'TMS' | 'SMMS' | 'TDMS';
export type Department = 'ENGINEERING' | 'SIGNAL_TELECOM' | 'TRACTION_DISTRIBUTION';
export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR';
export type BlockStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'BURSTED' | 'CANCELLED';

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
