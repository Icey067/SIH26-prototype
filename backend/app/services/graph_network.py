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
    {"id": "SKB", "name": "Shikohabad Jn", "km": 240.0, "type": "JUNCTION", "platforms": 4},
    {"id": "ETW", "name": "Etawah Jn", "km": 296.0, "type": "MAJOR_JUNCTION", "platforms": 5},
    {"id": "PHD", "name": "Phaphund", "km": 352.0, "type": "BLOCK_STATION", "platforms": 4},
    {"id": "RURA", "name": "Rura", "km": 394.0, "type": "BLOCK_STATION", "platforms": 3},
    {"id": "PNK", "name": "Panki Dham", "km": 428.0, "type": "GOODS_JUNCTION", "platforms": 4},
    {"id": "CNB", "name": "Kanpur Central", "km": 440.0, "type": "TERMINAL_JUNCTION", "platforms": 10},
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

            # Loop Lines at Major Junctions for Regulation & Stabling
            if src["type"] in ["MAJOR_JUNCTION", "DIVISIONAL_JUNCTION", "TERMINAL_JUNCTION"]:
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
        ]
        return trajectories

# Singleton instance
corridor_network = CorridorNetwork()
