import urllib.request
import json
import sys

base = 'http://127.0.0.1:8000'

def test_endpoint(name, url, method="GET", body=None):
    try:
        data = json.dumps(body).encode('utf-8') if body else None
        headers = {'Content-Type': 'application/json'} if body else {}
        req = urllib.request.Request(base + url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=8) as res:
            resp_body = res.read().decode('utf-8')
            print(f"PASS [{method}] {url} -> {res.status}")
            return True
    except Exception as e:
        print(f"FAIL [{method}] {url} -> {e}")
        return False

tests = [
    # Health
    ("Root", "/", "GET", None),
    ("Health", "/health", "GET", None),

    # Defects
    ("Get Defects", "/api/v1/defects", "GET", None),
    ("AI Parse Defect", "/api/v1/defects/ai-parse", "POST", {
        "raw_text": "Severe rail fracture observed near km 184 on UP main line",
        "track_section_id": "NCR-GZB-TDL-UP",
        "auto_create": False,
        "reported_by": "TRACKMAN_PATROL"
    }),

    # Blocks
    ("Get Blocks", "/api/v1/blocks", "GET", None),
    ("Optimize Bundle", "/api/v1/blocks/optimize/bundle?track_section_id=NCR-GZB-TDL-UP&line=UP", "POST", None),

    # Predictions
    ("Predict Duration & Risk", "/api/v1/predict/duration-and-risk", "POST", {
        "department": "TMS",
        "activity_type": "DEEP_SCREENING",
        "track_type": "MAIN_LINE",
        "machinery_deployed": "BCM",
        "weather_condition": "CLEAR",
        "requested_duration_mins": 180.0
    }),

    # Conflicts & Network
    ("Network Graph", "/api/v1/network/graph", "GET", None),
    ("Network Trajectories", "/api/v1/network/trajectories", "GET", None),
    ("Active Conflicts", "/api/v1/conflicts/active", "GET", None),
    ("Detect Conflicts", "/api/v1/conflicts/detect", "POST", {"blocks": []}),

    # Live
    ("Live Telemetry", "/api/v1/live/telemetry", "GET", None),
    ("Live Weather", "/api/v1/live/weather", "GET", None),

    # Timetable
    ("Timetable Gaps", "/api/v1/timetable/gaps?track_section_id=NCR-GZB-TDL-UP&line=UP", "GET", None),

    # Sync
    ("Sync Status", "/api/v1/sync/status", "GET", None),
    ("Sync Downstream", "/api/v1/sync/downstream", "GET", None),
]

all_passed = True
for name, url, method, body in tests:
    ok = test_endpoint(name, url, method, body)
    if not ok:
        all_passed = False

if not all_passed:
    sys.exit(1)
print("\n>>> ALL BACKEND API ENDPOINTS VERIFIED AND FUNCTIONAL <<<")
sys.exit(0)
