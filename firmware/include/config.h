#pragma once

// Pin assignments (adjust for your PCB)
#define PIN_MQ135       34
#define PIN_DUST_LED    25
#define PIN_DUST_AO     32
#define PIN_RELAY       26
#define PIN_LED_ALERT   27

// I2C LCD (16x2) — common address 0x27
#define LCD_I2C_ADDR    0x27
#define LCD_COLS        16
#define LCD_ROWS        2

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
