/**
 * FumeGuard ESP32 firmware
 * MQ-135 gas, GP2Y1014AU dust, relay fan, status LEDs, buzzer, SH1106 OLED, MQTT telemetry
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <U8g2lib.h>
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

static U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

static WiFiClient wifiClient;
static WiFiClientSecure secureWifiClient;
static PubSubClient mqtt;

static float cei = 0;
static unsigned long lastTelemetryMs = 0;
static unsigned long lastSampleMs = 0;
static unsigned long lastTs = 0;
static bool fanOn = false;
static bool ledOn = false;
static bool prevFanOn = false;
static bool alarmArmed = true;
static String lastStatus = "safe";

static float readMq135Ppm();
static float readDustUgM3();
static float computeLoad(float gas, float dust);
static String deriveStatus(float gas, float dust, float ceiVal);
static void setRelay(bool on);
static void updateActuators(const String& status);
static void updateOled(float gas, float dust, float ceiVal, const String& status);
static void publishTelemetry();
static void publishEvent(const char* type, const char* message);
static void reconnectMqtt();
static long long nowEpochMs();

void setup() {
  Serial.begin(115200);

  pinMode(PIN_SYS_LED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_DUST_LED, OUTPUT);
  pinMode(PIN_MQ135, INPUT);
  pinMode(PIN_DUST_AO, INPUT);

  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_DUST_LED, HIGH);
  setRelay(false);
  digitalWrite(PIN_SYS_LED, HIGH);

  Wire.begin(I2C_SDA, I2C_SCL);
  u8g2.begin();
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(20, 32, "FumeGuard");
  u8g2.drawStr(12, 48, "Starting...");
  u8g2.sendBuffer();

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
    secureWifiClient.setInsecure();
    mqtt.setClient(secureWifiClient);
    Serial.println("MQTT: Secure TLS mode enabled");
  } else {
    mqtt.setClient(wifiClient);
    Serial.println("MQTT: Unsecure TCP mode enabled");
  }

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  reconnectMqtt();

  u8g2.clearBuffer();
  u8g2.drawStr(16, 32, "MQTT ready");
  u8g2.sendBuffer();
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
  updateOled(gas, dust, cei, status);

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

static void setRelay(bool on) {
#if RELAY_ACTIVE_LOW
  digitalWrite(PIN_RELAY, on ? LOW : HIGH);
#else
  digitalWrite(PIN_RELAY, on ? HIGH : LOW);
#endif
}

static void updateActuators(const String& status) {
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  bool newFanOn = fanOn;

  if (status == "safe") {
    digitalWrite(PIN_LED_GREEN, HIGH);
    newFanOn = false;
    alarmArmed = true;
    ledOn = false;
  } else if (status == "warning") {
    digitalWrite(PIN_LED_YELLOW, HIGH);
    newFanOn = true;
    ledOn = true;
    if (alarmArmed) {
      digitalWrite(PIN_BUZZER, HIGH);
      delay(120);
      digitalWrite(PIN_BUZZER, LOW);
      alarmArmed = false;
    }
  } else {
    digitalWrite(PIN_LED_RED, HIGH);
    newFanOn = true;
    ledOn = true;
    if (alarmArmed) {
      digitalWrite(PIN_BUZZER, HIGH);
      delay(300);
      digitalWrite(PIN_BUZZER, LOW);
      alarmArmed = false;
    }
  }

  if (newFanOn != fanOn) {
    fanOn = newFanOn;
    setRelay(fanOn);
  }
}

static void updateOled(float gas, float dust, float ceiVal, const String& status) {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(25, 10, "FUME GUARD");

  u8g2.setCursor(0, 25);
  u8g2.print("Gas:");
  u8g2.print((int)gas);

  u8g2.setCursor(0, 37);
  u8g2.print("Dust:");
  u8g2.print((int)dust);

  u8g2.setCursor(0, 49);
  u8g2.print("CEI:");
  u8g2.print((int)ceiVal);

  u8g2.setCursor(0, 61);
  u8g2.print("Status:");
  u8g2.print(status);

  u8g2.sendBuffer();
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
