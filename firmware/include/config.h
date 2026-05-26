#pragma once

// ESP32-WROOM-DA pin assignments (match uploaded sketch / PCB)
#define PIN_SYS_LED      2
#define PIN_LED_GREEN    17
#define PIN_LED_YELLOW   19
#define PIN_LED_RED      4
#define PIN_BUZZER       16
#define PIN_RELAY        26

#define PIN_MQ135        13
#define PIN_DUST_LED     27
#define PIN_DUST_AO      35

// SH1106 OLED (I2C)
#define I2C_SDA          21
#define I2C_SCL          22

// Relay module: LOW energizes fan (active-low)
#define RELAY_ACTIVE_LOW 1

// Sampling
#define TELEMETRY_INTERVAL_MS  2000
#define ADC_SAMPLES            10

// Thresholds (match packages/shared DEFAULT_THRESHOLDS)
#define GAS_WARNING_PPM        200.0f
#define GAS_HAZARD_PPM         400.0f
#define DUST_WARNING_UGM3      35.0f
#define DUST_HAZARD_UGM3       75.0f
#define CEI_WARNING            300.0f
#define CEI_HAZARD             600.0f
#define IDLE_LOAD_THRESHOLD    0.05f
#define IDLE_TIMEOUT_MS        (5UL * 60UL * 1000UL)

// Sensor calibration (tune during Week 1)
#define MQ135_RL_KOHM          10.0f
#define MQ135_RO_CLEAN         10.0f
#define DUST_VOLTAGE_NO_DUST   0.6f
#define DUST_VOLTAGE_MAX       3.5f
#define DUST_DENSITY_MAX       500.0f
