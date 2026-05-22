/**
 * FumeGuard ESP32 firmware
 * MQ-135 gas, GP2Y1014AU dust, relay fan, LED, I2C LCD, MQTT telemetry
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>

#include "config.h"

#if __has_include("secrets.h")
#include "secrets.h"
#else
#warning "Copy include/secrets.h.example to include/secrets.h"
#define WIFI_SSID "CHANGE_ME"
#define WIFI_PASSWORD "CHANGE_ME"
#define MQTT_HOST "192.168.1.100"
#define MQTT_PORT 1883
#define MQTT_USER ""
#define MQTT_PASS ""
#define MQTT_SECURE false
#define DEVICE_ID "esp32-01"
#endif

#ifndef MQTT_SECURE
#define MQTT_SECURE false
#endif

static WiFiClient wifiClient;
static WiFiClientSecure secureWifiClient;
static PubSubClient mqtt; // Client is set dynamically in setup()
static LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);

static float cei = 0;
static unsigned long lastTelemetryMs = 0;
static unsigned long lastSampleMs = 0;
static unsigned long lastTs = 0;
static bool fanOn = false;
static bool ledOn = false;
static bool prevFanOn = false;
static String lastStatus = "safe";

static float readMq135Ppm();
static float readDustUgM3();
static float computeLoad(float gas, float dust);
static String deriveStatus(float gas, float dust, float ceiVal);
static void updateActuators(const String& status);
static void updateLcd(float gas, float dust, float ceiVal, const String& status);
static void publishTelemetry();
static void publishEvent(const char* type, const char* message);
static void reconnectMqtt();
static long long nowEpochMs();

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_LED_ALERT, OUTPUT);
  pinMode(PIN_DUST_LED, OUTPUT);
  pinMode(PIN_MQ135, INPUT);
  pinMode(PIN_DUST_AO, INPUT);

  digitalWrite(PIN_RELAY, LOW);
  digitalWrite(PIN_LED_ALERT, LOW);
  digitalWrite(PIN_DUST_LED, LOW);

  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.print("FumeGuard");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK: " + WiFi.localIP().toString());

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  struct tm timeinfo;
  for (int i = 0; i < 20 && !getLocalTime(&timeinfo); i++) {
    delay(500);
  }

  if (MQTT_SECURE) {
    secureWifiClient.setInsecure(); // Enable TLS/SSL connection without hardcoding CA
    mqtt.setClient(secureWifiClient);
    Serial.println("MQTT: Secure TLS mode enabled");
  } else {
    mqtt.setClient(wifiClient);
    Serial.println("MQTT: Unsecure TCP mode enabled");
  }

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  reconnectMqtt();

  lcd.clear();
  lcd.print("MQTT ready");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }
  if (!mqtt.connected()) {
    reconnectMqtt();
  }
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastSampleMs < 200) {
    return;
  }
  lastSampleMs = now;

  float gas = readMq135Ppm();
  float dust = readDustUgM3();
  float load = computeLoad(gas, dust);

  if (lastTs > 0 && now > lastTs && load > IDLE_LOAD_THRESHOLD) {
    float deltaSec = (now - lastTs) / 1000.0f;
    cei += load * deltaSec;
  }
  lastTs = now;

  String status = deriveStatus(gas, dust, cei);
  updateActuators(status);
  updateLcd(gas, dust, cei, status);

  if (status != lastStatus) {
    if (status == "hazardous") {
      publishEvent("alert", "Hazardous air quality");
    } else {
      publishEvent("threshold", "Air quality status changed");
    }
    lastStatus = status;
  }

  if (fanOn && !prevFanOn) {
    publishEvent("fan_on", "Exhaust fan activated");
  } else if (!fanOn && prevFanOn) {
    publishEvent("fan_off", "Exhaust fan deactivated");
  }
  prevFanOn = fanOn;

  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = now;
    publishTelemetry();
  }
}

static int readAdcAvg(int pin) {
  long sum = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return sum / ADC_SAMPLES;
}

static float readMq135Ppm() {
  int raw = readAdcAvg(PIN_MQ135);
  float voltage = (raw / 4095.0f) * 3.3f;
  float rs = MQ135_RL_KOHM * (3.3f - voltage) / (voltage + 0.01f);
  float ratio = rs / MQ135_RO_CLEAN;
  float ppm = 116.6020682f * powf(ratio, -2.769034857f);
  return constrain(ppm, 0.0f, 2000.0f);
}

static float readDustUgM3() {
  digitalWrite(PIN_DUST_LED, LOW);
  delayMicroseconds(280);
  int raw = analogRead(PIN_DUST_AO);
  digitalWrite(PIN_DUST_LED, HIGH);
  delayMicroseconds(40);
  digitalWrite(PIN_DUST_LED, LOW);
  delayMicroseconds(9680);

  float voltage = (raw / 4095.0f) * 3.3f;
  float density = (voltage - DUST_VOLTAGE_NO_DUST) * DUST_DENSITY_MAX /
                  (DUST_VOLTAGE_MAX - DUST_VOLTAGE_NO_DUST);
  return constrain(density, 0.0f, DUST_DENSITY_MAX);
}

static float computeLoad(float gas, float dust) {
  float gasNorm = min(1.0f, gas / GAS_HAZARD_PPM);
  float dustNorm = min(1.0f, dust / DUST_HAZARD_UGM3);
  return max(gasNorm, dustNorm);
}

static String deriveStatus(float gas, float dust, float ceiVal) {
  if (gas >= GAS_HAZARD_PPM || dust >= DUST_HAZARD_UGM3 || ceiVal >= CEI_HAZARD) {
    return "hazardous";
  }
  if (gas >= GAS_WARNING_PPM || dust >= DUST_WARNING_UGM3 || ceiVal >= CEI_WARNING) {
    return "warning";
  }
  return "safe";
}

static void updateActuators(const String& status) {
  fanOn = (status == "hazardous");
  ledOn = (status != "safe");
  digitalWrite(PIN_RELAY, fanOn ? HIGH : LOW);
  digitalWrite(PIN_LED_ALERT, ledOn ? HIGH : LOW);
}

static void updateLcd(float gas, float dust, float ceiVal, const String& status) {
  lcd.setCursor(0, 0);
  lcd.printf("G:%4.0f D:%3.0f", gas, dust);
  lcd.setCursor(0, 1);
  lcd.printf("C:%5.0f %-7s", ceiVal, status.c_str());
}

static void publishTelemetry() {
  float gas = readMq135Ppm();
  float dust = readDustUgM3();
  String status = deriveStatus(gas, dust, cei);

  JsonDocument doc;
  doc["ts"] = nowEpochMs();
  doc["gasPpm"] = roundf(gas * 10) / 10.0f;
  doc["dustUgM3"] = roundf(dust * 10) / 10.0f;
  doc["cei"] = roundf(cei * 100) / 100.0f;
  doc["status"] = status;
  doc["fanOn"] = fanOn;
  doc["ledOn"] = ledOn;

  char buf[384];
  serializeJson(doc, buf, sizeof(buf));

  String topic = String("fumeguard/") + DEVICE_ID + "/telemetry";
  mqtt.publish(topic.c_str(), buf, false);
}

static void publishEvent(const char* type, const char* message) {
  JsonDocument doc;
  doc["ts"] = nowEpochMs();
  doc["type"] = type;
  doc["message"] = message;

  char buf[256];
  serializeJson(doc, buf, sizeof(buf));
  String topic = String("fumeguard/") + DEVICE_ID + "/events";
  mqtt.publish(topic.c_str(), buf, false);
}

static long long nowEpochMs() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    return (long long)mktime(&timeinfo) * 1000LL;
  }
  return (long long)millis();
}

static void reconnectMqtt() {
  while (!mqtt.connected()) {
    Serial.print("MQTT connect...");
    String clientId = String("fumeguard-") + DEVICE_ID;
    bool ok;
    if (strlen(MQTT_USER) > 0) {
      ok = mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
    } else {
      ok = mqtt.connect(clientId.c_str());
    }
    if (ok) {
      Serial.println(" OK");
      return;
    }
    Serial.print(" fail ");
    Serial.println(mqtt.state());
    delay(3000);
  }
}
