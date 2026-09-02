import os
import sys
import datetime
import uuid

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.core.database import SessionLocal, Base, engine
from app.models.track_section import TrackSection
from app.models.user import User, UserRole
from app.models.defect import Defect, Department, Severity, LegacySystem, DefectStatus, SyncStatus
from app.models.timetable import TrainSchedule, TrainType
from app.models.block import MaintenanceBlock, BlockDefectAssociation, BlockStatus
from app.services.defect_scorer import DefectScorer

def seed_database():
    print("[INIT] Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(TrackSection).count() > 0:
            print("ℹ️ Database already contains data. Clearing existing records for clean refresh...")
            db.query(BlockDefectAssociation).delete()
            db.query(MaintenanceBlock).delete()
            db.query(Defect).delete()
            db.query(TrainSchedule).delete()
            db.query(User).delete()
            db.query(TrackSection).delete()
            db.commit()

        print("🛤️ Seeding Track Sections (High-Density Golden Corridor)...")
        sections = [
            TrackSection(
                id="NCR-GZB-TDL-UP",
                division="Prayagraj (NCR)",
                section_name="Ghaziabad - Tundla (UP Main)",
                line_type="UP",
                start_km=15.0,
                end_km=205.0,
                station_start="GZB",
                station_end="TDL",
                max_permissible_speed=130,
                is_electrified=True,
                ohe_voltage_kv=25.0
            ),
            TrackSection(
                id="NCR-GZB-TDL-DN",
                division="Prayagraj (NCR)",
                section_name="Tundla - Ghaziabad (DOWN Main)",
                line_type="DOWN",
                start_km=205.0,
                end_km=15.0,
                station_start="TDL",
                station_end="GZB",
                max_permissible_speed=130,
                is_electrified=True,
                ohe_voltage_kv=25.0
            ),
            TrackSection(
                id="NCR-TDL-CNB-UP",
                division="Prayagraj (NCR)",
                section_name="Tundla - Kanpur (UP Main)",
                line_type="UP",
                start_km=205.0,
                end_km=440.0,
                station_start="TDL",
                station_end="CNB",
                max_permissible_speed=130,
                is_electrified=True,
                ohe_voltage_kv=25.0
            ),
            TrackSection(
                id="NCR-TDL-CNB-DN",
                division="Prayagraj (NCR)",
                section_name="Kanpur - Tundla (DOWN Main)",
                line_type="DOWN",
                start_km=440.0,
                end_km=205.0,
                station_start="CNB",
                station_end="TDL",
                max_permissible_speed=130,
                is_electrified=True,
                ohe_voltage_kv=25.0
            )
        ]
        db.add_all(sections)
        db.commit()

        print("👤 Seeding Users & Departmental Roles...")
        users = [
            User(
                id="USR-DISP-01",
                username="controller.prayagraj",
                email="section.controller@ncr.railnet.gov.in",
                full_name="Rajesh Verma (Chief Controller)",
                role=UserRole.SECTION_CONTROLLER,
                department="OPERATING",
                division="Prayagraj (NCR)"
            ),
            User(
                id="USR-ENG-01",
                username="den.track.aligarh",
                email="den.track@ncr.railnet.gov.in",
                full_name="Amitabh Saxena (Sr. DEN Track)",
                role=UserRole.ENG_OFFICER,
                department="ENG",
                division="Prayagraj (NCR)"
            ),
            User(
                id="USR-ST-01",
                username="dste.signal.tundla",
                email="dste.signal@ncr.railnet.gov.in",
                full_name="Priya Nair (DSTE Signal & Telecom)",
                role=UserRole.ST_OFFICER,
                department="S&T",
                division="Prayagraj (NCR)"
            ),
            User(
                id="USR-TRD-01",
                username="deetr.ohe.aligarh",
                email="deetr.ohe@ncr.railnet.gov.in",
                full_name="Sunil Kumar (DEE TRD)",
                role=UserRole.TRD_OFFICER,
                department="TRD",
                division="Prayagraj (NCR)"
            ),
            User(
                id="USR-FIELD-01",
                username="sse.pway.hathras",
                email="sse.pway.hathras@ncr.railnet.gov.in",
                full_name="Vikram Singh (SSE P-Way)",
                role=UserRole.FIELD_ENGINEER,
                department="ENG",
                division="Prayagraj (NCR)"
            )
        ]
        db.add_all(users)
        db.commit()

        print("🚆 Seeding Train Schedules (COA Timetable with Priority & Transit Slots)...")
        train_schedules = [
            # UP Line (Delhi towards Kanpur/Howrah)
            TrainSchedule(
                id="SCH-22436",
                train_number="22436",
                train_name="Vande Bharat Express (NDLS-BSB)",
                train_type=TrainType.VANDE_BHARAT,
                priority_rank=1,
                track_section_id="NCR-GZB-TDL-UP",
                line="UP",
                origin_station="NDLS",
                destination_station="BSB",
                entry_time=datetime.time(6, 45),
                exit_time=datetime.time(8, 20),
                transit_duration_minutes=95
            ),
            TrainSchedule(
                id="SCH-12004",
                train_number="12004",
                train_name="Lucknow Swarna Shatabdi",
                train_type=TrainType.SUPERFAST,
                priority_rank=2,
                track_section_id="NCR-GZB-TDL-UP",
                line="UP",
                origin_station="NDLS",
                destination_station="LKO",
                entry_time=datetime.time(8, 45),
                exit_time=datetime.time(10, 30),
                transit_duration_minutes=105
            ),
            # GAP 1: 10:30 to 12:45 (~135 mins natural window)
            TrainSchedule(
                id="SCH-12398",
                train_number="12398",
                train_name="Mahabodhi Express",
                train_type=TrainType.SUPERFAST,
                priority_rank=3,
                track_section_id="NCR-GZB-TDL-UP",
                line="UP",
                origin_station="NDLS",
                destination_station="GAYA",
                entry_time=datetime.time(12, 45),
                exit_time=datetime.time(14, 35),
                transit_duration_minutes=110
            ),
            # GAP 2: 14:35 to 16:30 (~115 mins natural window)
            TrainSchedule(
                id="SCH-12424",
                train_number="12424",
                train_name="Dibrugarh Rajdhani Express",
                train_type=TrainType.RAJDHANI,
                priority_rank=1,
                track_section_id="NCR-GZB-TDL-UP",
                line="UP",
                origin_station="NDLS",
                destination_station="DBRG",
                entry_time=datetime.time(16, 30),
                exit_time=datetime.time(18, 0),
                transit_duration_minutes=90
            ),
            TrainSchedule(
                id="SCH-12302",
                train_number="12302",
                train_name="Howrah Rajdhani Express",
                train_type=TrainType.RAJDHANI,
                priority_rank=1,
                track_section_id="NCR-GZB-TDL-UP",
                line="UP",
                origin_station="NDLS",
                destination_station="HWH",
                entry_time=datetime.time(18, 15),
                exit_time=datetime.time(19, 45),
                transit_duration_minutes=90
            ),
            TrainSchedule(
                id="SCH-12560",
                train_number="12560",
                train_name="Shiv Ganga Express",
                train_type=TrainType.SUPERFAST,
                priority_rank=2,
                track_section_id="NCR-GZB-TDL-UP",
                line="UP",
                origin_station="NDLS",
                destination_station="BSBS",
                entry_time=datetime.time(20, 30),
                exit_time=datetime.time(22, 15),
                transit_duration_minutes=105
            ),
            TrainSchedule(
                id="SCH-12418",
                train_number="12418",
                train_name="Prayagraj Express",
                train_type=TrainType.SUPERFAST,
                priority_rank=2,
                track_section_id="NCR-GZB-TDL-UP",
                line="UP",
                origin_station="NDLS",
                destination_station="PRYJ",
                entry_time=datetime.time(22, 30),
                exit_time=datetime.time(0, 15),
                transit_duration_minutes=105
            ),
            # Night Freight Slots
            TrainSchedule(
                id="SCH-FRT-01",
                train_number="BTPN-6602",
                train_name="Petroleum Tanker Rake (Mathura-Kanpur)",
                train_type=TrainType.FREIGHT_CONTAINER,
                priority_rank=5,
                track_section_id="NCR-GZB-TDL-UP",
                line="UP",
                origin_station="MTJ",
                destination_station="CNB",
                entry_time=datetime.time(2, 0),
                exit_time=datetime.time(4, 0),
                transit_duration_minutes=120
            ),
            TrainSchedule(
                id="SCH-FRT-02",
                train_number="BOXN-9912",
                train_name="Dadri Thermal Coal Rake",
                train_type=TrainType.FREIGHT_COAL,
                priority_rank=5,
                track_section_id="NCR-GZB-TDL-UP",
                line="UP",
                origin_station="GZB",
                destination_station="DER",
                entry_time=datetime.time(4, 15),
                exit_time=datetime.time(6, 0),
                transit_duration_minutes=105
            )
        ]
        db.add_all(train_schedules)
        db.commit()

        print("🔧 Seeding Ingested Defects from TMS, SMMS & TDMS...")
        raw_defects = [
            # TMS (Track) Defects
            {
                "id": "DEF-TMS-1001",
                "title": "USFD Flaw (IMR - Immediate Rail Removal) detected at Km 88/14",
                "system": LegacySystem.TMS,
                "department": Department.ENGINEERING,
                "severity": Severity.CRITICAL,
                "track_section_id": "NCR-GZB-TDL-UP",
                "km_marker": 88.35,
                "line": "UP",
                "latitude": 27.8921,
                "longitude": 77.9854,
                "description": "Ultrasonic flaw testing revealed transverse fissure > 25mm on gauge face. Emergency clamp fitted. Requires immediate rail piece renewal.",
                "speed_restriction_kmph": 30,
                "estimated_repair_minutes": 75,
                "machinery_required": "RAIL_CUTTER_TENSOR"
            },
            {
                "id": "DEF-TMS-1002",
                "title": "Weld Fracture crack at Km 91/02 between Aligarh & Daud Khan",
                "system": LegacySystem.TMS,
                "department": Department.ENGINEERING,
                "severity": Severity.CRITICAL,
                "track_section_id": "NCR-GZB-TDL-UP",
                "km_marker": 91.05,
                "line": "UP",
                "latitude": 27.8745,
                "longitude": 78.0123,
                "description": "Thermmit weld hairline crack observed under cold wave condition. Jogoggled fishplate applied with clamps.",
                "speed_restriction_kmph": 30,
                "estimated_repair_minutes": 90,
                "machinery_required": "FLASH_BUTT_WELDING"
            },
            {
                "id": "DEF-TMS-1003",
                "title": "Ballast Cushion Clogging & Poor Drainage at Km 89/10-90/20",
                "system": LegacySystem.TMS,
                "department": Department.ENGINEERING,
                "severity": Severity.MAJOR,
                "track_section_id": "NCR-GZB-TDL-UP",
                "km_marker": 89.8,
                "line": "UP",
                "latitude": 27.8812,
                "longitude": 77.9982,
                "description": "Dirty ballast cushion exceeding 300m length causing pumping sleepers. Requires Ballast Cleaning Machine (BCM) deployment.",
                "speed_restriction_kmph": 50,
                "estimated_repair_minutes": 120,
                "machinery_required": "BCM"
            },
            {
                "id": "DEF-TMS-1004",
                "title": "Turnout Switch Rail Tongue Wear at Aligarh Junction Point 204",
                "system": LegacySystem.TMS,
                "department": Department.ENGINEERING,
                "severity": Severity.MAJOR,
                "track_section_id": "NCR-GZB-TDL-UP",
                "km_marker": 86.5,
                "line": "UP",
                "latitude": 27.9015,
                "longitude": 77.9710,
                "description": "Chipping and vertical wear on switch rail exceeding 8mm permissible limit.",
                "speed_restriction_kmph": 45,
                "estimated_repair_minutes": 60,
                "machinery_required": "UNIMAT"
            },
            # SMMS (Signaling) Defects
            {
                "id": "DEF-SMMS-2001",
                "title": "Point Machine 204B Over-current & Detection Glitch at Aligarh",
                "system": LegacySystem.SMMS,
                "department": Department.SIGNAL_TELECOM,
                "severity": Severity.CRITICAL,
                "track_section_id": "NCR-GZB-TDL-UP",
                "km_marker": 86.6,
                "line": "UP",
                "latitude": 27.9020,
                "longitude": 77.9715,
                "description": "Siemens electric point machine drawing 4.8A during reverse operation. Clutch slipping observed. Intermittent route lock failure.",
                "speed_restriction_kmph": None,
                "estimated_repair_minutes": 45,
                "machinery_required": "MANUAL_S&T_CREW"
            },
            {
                "id": "DEF-SMMS-2002",
                "title": "Dual Track Circuit 89T Intermittent Dropping / Glitch",
                "system": LegacySystem.SMMS,
                "department": Department.SIGNAL_TELECOM,
                "severity": Severity.MAJOR,
                "track_section_id": "NCR-GZB-TDL-UP",
                "km_marker": 89.2,
                "line": "UP",
                "latitude": 27.8860,
                "longitude": 77.9910,
                "description": "DC track circuit relay fluttering due to ballast resistance dropping below 2 ohms/km.",
                "speed_restriction_kmph": None,
                "estimated_repair_minutes": 60,
                "machinery_required": "MANUAL_S&T_CREW"
            },
            {
                "id": "DEF-SMMS-2003",
                "title": "Axle Counter Track Sensor Alignment Drifting at Hathras Jn",
                "system": LegacySystem.SMMS,
                "department": Department.SIGNAL_TELECOM,
                "severity": Severity.MAJOR,
                "track_section_id": "NCR-GZB-TDL-UP",
                "km_marker": 124.8,
                "line": "UP",
                "latitude": 27.5980,
                "longitude": 78.0512,
                "description": "High-frequency wheel sensor showing 1.2mm vertical deflection. Needs recalibration.",
                "speed_restriction_kmph": 75,
                "estimated_repair_minutes": 45,
                "machinery_required": "MANUAL_S&T_CREW"
            },
            # TDMS (Traction / OHE) Defects
            {
                "id": "DEF-TDMS-3001",
                "title": "OHE Contact Wire Diameter Reduction (<74 sq mm) at Km 89/18",
                "system": LegacySystem.TDMS,
                "department": Department.TRACTION_DISTRIBUTION,
                "severity": Severity.CRITICAL,
                "track_section_id": "NCR-GZB-TDL-UP",
                "km_marker": 89.6,
                "line": "UP",
                "latitude": 27.8835,
                "longitude": 77.9940,
                "description": "Excessive wear recorded on 107 sq mm copper contact wire due to heavy pantograph passage. Wire replacement required before snapping.",
                "speed_restriction_kmph": 60,
                "estimated_repair_minutes": 90,
                "machinery_required": "TOWER_WAGON"
            },
            {
                "id": "DEF-TDMS-3002",
                "title": "Cantilever 9-Tonne Porcelain Insulator Flashover at Km 91/14",
                "system": LegacySystem.TDMS,
                "department": Department.TRACTION_DISTRIBUTION,
                "severity": Severity.MAJOR,
                "track_section_id": "NCR-GZB-TDL-UP",
                "km_marker": 91.4,
                "line": "UP",
                "latitude": 27.8710,
                "longitude": 78.0160,
                "description": "Micro-cracks and pollution deposit on stay insulator. Tripping recorded during morning fog.",
                "speed_restriction_kmph": None,
                "estimated_repair_minutes": 60,
                "machinery_required": "TOWER_WAGON"
            },
            {
                "id": "DEF-TDMS-3003",
                "title": "Neutral Section PTFE Runner Wear at Km 140/04",
                "system": LegacySystem.TDMS,
                "department": Department.TRACTION_DISTRIBUTION,
                "severity": Severity.MAJOR,
                "track_section_id": "NCR-GZB-TDL-UP",
                "km_marker": 140.1,
                "line": "UP",
                "latitude": 27.4210,
                "longitude": 78.1120,
                "description": "PTFE gliding runner worn past 3mm threshold. Needs replacement to prevent loco pantograph entrapment.",
                "speed_restriction_kmph": 90,
                "estimated_repair_minutes": 75,
                "machinery_required": "TOWER_WAGON"
            }
        ]

        defects_to_add = []
        for d in raw_defects:
            score = DefectScorer.calculate_criticality(
                severity=d["severity"],
                system=d["system"],
                speed_restriction_kmph=d["speed_restriction_kmph"],
                estimated_repair_minutes=d["estimated_repair_minutes"],
                age_days=3
            )
            defect_obj = Defect(
                id=d["id"],
                title=d["title"],
                system=d["system"],
                department=d["department"],
                severity=d["severity"],
                status=DefectStatus.OPEN,
                track_section_id=d["track_section_id"],
                km_marker=d["km_marker"],
                line=d["line"],
                latitude=d["latitude"],
                longitude=d["longitude"],
                description=d["description"],
                speed_restriction_kmph=d["speed_restriction_kmph"],
                estimated_repair_minutes=d["estimated_repair_minutes"],
                machinery_required=d["machinery_required"],
                criticality_score=score,
                has_photo=True,
                photo_path=f"/media/defects/{d['id']}.jpg",
                sync_status=SyncStatus.SYNCED,
                reported_by="SYSTEM_INGEST"
            )
            defects_to_add.append(defect_obj)

        db.add_all(defects_to_add)
        db.commit()

        print("📦 Seeding Bundled Maintenance Block (Track + Signal + OHE Joint Window)...")
        # Notice that Km 86 to Km 92 has defects across ALL 3 DEPARTMENTS:
        # - TMS: Km 86.5, 88.35, 89.8, 91.05
        # - SMMS: Km 86.6, 89.2
        # - TDMS: Km 89.6, 91.4
        # This is the textbook Samanvay-AI joint bundling scenario!
        today = datetime.date.today()
        block_start = datetime.datetime.combine(today, datetime.time(10, 45))
        block_end = datetime.datetime.combine(today, datetime.time(12, 15))

        bundled_block = MaintenanceBlock(
            id="BLK-NCR-2026-001",
            block_code="GZB-TDL-UP-1045",
            title="Mega Joint Maintenance Window: Aligarh - Daud Khan Section",
            track_section_id="NCR-GZB-TDL-UP",
            line="UP",
            division="Prayagraj (NCR)",
            start_km=86.0,
            end_km=92.0,
            time_window_start=block_start,
            time_window_end=block_end,
            duration_minutes=90,
            primary_department="ENG",
            bundled_departments="ENG,S&T,TRD",
            machinery_assigned="BCM, TOWER_WAGON, RAIL_TENSOR",
            status=BlockStatus.APPROVED,
            private_number="PN-NCR-8841",
            protocol_step=1,
            caution_order_issued=True,
            ohe_power_isolated=True,
            optimization_score=94.5,
            controller_remarks="Bundled during natural 135-min gap between Train 12004 (Shatabdi) and Train 12398 (Mahabodhi). OHE isolated between Aligarh SSP and Daud Khan TSS."
        )
        db.add(bundled_block)
        db.commit()

        # Associate the clustered defects to this mega block
        bundled_defect_ids = [
            "DEF-TMS-1001", "DEF-TMS-1002", "DEF-TMS-1003", "DEF-TMS-1004",
            "DEF-SMMS-2001", "DEF-SMMS-2002", "DEF-TDMS-3001", "DEF-TDMS-3002"
        ]
        for did in bundled_defect_ids:
            assoc = BlockDefectAssociation(block_id=bundled_block.id, defect_id=did)
            db.add(assoc)
            d = db.query(Defect).filter(Defect.id == did).first()
            if d:
                d.status = DefectStatus.SCHEDULED

        db.commit()
        print("✅ Database seeding successfully completed!")
        print(f"📊 Summary: {len(sections)} Sections | {len(users)} Users | {len(train_schedules)} Trains | {len(defects_to_add)} Defects | 1 Mega Bundled Block")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
