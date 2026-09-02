import { TrainTelemetry, ConflictAlert, WeatherReport } from "@/types/railway";

type TelemetryCallback = (data: {
  trains?: TrainTelemetry[];
  conflicts?: ConflictAlert[];
  weather?: WeatherReport;
  active_blocks_count?: number;
}) => void;

class RailwayWebSocketService {
  private socket: WebSocket | null = null;
  private subscribers: TelemetryCallback[] = [];
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private url = "ws://localhost:8000/api/v1/live/ws";
  private isConnected = false;

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.isConnected = true;
        console.log("🟢 Connected to Samanvay-AI Railway Live WebSocket");
        // Start ping interval
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send("ping");
          }
        }, 15000);
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === "INITIAL_STATE" || payload.event === "TELEMETRY_UPDATE") {
            this.notifySubscribers({
              trains: payload.trains,
              conflicts: payload.conflicts,
              weather: payload.weather
            });
          }
        } catch (e) {
          // pong or raw message
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        console.warn("🔴 Railway WebSocket disconnected. Retrying in 4 seconds...");
        if (this.pingInterval) clearInterval(this.pingInterval);
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 4000);
      };

      this.socket.onerror = (err) => {
        console.error("Railway WebSocket error:", err);
      };
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
    }
  }

  public subscribe(cb: TelemetryCallback) {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private notifySubscribers(data: any) {
    this.subscribers.forEach((cb) => cb(data));
  }

  public requestTelemetryUpdate() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send("poll_telemetry");
    }
  }

  public getConnectedStatus() {
    return this.isConnected;
  }
}

export const wsService = new RailwayWebSocketService();
