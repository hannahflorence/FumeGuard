import dotenv from "dotenv";
import mqtt from "mqtt";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveStatus,
  mqttEventsTopic,
  mqttTelemetryTopic,
  type EventPayload,
  type TelemetryPayload,
} from "@fumeguard/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const deviceId = process.env.DEVICE_ID ?? "esp32-01";
const mqttUrl = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const intervalMs = Number(process.env.SIM_INTERVAL_MS ?? 2000);

let gasPpm = 80;
let dustUgM3 = 15;
let cei = 0;
let fanOn = false;
let ledOn = false;
let phase = 0;

const client = mqtt.connect(mqttUrl, {
  clientId: `fumeguard-sim-${Date.now()}`,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

function publishEvent(type: EventPayload["type"], message: string) {
  const payload: EventPayload = { ts: Date.now(), type, message };
  client.publish(mqttEventsTopic(deviceId), JSON.stringify(payload));
}

client.on("connect", () => {
  console.log(`[simulator] Publishing as ${deviceId} every ${intervalMs}ms`);
  setInterval(tick, intervalMs);
});

function tick() {
  phase += 0.08;
  const spike = Math.sin(phase) > 0.65 ? 1.8 : 1;
  gasPpm = Math.max(20, 60 + Math.sin(phase * 1.2) * 120 * spike + Math.random() * 30);
  dustUgM3 = Math.max(5, 12 + Math.sin(phase * 0.9) * 40 * spike + Math.random() * 10);

  const load = Math.max(gasPpm / 400, dustUgM3 / 75);
  if (load > 0.05) cei += load * (intervalMs / 1000);

  const status = deriveStatus(gasPpm, dustUgM3, cei, {
    gasWarningPpm: 200,
    gasHazardPpm: 400,
    dustWarningUgM3: 35,
    dustHazardUgM3: 75,
    ceiWarning: 300,
    ceiHazard: 600,
    idleLoadThreshold: 0.05,
    idleTimeoutMinutes: 5,
    historyIntervalMs: 5000,
  });

  const prevFan = fanOn;
  fanOn = status === "hazardous";
  ledOn = status !== "safe";

  if (fanOn && !prevFan) publishEvent("fan_on", "Exhaust fan activated");
  if (!fanOn && prevFan) publishEvent("fan_off", "Exhaust fan deactivated");
  if (status === "hazardous") {
    publishEvent("alert", "Hazardous air quality detected");
  }

  const telemetry: TelemetryPayload = {
    ts: Date.now(),
    gasPpm: Math.round(gasPpm * 10) / 10,
    dustUgM3: Math.round(dustUgM3 * 10) / 10,
    cei: Math.round(cei * 100) / 100,
    status,
    fanOn,
    ledOn,
  };

  client.publish(mqttTelemetryTopic(deviceId), JSON.stringify(telemetry));
}

client.on("error", (err) => console.error("[simulator]", err.message));
