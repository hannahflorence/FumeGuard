# FumeGuard Project Tree

Here is the directory structure of the **FumeGuard** monorepo:

```text
FumeGuard/
├── .env.example              # Example environment configuration for local/production setup
├── .firebaserc               # Firebase project configurations
├── database.rules.json       # Security rules for Firebase Realtime Database
├── docker-compose.yml        # Docker service configuration (running Eclipse Mosquitto broker)
├── firebase.json             # Firebase Emulator and hosting config
├── package.json              # Root npm package defining monorepo workspaces and execution scripts
├── package-lock.json         # Locked dependency tree for reproducibility
├── README.md                 # Project introduction, architectural overview, and run guide
├── PROJECT_TREE.md           # Visual tree map of the repository (this file)
│
├── docs/                     # Project documentation and checklists
│   └── DEMO_CHECKLIST.md     # Sequence checklist for live demonstration
│
├── firmware/                 # ESP32 C++ PlatformIO firmware
│   ├── include/              # Header files (pin layouts, secrets configuration)
│   ├── src/                  # Main program source (sensor readings, MQTT publishing, LCD/LED, relays)
│   └── platformio.ini        # PlatformIO configuration (libraries, boards, upload settings)
│
├── infra/                    # Infrastructure configurations
│   └── mosquitto/
│       └── mosquitto.conf    # Mosquitto broker setup (listeners, authentication configs)
│
├── packages/
│   └── shared/               # Shared TypeScript libraries between backend server and web client
│       ├── package.json
│       ├── tsconfig.json
│       └── src/              # Type definitions, hazardous thresholds, and CEI calculation helper functions
│
├── server/                   # Node.js Express server acting as the MQTT-to-Firebase Bridge
│   ├── package.json
│   ├── tsconfig.json
│   └── src/                  # Bridge listener, cumulative exposure calculations, and DB write handlers
│
├── tools/
│   └── mqtt-simulator/       # Local TypeScript MQTT sensor simulator (simulates hardware)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/              # Simulated sensor telemetry generator publishing mock ESP32 data
│
└── web/                      # React + Vite web dashboard frontend
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/                  # Dashboard user interface (real-time telemetry graphs, status banners, exposure logs)
```
