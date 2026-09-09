"""
Samanvay-AI: Station, Elementary Section, and Depot Models
Formalizes the corridor topology (currently hardcoded in graph_network.py)
into queryable database records for G&SR compliance audits.
"""

import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean
from app.core.database import Base


class Station(Base):
    """A railway station or block hut on the Prayagraj corridor."""
    __tablename__ = "stations"

    id = Column(String, primary_key=True)  # e.g., "ALJN", "TDL"
    name = Column(String, nullable=False)   # e.g., "Aligarh Jn"
    km_marker = Column(Float, nullable=False, index=True)
    station_type = Column(String, nullable=False)  # JUNCTION, BLOCK_STATION, etc.
    platforms = Column(Integer, default=2)
    loop_line_capacity = Column(Integer, default=1)
    division = Column(String, default="Prayagraj (NCR)")
    zone = Column(String, default="NCR")
    latitude = Column(Float)
    longitude = Column(Float)
    has_crossover = Column(Boolean, default=False)
    has_siding = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ElementarySection(Base):
    """
    An OHE Elementary Section — the minimum isolable power block unit
    between two isolators/neutral sections on the 25kV AC traction system.
    """
    __tablename__ = "elementary_sections"

    section_id = Column(String, primary_key=True)  # e.g., "ES-GZB-TDL-04"
    start_km = Column(Float, nullable=False)
    end_km = Column(Float, nullable=False)
    feeding_post = Column(String, nullable=False)     # e.g., "FP-ALJN"
    isolator_id = Column(String, nullable=False)       # e.g., "ISO-88-1"
    neutral_section_km = Column(Float)                  # Km marker of neutral section
    tss_sector = Column(String)                         # Traction Sub-Station sector
    voltage_kv = Column(Float, default=25.0)
    line = Column(String, default="UP")

    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class MachineDepot(Base):
    """
    A track machine stabling location with fleet inventory.
    Machines cruise at 35 km/h + 15 min setup/clearing margin (G&SR spec).
    """
    __tablename__ = "machine_depots"

    depot_id = Column(String, primary_key=True)  # e.g., "DEPOT-ALJN"
    station_id = Column(String, nullable=False)
    station_name = Column(String, nullable=False)
    km_marker = Column(Float, nullable=False)
    division = Column(String, default="Prayagraj (NCR)")

    # Fleet inventory
    bcm_count = Column(Integer, default=0)
    csm_count = Column(Integer, default=0)
    tower_wagon_count = Column(Integer, default=0)
    unimat_count = Column(Integer, default=0)

    # Transit constants (G&SR fixed parameters)
    cruising_speed_kmph = Column(Float, default=35.0)
    setup_clearing_margin_mins = Column(Float, default=15.0)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
