import express from "express";
import mqtt from "mqtt";
import { config } from "./config.js";
import { createMqttHandlers } from "./handlers.js";
import { getDb } from "./firebase.js";

const db = getDb();
const handlers = createMqttHandlers(db);

const mqttOptions: mqtt.IClientOptions = {
  clientId: `fumeguard-server-${Date.now()}`,
  clean: true,
  reconnectPeriod: 3000,
};

if (config.mqttUsername) {
  mqttOptions.username = config.mqttUsername;
  mqttOptions.password = config.mqttPassword;
}

const mqttClient = mqtt.connect(config.mqttUrl, mqttOptions);

mqttClient.on("connect", () => {
  console.log("[mqtt] Connected to", config.mqttUrl);
  mqttClient.subscribe(["fumeguard/+/telemetry", "fumeguard/+/events"], (err) => {
    if (err) console.error("[mqtt] Subscribe error:", err);
    else console.log("[mqtt] Subscribed to fumeguard/+/telemetry and events");
  });
});

mqttClient.on("message", (topic, payload) => {
  const raw = payload.toString();
  if (topic.endsWith("/telemetry")) {
    handlers.onTelemetry(topic, raw).catch((e) => console.error("[telemetry]", e));
  } else if (topic.endsWith("/events")) {
    handlers.onEvent(topic, raw).catch((e) => console.error("[event]", e));
  }
});

mqttClient.on("error", (err) => console.error("[mqtt]", err.message));

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    mqttConnected: mqttClient.connected,
    firebaseEmulator: config.useFirebaseEmulator,
    projectId: config.firebaseProjectId,
  });
});

app.listen(config.port, () => {
  console.log(`[server] Health http://localhost:${config.port}/health`);
  if (config.useFirebaseEmulator) {
    console.log(
      `[server] Firebase emulator: ${config.firebaseDatabaseEmulatorHost}`
    );
  }
});
