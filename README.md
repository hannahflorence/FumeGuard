# FumeGuard

IoT-based solder fume monitoring with cumulative exposure assessment (CEI), automated ventilation control, and a React web dashboard.

Based on the PUP Computer Engineering capstone proposal: ESP32 sensors → MQTT → Node.js bridge → Firebase Realtime Database → React UI.

## Architecture

```
ESP32 / Simulator ──MQTT──► Mosquitto ──► Node server ──► Firebase RTDB ──► React dashboard
                              ▲                              │
                              └──────── local fan/LED/LCD ─────┘ (ESP32 only)
```

## Repository layout

| Path | Description |
|------|-------------|
| `firmware/` | ESP32 PlatformIO firmware (MQ-135, GP2Y1014AU, relay, LED, LCD) |
| `server/` | MQTT → Firebase bridge with CEI and session tracking |
| `web/` | React + Vite dashboard |
| `tools/mqtt-simulator/` | Dev sensor publisher (no hardware) |
| `packages/shared/` | MQTT/RTDB types, thresholds, CEI helpers |

## Prerequisites

- **Node.js 20+**
- **Docker** (for local Mosquitto) — or install Mosquitto on Windows manually
- **Firebase CLI** (`npm install -g firebase-tools`) for emulators
- **PlatformIO** (optional, for firmware)

## Quick start (local development)

### 1. Install dependencies

```bash
cp .env.example .env
npm install
npm run build -w @fumeguard/shared
```

### 2. Start Mosquitto

```bash
npm run broker
# or: docker compose up -d mosquitto
```

### 3. Start Firebase emulators

In a separate terminal:

```bash
npm run emulators
```

Emulator UI: http://localhost:4000  
Database emulator: `127.0.0.1:9000`

### 4. Seed thresholds

With emulators running:

```bash
npm run seed
```

### 5. Start the backend bridge

```bash
npm run dev:server
```

Health check: http://localhost:3001/health

### 6. Publish test telemetry

```bash
npm run dev:simulator
```

### 7. Open the dashboard

```bash
npm run dev:web
```

Open http://localhost:5173 — you should see live gas, dust, CEI, charts, and history.

## Run order (demo checklist)

See also [docs/DEMO_CHECKLIST.md](docs/DEMO_CHECKLIST.md).

1. `docker compose up -d mosquitto`
2. `firebase emulators:start --only database,auth`
3. `npm run seed`
4. `npm run dev:server`
5. `npm run dev:simulator` **or** flash ESP32 firmware
6. `npm run dev:web`
7. Confirm dashboard updates, fan/LED status, history table fills, sessions appear after exposure spikes

## MQTT contract

| Topic | Payload |
|-------|---------|
| `fumeguard/{deviceId}/telemetry` | `{ ts, gasPpm, dustUgM3, cei?, status?, fanOn, ledOn }` |
| `fumeguard/{deviceId}/events` | `{ ts, type, message }` |

`deviceId` defaults to `esp32-01` (set in `.env`).

## CEI (Cumulative Exposure Index)

Version 1 formula (see `packages/shared`):

1. Normalize gas and dust vs hazard thresholds (0–1).
2. Load `L = max(gasNorm, dustNorm)`.
3. When `L > idleLoadThreshold`, integrate: `CEI += L × Δt` (seconds).
4. End session after `idleTimeoutMinutes` below idle threshold; reset CEI.

Backend recomputes CEI from telemetry for consistency with the dashboard.

## Firebase RTDB paths

| Path | Writer | Purpose |
|------|--------|---------|
| `config/thresholds` | seed script | Limits for status/CEI |
| `devices/{id}/latest` | server | Live readings |
| `devices/{id}/history` | server | Throttled time series |
| `devices/{id}/sessions` | server | Soldering sessions |
| `devices/{id}/events` | server | Alerts, fan events |

RTDB rules: clients may **read**; only the Admin SDK (server) **writes**.

## ESP32 firmware

1. Copy `firmware/include/secrets.h.example` → `firmware/include/secrets.h`
2. Set WiFi, MQTT broker IP (your PC running Docker), and `DEVICE_ID`
3. Adjust pins in `firmware/include/config.h` if needed
4. Build/upload:

```bash
cd firmware
pio run -t upload
pio device monitor
```

Use your LAN IP for `MQTT_HOST` (not `localhost` on the ESP32).

## Production migration

### Firebase

1. Create a project at https://console.firebase.google.com
2. Enable **Realtime Database** (start in test mode, then deploy rules from `database.rules.json`)
3. Download a service account JSON → save as `serviceAccountKey.json` (gitignored)
4. Set in `.env`:
   - `USE_FIREBASE_EMULATOR=false`
   - `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json`
   - `FIREBASE_PROJECT_ID=your-project-id`
5. Update `VITE_*` vars in `.env` with production Firebase web config

### MQTT

1. Deploy Mosquitto on a VPS **or** use HiveMQ Cloud / similar
2. Enable TLS and username/password
3. Set `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` in `.env` and `secrets.h`

### Mosquitto auth (optional)

Generate a password file and update `infra/mosquitto/mosquitto.conf` to disable `allow_anonymous`.

## Environment variables

See [`.env.example`](.env.example) for all options.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run broker` | Start Mosquitto via Docker |
| `npm run emulators` | Firebase Database + Auth emulators |
| `npm run seed` | Write default thresholds |
| `npm run dev:server` | MQTT bridge |
| `npm run dev:simulator` | Fake sensor data |
| `npm run dev:web` | React dashboard |
| `npm run build` | Build shared, server, web |

## Hardware (proposal)

- ESP32, MQ-135, GP2Y1014AU, relay module, exhaust fan, LED, I2C 16×2 LCD, PSU

## License

Academic / project use — Polytechnic University of the Philippines.
