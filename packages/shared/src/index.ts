import { z } from "zod";

export const AirStatus = z.enum(["safe", "warning", "hazardous"]);
export type AirStatus = z.infer<typeof AirStatus>;

export const EventType = z.enum([
  "threshold",
  "fan_on",
  "fan_off",
  "alert",
  "session_start",
  "session_end",
]);
export type EventType = z.infer<typeof EventType>;

export const TelemetryPayload = z.object({
  ts: z.number(),
  gasPpm: z.number().nonnegative(),
  dustUgM3: z.number().nonnegative(),
  cei: z.number().nonnegative().optional(),
  status: AirStatus.optional(),
  fanOn: z.boolean(),
  ledOn: z.boolean(),
});
export type TelemetryPayload = z.infer<typeof TelemetryPayload>;

export const EventPayload = z.object({
  ts: z.number(),
  type: EventType,
  message: z.string(),
});
export type EventPayload = z.infer<typeof EventPayload>;

export const ThresholdsConfig = z.object({
  gasWarningPpm: z.number().positive(),
  gasHazardPpm: z.number().positive(),
  dustWarningUgM3: z.number().positive(),
  dustHazardUgM3: z.number().positive(),
  ceiWarning: z.number().positive(),
  ceiHazard: z.number().positive(),
  idleLoadThreshold: z.number().min(0).max(1).default(0.05),
  idleTimeoutMinutes: z.number().positive().default(5),
  historyIntervalMs: z.number().positive().default(5000),
});
export type ThresholdsConfig = z.infer<typeof ThresholdsConfig>;

export const DEFAULT_THRESHOLDS: ThresholdsConfig = {
  gasWarningPpm: 200,
  gasHazardPpm: 400,
  dustWarningUgM3: 35,
  dustHazardUgM3: 75,
  ceiWarning: 300,
  ceiHazard: 600,
  idleLoadThreshold: 0.05,
  idleTimeoutMinutes: 5,
  historyIntervalMs: 5000,
};

export const LatestReading = z.object({
  ts: z.number(),
  gasPpm: z.number(),
  dustUgM3: z.number(),
  cei: z.number(),
  status: AirStatus,
  fanOn: z.boolean(),
  ledOn: z.boolean(),
  gasNorm: z.number().optional(),
  dustNorm: z.number().optional(),
  load: z.number().optional(),
});
export type LatestReading = z.infer<typeof LatestReading>;

export const HistoryEntry = LatestReading;
export type HistoryEntry = z.infer<typeof HistoryEntry>;

export const SessionRecord = z.object({
  sessionId: z.string(),
  deviceId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  peakGasPpm: z.number(),
  peakDustUgM3: z.number(),
  finalCei: z.number(),
  status: AirStatus,
  sampleCount: z.number(),
});
export type SessionRecord = z.infer<typeof SessionRecord>;

export const StoredEvent = EventPayload.extend({
  id: z.string().optional(),
});
export type StoredEvent = z.infer<typeof StoredEvent>;

export function mqttTelemetryTopic(deviceId: string): string {
  return `fumeguard/${deviceId}/telemetry`;
}

export function mqttEventsTopic(deviceId: string): string {
  return `fumeguard/${deviceId}/events`;
}

export function normalizeGas(gasPpm: number, thresholds: ThresholdsConfig): number {
  return Math.min(1, gasPpm / thresholds.gasHazardPpm);
}

export function normalizeDust(dustUgM3: number, thresholds: ThresholdsConfig): number {
  return Math.min(1, dustUgM3 / thresholds.dustHazardUgM3);
}

export function computeLoad(gasPpm: number, dustUgM3: number, thresholds: ThresholdsConfig): number {
  return Math.max(normalizeGas(gasPpm, thresholds), normalizeDust(dustUgM3, thresholds));
}

export function deriveStatus(
  gasPpm: number,
  dustUgM3: number,
  cei: number,
  thresholds: ThresholdsConfig
): AirStatus {
  if (
    gasPpm >= thresholds.gasHazardPpm ||
    dustUgM3 >= thresholds.dustHazardUgM3 ||
    cei >= thresholds.ceiHazard
  ) {
    return "hazardous";
  }
  if (
    gasPpm >= thresholds.gasWarningPpm ||
    dustUgM3 >= thresholds.dustWarningUgM3 ||
    cei >= thresholds.ceiWarning
  ) {
    return "warning";
  }
  return "safe";
}
