import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: Number(process.env.PORT ?? 3001),
  mqttUrl: process.env.MQTT_URL ?? "mqtt://localhost:1883",
  mqttUsername: process.env.MQTT_USERNAME,
  mqttPassword: process.env.MQTT_PASSWORD,
  useFirebaseEmulator: process.env.USE_FIREBASE_EMULATOR === "true",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "fumeguard-demo",
  firebaseDatabaseEmulatorHost:
    process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000",
  defaultDeviceId: process.env.DEVICE_ID ?? "esp32-01",
  historyIntervalMs: Number(process.env.HISTORY_INTERVAL_MS ?? 5000),
};
