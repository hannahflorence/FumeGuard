import {
  DEFAULT_THRESHOLDS,
  EventPayload,
  TelemetryPayload,
  ThresholdsConfig,
  type StoredEvent,
} from "@fumeguard/shared";
import type admin from "firebase-admin";
import { config } from "./config.js";
import { createDeviceState, processTelemetry, type DeviceState } from "./cei.js";

const deviceStates = new Map<string, DeviceState>();
const lastHistoryWrite = new Map<string, number>();
let cachedThresholds: ThresholdsConfig = DEFAULT_THRESHOLDS;
let thresholdsLoadedAt = 0;

async function loadThresholds(db: admin.database.Database): Promise<ThresholdsConfig> {
  const now = Date.now();
  if (now - thresholdsLoadedAt < 30_000) {
    return cachedThresholds;
  }
  const snap = await db.ref("config/thresholds").once("value");
  if (snap.exists()) {
    cachedThresholds = { ...DEFAULT_THRESHOLDS, ...snap.val() };
  } else {
    cachedThresholds = DEFAULT_THRESHOLDS;
  }
  thresholdsLoadedAt = now;
  return cachedThresholds;
}

function getState(deviceId: string): DeviceState {
  let state = deviceStates.get(deviceId);
  if (!state) {
    state = createDeviceState();
    deviceStates.set(deviceId, state);
  }
  return state;
}

export function createMqttHandlers(db: admin.database.Database) {
  return {
    async onTelemetry(topic: string, raw: string): Promise<void> {
      const deviceId = topic.split("/")[1];
      if (!deviceId) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.warn("[mqtt] Invalid JSON on", topic);
        return;
      }

      const result = TelemetryPayload.safeParse(parsed);
      if (!result.success) {
        console.warn("[mqtt] Invalid telemetry:", result.error.flatten());
        return;
      }

      const payload = result.data;
      const thresholds = await loadThresholds(db);
      const state = getState(deviceId);
      const processed = processTelemetry(
        deviceId,
        payload.gasPpm,
        payload.dustUgM3,
        payload.fanOn,
        payload.ledOn,
        payload.ts,
        thresholds,
        state,
        payload.cei
      );

      const latestRef = db.ref(`devices/${deviceId}/latest`);
      await latestRef.set(processed.reading);

      const interval =
        thresholds.historyIntervalMs ?? config.historyIntervalMs;
      const lastWrite = lastHistoryWrite.get(deviceId) ?? 0;
      const shouldWriteHistory =
        processed.reading.ts - lastWrite >= interval ||
        processed.sessionStarted ||
        processed.sessionEnded;

      if (shouldWriteHistory) {
        await db.ref(`devices/${deviceId}/history`).push(processed.reading);
        lastHistoryWrite.set(deviceId, processed.reading.ts);
      }

      if (processed.sessionStarted && processed.sessionId) {
        await db.ref(`devices/${deviceId}/sessions/${processed.sessionId}`).set({
          sessionId: processed.sessionId,
          deviceId,
          startedAt: processed.reading.ts,
          endedAt: null,
          peakGasPpm: processed.reading.gasPpm,
          peakDustUgM3: processed.reading.dustUgM3,
          finalCei: processed.reading.cei,
          status: processed.reading.status,
          sampleCount: 1,
        });
      }

      if (processed.sessionId && !processed.sessionEnded) {
        await db
          .ref(`devices/${deviceId}/sessions/${processed.sessionId}`)
          .update({
            peakGasPpm: state.sessionPeakGas,
            peakDustUgM3: state.sessionPeakDust,
            finalCei: processed.reading.cei,
            status: processed.reading.status,
            sampleCount: state.sessionSampleCount,
          });
      }

      if (processed.sessionEnded && processed.sessionSummary) {
        const s = processed.sessionSummary;
        await db.ref(`devices/${deviceId}/sessions/${s.sessionId}`).update({
          endedAt: s.endedAt,
          peakGasPpm: s.peakGasPpm,
          peakDustUgM3: s.peakDustUgM3,
          finalCei: s.finalCei,
          status: s.status,
          sampleCount: s.sampleCount,
        });
      }
    },

    async onEvent(topic: string, raw: string): Promise<void> {
      const deviceId = topic.split("/")[1];
      if (!deviceId) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.warn("[mqtt] Invalid JSON on", topic);
        return;
      }

      const result = EventPayload.safeParse(parsed);
      if (!result.success) {
        console.warn("[mqtt] Invalid event:", result.error.flatten());
        return;
      }

      const event: StoredEvent = result.data;
      await db.ref(`devices/${deviceId}/events`).push(event);
    },
  };
}
