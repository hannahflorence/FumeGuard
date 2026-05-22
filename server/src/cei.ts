import {
  ThresholdsConfig,
  computeLoad,
  deriveStatus,
  normalizeDust,
  normalizeGas,
  type AirStatus,
  type LatestReading,
} from "@fumeguard/shared";

export interface DeviceState {
  cei: number;
  lastTs: number | null;
  sessionId: string | null;
  sessionStartedAt: number | null;
  sessionPeakGas: number;
  sessionPeakDust: number;
  sessionSampleCount: number;
  lastIdleTs: number | null;
}

export function createDeviceState(): DeviceState {
  return {
    cei: 0,
    lastTs: null,
    sessionId: null,
    sessionStartedAt: null,
    sessionPeakGas: 0,
    sessionPeakDust: 0,
    sessionSampleCount: 0,
    lastIdleTs: null,
  };
}

export interface ProcessedSample {
  reading: LatestReading;
  sessionId: string | null;
  sessionStarted: boolean;
  sessionEnded: boolean;
  sessionSummary?: {
    sessionId: string;
    startedAt: number;
    endedAt: number;
    peakGasPpm: number;
    peakDustUgM3: number;
    finalCei: number;
    status: AirStatus;
    sampleCount: number;
  };
}

function newSessionId(deviceId: string): string {
  return `${deviceId}-${Date.now()}`;
}

export function processTelemetry(
  deviceId: string,
  gasPpm: number,
  dustUgM3: number,
  fanOn: boolean,
  ledOn: boolean,
  ts: number,
  thresholds: ThresholdsConfig,
  state: DeviceState,
  firmwareCei?: number
): ProcessedSample {
  const gasNorm = normalizeGas(gasPpm, thresholds);
  const dustNorm = normalizeDust(dustUgM3, thresholds);
  const load = computeLoad(gasPpm, dustUgM3, thresholds);

  if (state.lastTs !== null && ts > state.lastTs) {
    const deltaSec = (ts - state.lastTs) / 1000;
    if (load > thresholds.idleLoadThreshold) {
      state.cei += load * deltaSec;
    }
  } else if (firmwareCei !== undefined && state.lastTs === null) {
    state.cei = firmwareCei;
  }

  state.lastTs = ts;

  let sessionStarted = false;
  let sessionEnded = false;
  let sessionSummary: ProcessedSample["sessionSummary"];

  const isActive = load > thresholds.idleLoadThreshold;
  const idleTimeoutMs = thresholds.idleTimeoutMinutes * 60 * 1000;

  if (isActive) {
    state.lastIdleTs = null;
    if (!state.sessionId) {
      state.sessionId = newSessionId(deviceId);
      state.sessionStartedAt = ts;
      state.sessionPeakGas = gasPpm;
      state.sessionPeakDust = dustUgM3;
      state.sessionSampleCount = 0;
      sessionStarted = true;
    }
    state.sessionPeakGas = Math.max(state.sessionPeakGas, gasPpm);
    state.sessionPeakDust = Math.max(state.sessionPeakDust, dustUgM3);
    state.sessionSampleCount += 1;
  } else {
    if (state.lastIdleTs === null) {
      state.lastIdleTs = ts;
    } else if (
      state.sessionId &&
      state.sessionStartedAt &&
      ts - state.lastIdleTs >= idleTimeoutMs
    ) {
      sessionSummary = {
        sessionId: state.sessionId,
        startedAt: state.sessionStartedAt,
        endedAt: ts,
        peakGasPpm: state.sessionPeakGas,
        peakDustUgM3: state.sessionPeakDust,
        finalCei: state.cei,
        status: deriveStatus(gasPpm, dustUgM3, state.cei, thresholds),
        sampleCount: state.sessionSampleCount,
      };
      sessionEnded = true;
      state.sessionId = null;
      state.sessionStartedAt = null;
      state.sessionPeakGas = 0;
      state.sessionPeakDust = 0;
      state.sessionSampleCount = 0;
      state.lastIdleTs = null;
      state.cei = 0;
    }
  }

  const status = deriveStatus(gasPpm, dustUgM3, state.cei, thresholds);

  const reading: LatestReading = {
    ts,
    gasPpm,
    dustUgM3,
    cei: Math.round(state.cei * 100) / 100,
    status,
    fanOn,
    ledOn,
    gasNorm: Math.round(gasNorm * 1000) / 1000,
    dustNorm: Math.round(dustNorm * 1000) / 1000,
    load: Math.round(load * 1000) / 1000,
  };

  return {
    reading,
    sessionId: state.sessionId,
    sessionStarted,
    sessionEnded,
    sessionSummary,
  };
}
