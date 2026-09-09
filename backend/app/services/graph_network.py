"""
Samanvay-AI: Module 1 - Network Graph & Timetable Model
Models the 440 Km Prayagraj Trunk Corridor (GZB - TDL - CNB) as a Directed Multigraph G = (V, E)
using NetworkX, parameterizing track segments, speeds, and train time-space trajectories.
"""

from typing import Dict, List, Any, Optional
import networkx as nx
from pydantic import BaseModel

# Station / Junction Node Definition
STATION_NODES = [
    {"id": "GZB", "name": "Ghaziabad Jn", "km": 0.0, "type": "TERMINAL_JUNCTION", "platforms": 6},
    {"id": "DER", "name": "Dadri", "km": 37.0, "type": "STATION_CROSSOVER", "platforms": 4},
    {"id": "ALJN", "name": "Aligarh Jn", "km": 126.0, "type": "MAJOR_JUNCTION", "platforms": 7},
    {"id": "HRS", "name": "Hathras Jn", "km": 156.0, "type": "JUNCTION", "platforms": 3},
    {"id": "TDL", "name": "Tundla Jn", "km": 204.0, "type": "DIVISIONAL_JUNCTION", "platforms": 5},
    {"id": "FZD", "name": "Firozabad", "km": 222.0, "type": "STATION_CROSSOVER", "platforms": 3},
    {"id": "SKB", "name": "Shikohabad Jn", "km": 240.0, "type": "JUNCTION", "platforms": 4},
    {"id": "ETW", "name": "Etawah Jn", "km": 296.0, "type": "MAJOR_JUNCTION", "platforms": 5},
    {"id": "PHD", "name": "Phaphund", "km": 352.0, "type": "BLOCK_STATION", "platforms": 4},
    {"id": "RURA", "name": "Rura", "km": 394.0, "type": "BLOCK_STATION", "platforms": 3},
    {"id": "PNK", "name": "Panki Dham", "km": 428.0, "type": "GOODS_JUNCTION", "platforms": 4},
    {"id": "CNB", "name": "Kanpur Central", "km": 440.0, "type": "TERMINAL_JUNCTION", "platforms": 10},
]

class ElementarySection(BaseModel):
    section_id: str
    track_section_id: str = "NCR-GZB-TDL-UP"
    line: str = "UP"
    start_km: float
    end_km: float
    feeding_post: str
    isolator_id: str
    neutral_section_km: Optional[float] = None

# OHE Physical Electrical Elementary Section Partitioning (G&SR Norms)
ELEMENTARY_SECTIONS: List[ElementarySection] = [
    ElementarySection(section_id="ES-GZB-DER-01", line="BOTH", start_km=0.0, end_km=37.0, feeding_post="FP-GZB", isolator_id="ISO-12-1"),
    ElementarySection(section_id="ES-DER-ALJN-02", line="BOTH", start_km=37.0, end_km=81.2, feeding_post="FP-DER", isolator_id="ISO-48-2"),
    ElementarySection(section_id="ES-GZB-TDL-04", line="BOTH", start_km=81.2, end_km=94.6, feeding_post="FP-ALJN", isolator_id="ISO-88-1", neutral_section_km=92.5),
    ElementarySection(section_id="ES-ALJN-HRS-05", line="BOTH", start_km=94.6, end_km=156.0, feeding_post="FP-ALJN", isolator_id="ISO-130-1"),
    ElementarySection(section_id="ES-HRS-TDL-06", line="BOTH", start_km=156.0, end_km=204.0, feeding_post="FP-HRS", isolator_id="ISO-182-1"),
    ElementarySection(section_id="ES-TDL-SKB-07", line="BOTH", start_km=204.0, end_km=240.0, feeding_post="FP-TDL", isolator_id="ISO-218-1"),
    ElementarySection(section_id="ES-SKB-ETW-08", line="BOTH", start_km=240.0, end_km=296.0, feeding_post="FP-SKB", isolator_id="ISO-265-2"),
    ElementarySection(section_id="ES-ETW-PHD-09", line="BOTH", start_km=296.0, end_km=352.0, feeding_post="FP-ETW", isolator_id="ISO-320-1"),
    ElementarySection(section_id="ES-PHD-RURA-10", line="BOTH", start_km=352.0, end_km=394.0, feeding_post="FP-PHD", isolator_id="ISO-375-1"),
    ElementarySection(section_id="ES-RURA-CNB-11", line="BOTH", start_km=394.0, end_km=440.0, feeding_post="FP-PNK", isolator_id="ISO-415-2"),
]

# Track Machine Stabling Yards and Specifications
MACHINE_CRUISING_SPEED_KMPH = 35.0
MACHINE_SETUP_CLEARING_MARGIN_MINS = 15.0

MACHINE_DEPOTS = [
    {
        "depot_id": "DEPOT-GZB",
        "name": "Ghaziabad Track Machine Depot",
        "km": 0.0,
        "station_id": "GZB",
        "fleet": {
            "BCM": ["BCM_01"],
            "CSM": ["CSM_01"],
            "UNIMAT": ["UNIMAT_01"],
            "TOWER_WAGON": ["TW_01"],
            "RAIL_TENSOR": ["RT_01"],
            "FLASH_BUTT_WELDING": ["FBW_01"],
        }
    },
    {
        "depot_id": "DEPOT-TDL",
        "name": "Tundla Operational Yard Depot",
        "km": 204.0,
        "station_id": "TDL",
        "fleet": {
            "BCM": ["BCM_02"],
            "CSM": ["CSM_02"],
            "UNIMAT": ["UNIMAT_02"],
            "TOWER_WAGON": ["TW_02"],
            "RAIL_TENSOR": ["RT_02"],
            "FLASH_BUTT_WELDING": ["FBW_02"],
        }
    },
    {
        "depot_id": "DEPOT-CNB",
        "name": "Kanpur Central Base Depot",
        "km": 440.0,
        "station_id": "CNB",
        "fleet": {
            "BCM": ["BCM_03"],
            "CSM": ["CSM_03"],
            "UNIMAT": ["UNIMAT_03"],
            "TOWER_WAGON": ["TW_03"],
            "RAIL_TENSOR": ["RT_03"],
            "FLASH_BUTT_WELDING": ["FBW_03"],
        }
    }
]

class CorridorNetwork:
    """Directed Multigraph representing the Ghaziabad - Kanpur railway corridor."""

    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self._build_corridor()

    def _build_corridor(self):
        # 1. Add Vertices
        for stn in STATION_NODES:
            self.graph.add_node(
                stn["id"],
                name=stn["name"],
                km=stn["km"],
                node_type=stn["type"],
                platforms=stn["platforms"],
            )

        # 2. Add Directional Edges between consecutive stations
        # In North Central Railway:
        # DN (Down Line): GZB -> CNB (Eastbound, away from New Delhi)
        # UP (Up Line): CNB -> GZB (Westbound, towards New Delhi)
        for i in range(len(STATION_NODES) - 1):
            src = STATION_NODES[i]
            dst = STATION_NODES[i + 1]
            seg_len = round(dst["km"] - src["km"], 1)

            # DN MAIN (Eastbound)
            self.graph.add_edge(
                src["id"],
                dst["id"],
                key=f"DN_{src['id']}_{dst['id']}",
                line_type="DN_MAIN",
                direction="DN",
                start_km=src["km"],
                end_km=dst["km"],
                length_km=seg_len,
                max_speed_kmh=130,
                electrified=True,
                tss_sector=f"TSS-{src['id']}",
                status="CLEAR",
            )

            # UP MAIN (Westbound)
            self.graph.add_edge(
                dst["id"],
                src["id"],
                key=f"UP_{dst['id']}_{src['id']}",
                line_type="UP_MAIN",
                direction="UP",
                start_km=dst["km"],
                end_km=src["km"],
                length_km=seg_len,
                max_speed_kmh=130,
                electrified=True,
                tss_sector=f"TSS-{dst['id']}",
                status="CLEAR",
            )

            # Loop Lines & Siding for Regulation & Stabling (Intermediate Stations included)
            if src["type"] in ["MAJOR_JUNCTION", "DIVISIONAL_JUNCTION", "TERMINAL_JUNCTION", "JUNCTION", "STATION_CROSSOVER"]:
                self.graph.add_edge(
                    src["id"],
                    dst["id"],
                    key=f"LOOP_DN_{src['id']}",
                    line_type="LOOP_LINE",
                    direction="DN",
                    start_km=src["km"],
                    end_km=src["km"] + min(5.0, seg_len),
                    length_km=min(5.0, seg_len),
                    max_speed_kmh=30,
                    electrified=True,
                    tss_sector=f"TSS-{src['id']}",
                    status="CLEAR",
                )

        # 3. Explicit Turnout #34-B Diamond Interlocking at Tundla Outer (G&SR Crossover)
        self.graph.add_edge(
            "TDL",
            "TDL",
            key="TURNOUT_34B_TDL_OUTER",
            line_type="CROSSOVER",
            direction="BOTH",
            start_km=203.5,
            end_km=204.5,
            length_km=1.0,
            max_speed_kmh=15,
            electrified=True,
            tss_sector="TSS-TDL",
            status="CLEAR",
            turnout_id="TURNOUT-34B",
            interlocking_type="DIAMOND",
        )

    @staticmethod
    def get_elementary_section_for_km(km: float, line: str = "UP") -> Optional[ElementarySection]:
        """Returns the physical OHE elementary section enclosing this kilometer marker."""
        for es in ELEMENTARY_SECTIONS:
            if es.start_km <= km <= es.end_km:
                return es
        return None

    @staticmethod
    def find_nearest_machine_depot(km: float, machinery_type: str = "CSM") -> Dict[str, Any]:
        """
        Calculates machine transit time & work window specs based on RDSO 35 km/h cruising norms.
        Required Window = PredictedDuration + 2 * (Distance / 35 km/h * 60) + 15 min setup.
        """
        best_depot = None
        min_dist = float("inf")

        for depot in MACHINE_DEPOTS:
            dist = abs(depot["km"] - km)
            if dist < min_dist:
                min_dist = dist
                best_depot = depot

        if not best_depot:
            best_depot = MACHINE_DEPOTS[1] # Default Tundla
            min_dist = abs(best_depot["km"] - km)

        fleet_list = best_depot.get("fleet", {}).get(machinery_type, [])
        unit_id = fleet_list[0] if fleet_list else f"{machinery_type}_{best_depot['station_id']}_01"

        one_way_transit_mins = round((min_dist / MACHINE_CRUISING_SPEED_KMPH) * 60.0, 1)
        round_trip_transit_mins = round(2.0 * one_way_transit_mins, 1)

        return {
            "depot_id": best_depot["depot_id"],
            "depot_name": best_depot["name"],
            "depot_km": best_depot["km"],
            "station_id": best_depot["station_id"],
            "machinery_type": machinery_type,
            "machine_unit_id": unit_id,
            "distance_km": round(min_dist, 1),
            "cruising_speed_kmph": MACHINE_CRUISING_SPEED_KMPH,
            "one_way_transit_mins": one_way_transit_mins,
            "round_trip_transit_mins": round_trip_transit_mins,
            "setup_clearing_margin_mins": MACHINE_SETUP_CLEARING_MARGIN_MINS,
        }

    def get_topology_dict(self) -> Dict[str, Any]:
        """Serializes the Multigraph topology for the React Frontend."""
        nodes = []
        for n, data in self.graph.nodes(data=True):
            nodes.append({
                "id": n,
                "name": data["name"],
                "km": data["km"],
                "type": data["node_type"],
                "platforms": data["platforms"],
            })

        edges = []
        for u, v, k, data in self.graph.edges(keys=True, data=True):
            edges.append({
                "id": k,
                "source": u,
                "target": v,
                "line_type": data["line_type"],
                "direction": data["direction"],
                "start_km": data["start_km"],
                "end_km": data["end_km"],
                "length_km": data["length_km"],
                "max_speed_kmh": data["max_speed_kmh"],
                "status": data.get("status", "CLEAR"),
            })

        return {
            "corridor": "NCR-GZB-TDL-CNB",
            "total_length_km": 440.0,
            "nodes": sorted(nodes, key=lambda x: x["km"]),
            "edges": edges,
            "elementary_sections": [es.model_dump() for es in ELEMENTARY_SECTIONS],
            "machine_depots": MACHINE_DEPOTS,
        }

    def get_scheduled_train_trajectories(self) -> List[Dict[str, Any]]:
        """
        Returns scheduled 24-hour time-space paths (train trajectories)
        for the Time-Distance String Chart.
        Priority weights (w_i):
        - Vande Bharat: 10
        - Rajdhani: 9
        - Shatabdi: 8
        - Superfast: 7
        - Express: 5
        - Freight: 3
        """
        trajectories = [
            # 1. 22436 Vande Bharat Express (NDLS -> BSB) (DN Line)
            {
                "train_id": "22436",
                "name": "Vande Bharat Express",
                "direction": "DN",
                "priority": "VIP_PREMIUM",
                "weight": 10,
                "color": "#06b6d4",
                "points": [
                    {"km": 0.0, "minute": 380, "time_str": "06:20", "station": "GZB"},
                    {"km": 126.0, "minute": 435, "time_str": "07:15", "station": "ALJN"},
                    {"km": 204.0, "minute": 472, "time_str": "07:52", "station": "TDL"},
                    {"km": 296.0, "minute": 515, "time_str": "08:35", "station": "ETW"},
                    {"km": 440.0, "minute": 585, "time_str": "09:45", "station": "CNB"},
                ],
            },
            # 2. 12424 Dibrugarh Rajdhani Express (NDLS -> DBRG) (DN Line)
            {
                "train_id": "12424",
                "name": "Rajdhani Express",
                "direction": "DN",
                "priority": "VIP_PREMIUM",
                "weight": 9,
                "color": "#3b82f6",
                "points": [
                    {"km": 0.0, "minute": 985, "time_str": "16:25", "station": "GZB"},
                    {"km": 126.0, "minute": 1045, "time_str": "17:25", "station": "ALJN"},
                    {"km": 204.0, "minute": 1085, "time_str": "18:05", "station": "TDL"},
                    {"km": 296.0, "minute": 1135, "time_str": "18:55", "station": "ETW"},
                    {"km": 440.0, "minute": 1215, "time_str": "20:15", "station": "CNB"},
                ],
            },
            # 3. 12004 Lucknow Shatabdi Express (NDLS -> LKO) (DN Line)
            {
                "train_id": "12004",
                "name": "Lucknow Shatabdi",
                "direction": "DN",
                "priority": "HIGH_SPEED_SUPERFAST",
                "weight": 8,
                "color": "#8b5cf6",
                "points": [
                    {"km": 0.0, "minute": 405, "time_str": "06:45", "station": "GZB"},
                    {"km": 126.0, "minute": 470, "time_str": "07:50", "station": "ALJN"},
                    {"km": 204.0, "minute": 512, "time_str": "08:32", "station": "TDL"},
                    {"km": 296.0, "minute": 560, "time_str": "09:20", "station": "ETW"},
                    {"km": 440.0, "minute": 645, "time_str": "10:45", "station": "CNB"},
                ],
            },
            # 4. 12398 Mahabodhi Express (NDLS -> GAYA) (DN Line)
            {
                "train_id": "12398",
                "name": "Mahabodhi Express",
                "direction": "DN",
                "priority": "SUPERFAST",
                "weight": 7,
                "color": "#10b981",
                "points": [
                    {"km": 0.0, "minute": 765, "time_str": "12:45", "station": "GZB"},
                    {"km": 126.0, "minute": 835, "time_str": "13:55", "station": "ALJN"},
                    {"km": 204.0, "minute": 880, "time_str": "14:40", "station": "TDL"},
                    {"km": 296.0, "minute": 930, "time_str": "15:30", "station": "ETW"},
                    {"km": 440.0, "minute": 1020, "time_str": "17:00", "station": "CNB"},
                ],
            },
            # 5. 12418 Prayagraj Express (NDLS -> PRYJ) (DN Line)
            {
                "train_id": "12418",
                "name": "Prayagraj Express",
                "direction": "DN",
                "priority": "EXPRESS",
                "weight": 5,
                "color": "#f59e0b",
                "points": [
                    {"km": 0.0, "minute": 1340, "time_str": "22:20", "station": "GZB"},
                    {"km": 126.0, "minute": 1415, "time_str": "23:35", "station": "ALJN"},
                    {"km": 204.0, "minute": 1440, "time_str": "24:00", "station": "TDL"},
                ],
            },
            # 6. BOXN_701 Loaded Coal Freight (CNB -> DLI) (UP Line)
            {
                "train_id": "BOXN_701",
                "name": "Coal Rake 701 (Freight)",
                "direction": "UP",
                "priority": "FREIGHT",
                "weight": 3,
                "color": "#6b7280",
                "points": [
                    {"km": 440.0, "minute": 120, "time_str": "02:00", "station": "CNB"},
                    {"km": 296.0, "minute": 280, "time_str": "04:40", "station": "ETW"},
                    {"km": 204.0, "minute": 390, "time_str": "06:30", "station": "TDL"},
                    {"km": 126.0, "minute": 480, "time_str": "08:00", "station": "ALJN"},
                    {"km": 0.0, "minute": 620, "time_str": "10:20", "station": "GZB"},
                ],
            },
            # 7. 12003 Shatabdi Express (LKO -> NDLS) (UP Line)
            {
                "train_id": "12003",
                "name": "Lucknow Shatabdi (Return)",
                "direction": "UP",
                "priority": "HIGH_SPEED_SUPERFAST",
                "weight": 8,
                "color": "#ec4899",
                "points": [
                    {"km": 440.0, "minute": 990, "time_str": "16:30", "station": "CNB"},
                    {"km": 296.0, "minute": 1070, "time_str": "17:50", "station": "ETW"},
                    {"km": 204.0, "minute": 1115, "time_str": "18:35", "station": "TDL"},
                    {"km": 126.0, "minute": 1160, "time_str": "19:20", "station": "ALJN"},
                    {"km": 0.0, "minute": 1230, "time_str": "20:30", "station": "GZB"},
                ],
            },
            # 8. BOXN_Freight_702 Container Freight (GZB -> CNB) (DN Line)
            {
                "train_id": "BOXN_Freight_702",
                "name": "BOXN Container Freight",
                "direction": "DN",
                "priority": "FREIGHT",
                "weight": 3,
                "color": "#4b5563",
                "points": [
                    {"km": 0.0, "minute": 420, "time_str": "07:00", "station": "GZB"},
                    {"km": 37.0, "minute": 460, "time_str": "07:40", "station": "DER"},
                    {"km": 126.0, "minute": 550, "time_str": "09:10", "station": "ALJN"},
                    {"km": 156.0, "minute": 590, "time_str": "09:50", "station": "HRS"},
                    {"km": 204.0, "minute": 640, "time_str": "10:40", "station": "TDL"},
                    {"km": 240.0, "minute": 685, "time_str": "11:25", "station": "SKB"},
                    {"km": 296.0, "minute": 750, "time_str": "12:30", "station": "ETW"},
                    {"km": 440.0, "minute": 900, "time_str": "15:00", "station": "CNB"},
                ],
            },
        ]
        return trajectories

# Singleton instance
corridor_network = CorridorNetwork()
