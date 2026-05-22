# FumeGuard Project Tree

Monorepo layout (generated May 2026). Paths in **bold** are gitignored locally (`.env`, `secrets.h`, `serviceAccountKey.json`, `node_modules`, build output).

```text
FumeGuard/
├── .env.example                 # Template for root .env (copy → .env)
├── .firebaserc                  # Firebase CLI default project id
├── .gitattributes
├── .gitignore
├── database.rules.json          # RTDB security (read clients, write server only)
├── docker-compose.yml           # Local Mosquitto broker (port 1883)
├── firebase.json                # Emulator ports + database rules path
├── package.json                 # Workspaces, scripts, firebase-tools ^13
├── package-lock.json
├── README.md
├── PROJECT_TREE.md              # This file
│
├── docs/
│   └── DEMO_CHECKLIST.md        # Local demo start order + verification
│
├── firmware/                    # ESP32 (PlatformIO)
│   ├── platformio.ini
│   ├── include/
│   │   ├── config.h             # Pins, intervals, thresholds
│   │   ├── secrets.h.example    # Copy → secrets.h (WiFi, MQTT, DEVICE_ID)
│   │   └── secrets.h            # **Local only — not in git**
│   └── src/
│       └── main.cpp             # Sensors, fan/LED/LCD, MQTT publish
│
├── infra/
│   └── mosquitto/
│       └── mosquitto.conf       # Dev broker: anonymous on 1883
│
├── packages/
│   └── shared/                  # @fumeguard/shared
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts         # Zod schemas, thresholds, CEI helpers, MQTT topics
│
├── server/                      # @fumeguard/server — MQTT → Firebase bridge
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # MQTT subscribe + Express /health
│       ├── config.ts            # Loads ../../.env
│       ├── firebase.ts          # Admin SDK (emulator or production)
│       ├── handlers.ts          # Telemetry/events → RTDB writes
│       ├── cei.ts               # CEI + session state (in-memory per device)
│       └── seed.ts              # Writes config/thresholds
│
├── tools/
│   └── mqtt-simulator/          # @fumeguard/mqtt-simulator
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts         # Fake ESP32 telemetry for local dev
│
└── web/                         # @fumeguard/web — React dashboard
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── src/
        ├── main.tsx
        ├── App.tsx              # Routes: / dashboard, /login
        ├── index.css
        ├── lib/
        │   └── firebase.ts      # Client SDK + emulator connect
        ├── hooks/
        │   └── useRealtimeData.ts
        ├── pages/
        │   ├── Dashboard.tsx
        │   └── Login.tsx
        └── components/
            ├── MetricCard.tsx
            ├── StatusBadge.tsx
            ├── SystemStatus.tsx
            ├── TrendCharts.tsx
            ├── HistoryTable.tsx
            └── SessionSummary.tsx

# Not shown (generated / local)
#   node_modules/     — npm install
#   .env              — **your secrets (from .env.example)**
#   serviceAccountKey.json — **production Firebase admin key**
#   server/dist/      — tsc build output
#   web/dist/         — vite build output
```

## Local URLs (two apps)

| URL | What |
|-----|------|
| http://localhost:5173 | **Web dashboard** (React) — what you open to see charts |
| http://localhost:3001/health | **Server health** (JSON) — confirms MQTT bridge is up |
| http://localhost:4000 | Firebase Emulator UI (optional) |

## Quick scripts (root)

| Command | Role |
|---------|------|
| `npm run broker` | Mosquitto via Docker |
| `npm run emulators` | Firebase DB + Auth emulators |
| `npm run seed` | Default thresholds → RTDB |
| `npm run dev:server` | MQTT bridge |
| `npm run dev:simulator` | Fake sensor data |
| `npm run dev:web` | Dashboard |
